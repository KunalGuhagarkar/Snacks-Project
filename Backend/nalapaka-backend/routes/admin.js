const express = require("express");
const router = express.Router();
const db = require("../db");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

// Apply security gatekeeper parameters to ALL admin sub-routes
router.use(verifyToken);
router.use(isAdmin);

// ==============================================================
// 📊 ROUTE 1: METRICS OVERVIEW (GET /api/admin/stats)
// ==============================================================
router.get("/stats", async (req, res) => {
  try {
    const revenueQuery = "SELECT COALESCE(SUM(grand_total::numeric), 0) as total_revenue FROM orders";
    const orderCountQuery = "SELECT COUNT(*) as total_orders FROM orders";
    const productsCountQuery = "SELECT COUNT(*) as total_products FROM products";

    const [revenueRes, orderCountRes, productsCountRes] = await Promise.all([
      db.query(revenueQuery),
      db.query(orderCountQuery),
      db.query(productsCountQuery)
    ]);

    res.json({
      revenue: parseFloat(revenueRes.rows[0].total_revenue),
      totalOrders: parseInt(orderCountRes.rows[0].total_orders, 10),
      totalProducts: parseInt(productsCountRes.rows[0].total_products, 10),
    });
  } catch (err) {
    console.error("❌ Admin Stats Fetch Failure:", err.message);
    res.status(500).json({ error: `Failed to compile analytical data snapshots: ${err.message}` });
  }
});

// ==============================================================
// 🛵 ROUTE 2: GET ALL CUSTOMER ORDERS (EXPLICIT VALUES MAPPING)
// ==============================================================
router.get("/orders", async (req, res) => {
  try {
    // 1. Pull exact values from orders table. Prioritizing order_status enum column.
    const ordersResult = await db.query(`
      SELECT 
        o.id,
        o.user_id,
        o.address_id,
        o.total_items_price,
        o.delivery_charge,
        o.grand_total,
        o.order_status,
        o.status,
        o.created_at,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);

    // 2. Fetch order items. We select all columns to look for variations of price fields.
    let itemsRows = [];
    try {
      const itemsResult = await db.query(`SELECT * FROM order_items`);
      itemsRows = itemsResult.rows;
    } catch (e) {
      console.warn("⚠️ order_items table look up failure:", e.message);
    }

    // 3. Fetch products catalog values
    let productRows = [];
    try {
      const productsResult = await db.query(`SELECT id, name, brand, weight, emoji, price FROM products`);
      productRows = productsResult.rows;
    } catch (e) {
      console.warn("⚠️ products catalog fallback mismatch:", e.message);
    }

    // 4. Fetch delivery addresses lookup
    let addressRows = [];
    try {
      const addressResult = await db.query(`SELECT * FROM addresses`);
      addressRows = addressResult.rows;
    } catch (e) {
      console.warn("⚠️ addresses schema look up fallback:", e.message);
    }

    // 5. Structure fields explicitly for the frontend UI components
    const formattedOrders = ordersResult.rows.map(order => {
      const matchedAddr = addressRows.find(a => a.id === order.address_id);
      const rawLineItems = itemsRows.filter(oi => oi.order_id === order.id);
      
      const fullLineItems = rawLineItems.map(item => {
        const productDetails = productRows.find(p => p.id === item.product_id);
        
        // 💡 CRITICAL PRICE FIX: Test database column variations for price
        const rawPrice = item.price || item.unit_price || item.price_at_purchase || item.total_price || (productDetails ? productDetails.price : 0);

        return {
          ...item,
          price: parseFloat(rawPrice) || 0, 
          name: productDetails ? productDetails.name : "Product Catalog Item",
          brand: productDetails ? productDetails.brand : "Generic",
          weight: productDetails ? productDetails.weight : "N/A",
          emoji: (productDetails && productDetails.emoji && productDetails.emoji !== '??') ? productDetails.emoji : "📦"
        };
      });

      // 💡 CRITICAL STATUS FIX: Read active enum column 'order_status' first
      const currentStatus = (order.order_status || order.status || 'Pending').toString().trim();

      // 🛠️ FIX: Concatenate address parts cleanly matching the relational schema columns
      let formattedAddressString = 'Standard Store Pickup Option';
      if (order.address_id) {
        if (matchedAddr) {
          const parts = [
            matchedAddr.address_line_1,
            matchedAddr.address_line_2,
            matchedAddr.city,
            matchedAddr.state
          ].filter(p => p && p.toString().trim() !== '');
          
          let joinedStr = parts.join(', ');
          if (matchedAddr.postal_code) {
            joinedStr += ` - ${matchedAddr.postal_code}`;
          }
          formattedAddressString = joinedStr || 'Registered Address Profile';
        } else {
          formattedAddressString = 'Address Profile Link Broken';
        }
      }

      return {
        id: order.id,
        user_id: order.user_id,
        address_id: order.address_id,
        total_items_price: parseFloat(order.total_items_price),
        delivery_charge: parseFloat(order.delivery_charge),
        grand_total: parseFloat(order.grand_total),
        total: parseFloat(order.grand_total), 
        status: currentStatus, 
        order_status: currentStatus,
        created_at: order.created_at,
        customer_name: order.user_name || 'Anonymous User',
        customer_email: order.user_email || 'No Email Registered',
        
        // Formatted address output injection
        shipping_address: formattedAddressString,
        
        // Directly provides fallback values for user profile phone fields
        shipping_phone: order.user_phone || (matchedAddr ? matchedAddr.phone : null) || 'No Phone Registered',
        
        // Retain address line properties to keep the frontend fallback guards completely secure
        address_line_1: matchedAddr ? matchedAddr.address_line_1 : null,
        address_line_2: matchedAddr ? matchedAddr.address_line_2 : null,
        city: matchedAddr ? matchedAddr.city : null,
        state: matchedAddr ? matchedAddr.state : null,
        postal_code: matchedAddr ? matchedAddr.postal_code : null,
          
        items: fullLineItems 
      };
    });

    res.json(formattedOrders);
  } catch (err) {
    console.error("❌ CRITICAL ADMIN ORDERS FLOW FAILURE:", err.message);
    res.status(500).json({ error: `Database stream aggregation exception: ${err.message}` });
  }
});

// ==============================================================
// 🔄 ROUTE 3: UPDATE ORDER STATUS PIPELINE (SMART-ENUM MATCHING)
// ==============================================================
router.put("/orders/:orderId/status", async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  try {
    if (!status) {
      return res.status(400).json({ error: "Pipeline adjustment request rejected: Status parameter is empty." });
    }

    // 1. Dynamically read the exact allowed status strings from your database enum
    const enumCheck = await db.query(`
      SELECT enumlabel FROM pg_enum 
      WHERE enumtypid = 'order_status_type'::regtype
    `);
    
    const allowedStatuses = enumCheck.rows.map(row => row.enumlabel); 
    const normalizedInput = status.toString().trim().toLowerCase();

    // 2. Scan the database's true enum list to find a case-insensitive match
    const perfectMatch = allowedStatuses.find(
      allowedStr => allowedStr.toLowerCase() === normalizedInput
    );

    if (!perfectMatch) {
      console.error(`❌ Client sent "${status}", but DB only accepts: ${allowedStatuses.join(", ")}`);
      return res.status(400).json({ 
        error: `Invalid status configuration. Your database only accepts: ${allowedStatuses.join(", ")}` 
      });
    }

    console.log(`🔄 Shifting Order #${orderId} pipeline to perfectly matched DB value: "${perfectMatch}"`);

    // 3. Update both possible status columns using the verified string configuration
    const result = await db.query(
      `UPDATE orders 
       SET order_status = $1::order_status_type, 
           status = $1 
       WHERE id = $2 
       RETURNING *`,
      [perfectMatch, orderId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Target order reference point not found." });
    }
    
    res.json({ 
      message: "Pipeline status updated successfully.", 
      order: {
        ...result.rows[0],
        status: perfectMatch,
        order_status: perfectMatch
      } 
    });
  } catch (err) {
    console.error("❌ CRITICAL DATABASE PIPELINE REJECTION:", err.message);
    res.status(500).json({ error: `Database rejected status pipeline shift: ${err.message}` });
  }
});

// ==============================================================
// ➕ ROUTE 4: ADD A NEW PRODUCT
// ==============================================================
router.post("/products", async (req, res) => {
  try {
    const { name, brand, category, description, price, weight, emoji, image_url, stock_quantity, badge, tags } = req.body;

    if (!name || !price || !brand) {
      return res.status(400).json({ error: "Product name, brand, and price are strictly required parameters." });
    }

    const cleanBrand = brand.trim();
    const brand_key = cleanBrand.toLowerCase().replace(/[^a-z0-9]/g, "_"); 
    const cleanCategory = category || "Snacks";
    const filter_tag = cleanCategory.toLowerCase();
    
    const finalWeight = weight || "250g";
    const finalEmoji = emoji || "📦";
    const finalStock = stock_quantity !== undefined && stock_quantity !== null ? parseInt(stock_quantity, 10) : 100;
    const finalImage = image_url || "https://images.unsplash.com/photo-1589476993333-f55b84301219?w=500";
    const finalTags = Array.isArray(tags) ? tags : ["authentic", filter_tag];

    const result = await db.query(
      `INSERT INTO products (name, brand, brand_key, category, filter_tag, description, price, weight, emoji, badge, tags, image_url, stock_quantity) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
       RETURNING *`,
      [
        name,
        cleanBrand,
        brand_key,
        cleanCategory,
        filter_tag,
        description || "",
        parseFloat(price),
        finalWeight,
        finalEmoji,
        badge || null,
        finalTags,
        finalImage,
        finalStock
      ]
    );

    res.status(201).json({ message: "Product created successfully!", product: result.rows[0] });
  } catch (err) {
    console.error("❌ Admin Product Creation Failure:", err.message);
    res.status(500).json({ error: `Failed to inject product row into registry: ${err.message}` });
  }
});

// ==============================================================
// 📝 ROUTE 5: UPDATE AN EXISTING PRODUCT
// ==============================================================
router.put("/products/:id", async (req, res) => {
  const { id } = req.params;
  const { name, brand, category, description, price, weight, emoji, image_url, stock_quantity, badge, tags } = req.body;

  try {
    const cleanBrand = brand ? brand.trim() : "Nalapaka";
    const brand_key = cleanBrand.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const cleanCategory = category || "Snacks";
    const filter_tag = cleanCategory.toLowerCase();

    const result = await db.query(
      `UPDATE products 
       SET name = $1, brand = $2, brand_key = $3, category = $4, filter_tag = $5, description = $6, price = $7, weight = $8, emoji = $9, badge = $10, tags = $11, image_url = $12, stock_quantity = $13 
       WHERE id = $14 
       RETURNING *`,
      [
        name,
        cleanBrand,
        brand_key,
        cleanCategory,
        filter_tag,
        description,
        parseFloat(price),
        weight || "250g",
        emoji || "📦",
        badge || null,
        Array.isArray(tags) ? tags : ["updated"],
        image_url,
        parseInt(stock_quantity, 10),
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Target product record could not be found." });
    }

    res.json({ message: "Product records updated successfully.", product: result.rows[0] });
  } catch (err) {
    console.error("❌ Admin Product Modification Failure:", err.message);
    res.status(500).json({ error: `Failed to commit product changes: ${err.message}` });
  }
});

// ==============================================================
// ❌ ROUTE 6: DELETE A PRODUCT FROM THE CATALOG
// ==============================================================
router.delete("/products/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("DELETE FROM products WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Target product record could not be found." });
    }
    res.json({ message: "Product dropped cleanly from catalog index.", droppedProduct: result.rows[0] });
  } catch (err) {
    console.error("❌ Admin Product Deletion Failure:", err.message);
    res.status(500).json({ error: `Failed to remove product from inventory: ${err.message}` });
  }
});

// ==============================================================
// 💬 ROUTE 7: GET ALL CUSTOMER SUPPORT TICKETS/QUERIES (UPDATED)
// ==============================================================
router.get("/support", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id, 
        user_id, 
        name, 
        email, 
        subject_type, 
        message, 
        status, 
        created_at 
      FROM contact_messages 
      ORDER BY created_at DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Admin Support Tickets Fetch Failure:", err.message);
    res.status(500).json({ error: `Failed to fetch support communication logs: ${err.message}` });
  }
});

// ==============================================================
// 🔄 ROUTE 8: UPDATE TICKET STAGE / STATUS (NEW)
// ==============================================================
router.put("/support/:ticketId/status", async (req, res) => {
  const { ticketId } = req.params;
  const { status } = req.body;

  try {
    if (!status) {
      return res.status(400).json({ error: "Pipeline adjustment request rejected: Status parameter is empty." });
    }

    // Supported workflow states
    const allowedStatuses = ["Pending", "In Progress", "Resolved", "Spam"];
    const normalizedInput = status.toString().trim();

    const validMatch = allowedStatuses.find(
      s => s.toLowerCase() === normalizedInput.toLowerCase()
    );

    if (!validMatch) {
      return res.status(400).json({ 
        error: `Invalid status configuration. Supported options: ${allowedStatuses.join(", ")}` 
      });
    }

    const result = await db.query(
      `UPDATE contact_messages 
       SET status = $1 
       WHERE id = $2 
       RETURNING *`,
      [validMatch, ticketId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Target support ticket record could not be found." });
    }

    res.json({
      message: "Ticket lifecycle status updated successfully.",
      ticket: result.rows[0]
    });
  } catch (err) {
    console.error("❌ CRITICAL DATABASE TICKET STAGE SHIFT FAILURE:", err.message);
    res.status(500).json({ error: `Database rejected ticket status update: ${err.message}` });
  }
});

module.exports = router;