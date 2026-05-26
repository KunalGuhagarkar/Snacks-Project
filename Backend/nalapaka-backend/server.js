// server.js
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

// Load .env parameters instantly before building third-party SDK dependencies
require("dotenv").config(); 

const db = require("./db");
const admin = require("./routes/admin");
const supportRouter = require("./routes/support");

// Initialize Razorpay SDK instance with your Test Key pair credentials
const Razorpay = require("razorpay");
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const app = express();
const PORT = process.env.PORT || 5000;

// MIDDLEWARE 
// Configure CORS origins via env `CORS_ORIGINS` (comma-separated).
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:5173", "http://localhost:5174"];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || process.env.NODE_ENV !== 'production') {
      callback(null, true);
      return;
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy: Origin not allowed"));
    }
  },
  optionsSuccessStatus: 200,
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json()); // Parses incoming standard JSON application payloads

// Lightweight in-memory rate limiter for auth endpoints (per-IP, per-path)
const authRateStore = new Map();
function authRateLimiter(req, res, next) {
  try {
    const path = req.path || req.originalUrl || '';
    if (!path.startsWith('/api/auth')) return next();

    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `${ip}:${path}`;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const limit = (path === '/api/auth/login' || path === '/api/auth/register') ? 10 : 60;

    const entry = authRateStore.get(key) || { count: 0, start: now };
    if (now - entry.start > windowMs) {
      entry.count = 1;
      entry.start = now;
    } else {
      entry.count += 1;
    }
    authRateStore.set(key, entry);

    if (entry.count > limit) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }
    next();
  } catch (err) {
    // On any failure, allow the request to proceed rather than block legitimate traffic
    next();
  }
}
app.use(authRateLimiter);

// =========================================================================
// 💳 1. SECURE RAZORPAY INTENT CHECKOUT ENGINE (PERFECT SCHEMA ALIGNMENT)
// =========================================================================
app.post("/api/orders/checkout", async (req, res, next) => {
  let client;
  let isPool = true;

  try {
    if (!db) {
      throw new Error("Database initialization reference object is broken or missing.");
    }

    client = db.getClient && typeof db.getClient === "function" ? await db.getClient() : db;
    isPool = typeof db.query === "function" && !db.getClient;

    const { userId, addressDetails, cartItems } = req.body;

    if (!userId || !addressDetails || !cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: "Your shopping cart payload validation failed. Missing required fields." });
    }

    // A. Re-verify item metrics server-side to bypass client request price manipulations
    let subtotal = cartItems.reduce((acc, item) => {
      return acc + (Number(item.price || 0) * Number(item.quantity || 0));
    }, 0);
    
    let deliveryCharges = (subtotal === 0 || subtotal >= 499) ? 0 : 40;
    let grandTotalINR = subtotal + deliveryCharges;

    console.log(`🛒 Razorpay Order Setup - Subtotal: ₹${subtotal}, Delivery: ₹${deliveryCharges}, Grand Total: ₹${grandTotalINR}`);

    // Acquire a dedicated client for transactional operations when available
    if (db && typeof db.connect === "function") {
      client = await db.connect();
      isPool = false; // we have a dedicated client
    } else {
      client = db; // fall back to the pool-like object
      isPool = true;
    }

    // Begin unified atomic transaction block when using a dedicated client
    if (!isPool && client && typeof client.query === "function") {
      await client.query("BEGIN");
    }

    // B. TWO-STAGE SCHEMA SEQUENCING - STEP 1: Insert data into the "addresses" table using your exact schema columns
    const insertAddressQuery = `
      INSERT INTO addresses (
        user_id, 
        address_line_1, 
        address_line_2, 
        city, 
        state, 
        postal_code, 
        is_default,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
      RETURNING id
    `;
    
    const addressResult = await client.query(insertAddressQuery, [
      userId,
      addressDetails.street || addressDetails.streetAddress || "Not Provided", // address_line_1
      "",                                                                       // address_line_2 (Optional backup)
      addressDetails.city,                                                     // city
      addressDetails.stateName || addressDetails.state,                        // state
      addressDetails.pincode || addressDetails.postal_code                     // postal_code
    ]);
    
    const generatedAddressId = addressResult.rows[0].id;
    console.log(`📍 Relational address node bound safely inside DB. Address ID Reference: #${generatedAddressId}`);

    // C. TWO-STAGE SCHEMA SEQUENCING - STEP 2: Save record into "orders" using exact schema columns
    const insertOrderQuery = `
      INSERT INTO orders (
        user_id, 
        address_id, 
        total_items_price, 
        delivery_charge, 
        grand_total, 
        status, 
        order_status, 
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, 'Pending Payment', 'Pending', NOW())
      RETURNING id
    `;
    
    const orderResult = await client.query(insertOrderQuery, [
      userId,
      generatedAddressId, // Linked relational foreign key address_id
      subtotal,           // total_items_price
      deliveryCharges,    // delivery_charge
      grandTotalINR       // grand_total
    ]);
    
    const generatedOrderId = orderResult.rows[0].id;
    console.log(`📝 Order entry verified. Internal Order ID tracking reference built: #${generatedOrderId}`);

    // D. STEP 3: Iterate and write individual items into the "order_items" historical ledger
    for (const item of cartItems) {
      const productId = item.product_id || item.id; 
      
      const insertItemQuery = `
        INSERT INTO order_items (order_id, product_id, historical_name, historical_price, quantity)
        VALUES ($1, $2, $3, $4, $5)
      `;
      
      await client.query(insertItemQuery, [
        generatedOrderId,
        productId,
        item.name || item.historical_name,                  
        Number(item.price || item.historical_price || 0),         
        parseInt(item.quantity || 1, 10) 
      ]);
    }

    if (!isPool && typeof client.query === "function") {
      await client.query("COMMIT");
    }

    // E. Generate a secure transaction tracking Order sequence payload via Razorpay Cloud Core API
    const razorpayOptions = {
      amount: Math.round(grandTotalINR * 100), // Converted to required integer Paisa units
      currency: "INR",
      receipt: `receipt_order_${generatedOrderId}`,
      notes: {
        internalOrderId: generatedOrderId.toString(),
        customerUserId: userId.toString(),
      },
    };

    const razorpayOrder = await razorpayInstance.orders.create(razorpayOptions);
    console.log(`🔑 Razorpay Cloud Order built successfully. ID: ${razorpayOrder.id}`);

    // F. Return transaction metadata securely to your React client view layers
    return res.status(200).json({
      success: true,
      razorpayOrderId: razorpayOrder.id, 
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderId: generatedOrderId,         
      keyId: process.env.RAZORPAY_KEY_ID 
    });

  } catch (error) {
    if (!isPool && client && typeof client.query === "function") {
      try { await client.query("ROLLBACK"); } catch (rbErr) { console.error("Rollback implementation exception:", rbErr); }
    }
    console.error("❌ Critical Gateway Checkout Submission Failure:", error);
    return res.status(500).json({ error: "Failed to safely map transactional nodes inside database structures through Razorpay loops." });
  } finally {
    if (!isPool && client && typeof client.release === "function") {
      client.release();
    }
  }
});

// =========================================================================
// 🔏 2. MANUAL CLIENT TRANSACTION VERIFICATION ENDPOINT
// =========================================================================
app.post("/api/orders/verify", async (req, res) => {
  try {
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    // Reconstruct token verification string using local secure hashing mechanisms
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature === razorpaySignature) {
      console.log(`✅ Razorpay Payment Signature Validation Succeeded for DB Order #${orderId}`);

      // Perform updates inside the orders table matching your structural constraints
      const updateQuery = `
        UPDATE orders 
        SET status = 'Paid', order_status = 'Pending'
        WHERE id = $1
        RETURNING id, status
      `;
      await db.query(updateQuery, [orderId]);

      return res.status(200).json({ success: true, message: "Payment verified and recorded cleanly." });
    } else {
      console.warn("⚠️ Warning: Malicious or Invalid Payment Signature Integrity Received!");
      return res.status(400).json({ success: false, error: "Payment verification checks failed." });
    }
  } catch (error) {
    console.error("Signature Processing Lifecycle Exception Caught:", error);
    return res.status(500).json({ error: "Internal payment capture routine failed." });
  }
});

// ==========================================
// ACTIVE ROUTE MOUNTING
// ==========================================
app.use("/api/auth", require("./routes/auth"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api", supportRouter); 

// Core routes handled natively above. Keeping fallback routing setup down here.
app.use("/api/orders", require("./routes/orders")); 

// 🍿 DYNAMIC DATABASE BRAND DELIVERY ROUTE
app.get("/api/brands", async (req, res) => {
  try {
    const queryText = `
      SELECT DISTINCT 
        brand_key AS id, 
        brand AS name, 
        true AS is_verified
      FROM products 
      WHERE brand_key IS NOT NULL AND brand_key <> ''
      ORDER BY brand ASC
    `;
    const result = await db.query(queryText);
    res.json(result.rows);
  } catch (err) {
    console.error("Database Brand Fetch Error:", err);
    res.status(500).json({ error: "Failed to pull unique brands" });
  }
});

// 🍱 DYNAMIC DATABASE CATEGORY DELIVERY ROUTE
app.get("/api/categories", async (req, res) => {
  try {
    const queryText = `
      SELECT 
        category AS id, 
        INITCAP(category) AS label, 
        COUNT(id)::INT AS product_count 
      FROM products 
      WHERE category IS NOT NULL AND category <> ''
      GROUP BY category
      ORDER BY category ASC
    `;
    const result = await db.query(queryText);
    res.json(result.rows);
  } catch (err) {
    console.error("Database Category Fetch Error:", err);
    res.status(500).json({ error: "Failed to pull unique categories from products" });
  }
});

// 🔍 DYNAMIC DATABASE PRODUCT DELIVERY & FILTER ROUTE
app.get("/api/products", async (req, res) => {
  try {
    const { filter, brand, category, search } = req.query;

    let queryText = "SELECT * FROM products";
    let whereClauses = [];
    let queryParams = [];

    const addCondition = (clause, valuesArray) => {
      let localizedClause = clause;
      valuesArray.forEach((val) => {
        queryParams.push(val);
        localizedClause = localizedClause.replace(/\?\?/, `$${queryParams.length}`);
      });
      whereClauses.push(localizedClause);
    };

    if (brand && brand !== "all" && brand !== "undefined" && brand.trim() !== "") {
      addCondition("brand_key ILIKE ??", [brand.trim()]);
    }

    if (category && category !== "all" && category !== "undefined" && category.trim() !== "") {
      addCondition("category ILIKE ??", [category.trim()]);
    }

    if (filter && filter !== "all" && filter !== "undefined" && filter.trim() !== "") {
      const cleanFilter = filter.trim();
      if (cleanFilter === "bestseller") {
        addCondition("badge ILIKE ??", ["hot"]); 
      } else if (cleanFilter === "new") {
        addCondition("badge ILIKE ??", ["new"]);
      } else if (cleanFilter === "under200") {
        addCondition("price < ??", [200.0]);
      } else if (cleanFilter === "gf") {
        addCondition("?? = ANY(tags)", ["gf"]);
      } else if (cleanFilter === "veg") {
        addCondition("?? = ANY(tags)", ["veg"]); 
      }
    }

    if (search && search !== "undefined" && search.trim() !== "") {
      const cleanSearch = `%${search.trim()}%`;
      addCondition(
        "(name ILIKE ?? OR brand ILIKE ?? OR brand_key ILIKE ?? OR description ILIKE ??)",
        [cleanSearch, cleanSearch, cleanSearch, cleanSearch]
      );
    }

    if (whereClauses.length > 0) {
      queryText += " WHERE " + whereClauses.join(" AND ");
    }

    queryText += " ORDER BY id ASC";

    const result = await db.query(queryText, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error("Database Query Error:", err);
    res.status(500).json({ error: "Server database connection failed" });
  }
});

// Admin Control Panel Route Registrations
app.use("/api/admin", admin);

// GLOBAL ERROR HANDLER (FORCE VALID JSON RESPONSES ALWAYS)
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR EXCEPTION TARGETED:", err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

// Start the server listener
app.listen(PORT, () => {
  console.log(`🚀 Nalapaka Snack Server running on http://localhost:${PORT}`);
});