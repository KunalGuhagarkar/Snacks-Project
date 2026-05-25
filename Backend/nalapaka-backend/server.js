// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const db = require("./db");
const admin = require("./routes/admin");
const supportRouter = require("./routes/support");

const app = express();
const PORT = process.env.PORT || 5000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// ==========================================
// ACTIVE ROUTE MOUNTING
// ==========================================
app.use("/api/auth", require("./routes/auth"));
app.use("/api/orders", require("./routes/orders")); 
app.use("/api/cart", require("./routes/cart"));
app.use("/api", supportRouter); 

// 🍿 DYNAMIC DATABASE BRAND DELIVERY ROUTE (CLEANED)
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
// Pulls unique categories and counts items directly from your products table
app.get("/api/categories", async (req, res) => {
  try {
    const queryText = `
      SELECT 
        category AS id, 
        INITCAP(category) AS label, -- Capitalizes the category string nicely
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

    // FIXED HELPER ENGINE: Iterates seamlessly through tokens using regex replacement
    const addCondition = (clause, valuesArray) => {
      let localizedClause = clause;

      valuesArray.forEach((val) => {
        queryParams.push(val);
        localizedClause = localizedClause.replace(/\?\?/, `$${queryParams.length}`);
      });

      whereClauses.push(localizedClause);
    };

    // 1. Process 'brand' selection (matches your brand_key column)
    if (brand && brand !== "all" && brand !== "undefined" && brand.trim() !== "") {
      addCondition("brand_key ILIKE ??", [brand.trim()]);
    }

    // 2. Process 'category' selection (matches your category column)
    if (category && category !== "all" && category !== "undefined" && category.trim() !== "") {
      addCondition("category ILIKE ??", [category.trim()]);
    }

    // 3. Process 'FilterBar' pills selection
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

    // 4. Process 'search' keyword input string
    if (search && search !== "undefined" && search.trim() !== "") {
      const cleanSearch = `%${search.trim()}%`;
      addCondition(
        "(name ILIKE ?? OR brand ILIKE ?? OR brand_key ILIKE ?? OR description ILIKE ??)",
        [cleanSearch, cleanSearch, cleanSearch, cleanSearch]
      );
    }

    // 5. Combine conditions into a unified WHERE clause
    if (whereClauses.length > 0) {
      queryText += " WHERE " + whereClauses.join(" AND ");
    }

    // 6. Apply sorting order preservation
    queryText += " ORDER BY id ASC";

    // Execute statement securely against PostgreSQL engine
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