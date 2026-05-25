// backend/routes/orders.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// ==========================================
// GET USER ORDER HISTORY
// ==========================================
router.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await db.query(
      `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("History Error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// ==========================================
// GET SINGLE ORDER ITEMS
// ==========================================
router.get("/items/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await db.query(
      `SELECT id, product_id, historical_name, historical_price, quantity 
       FROM order_items WHERE order_id = $1 ORDER BY id ASC`,
      [orderId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Order Items Error:", err);
    res.status(500).json({ error: "Failed to fetch order details" });
  }
});

// ==========================================
// CHECKOUT WITH TRANSACTION SAFETY & STOCK CEILING GUARDS
// ==========================================
router.post("/checkout", async (req, res) => {
  const { userId, addressDetails, cartItems } = req.body;

  // 1. Fail early if payload data structures are missing
  if (!userId) {
    return res.status(400).json({ error: "User ID parameter is required" });
  }
  if (!addressDetails || !addressDetails.street || !addressDetails.pincode) {
    return res.status(400).json({ error: "Complete addressDetails structural data is required" });
  }
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ error: "Your checkout cart matrix is empty" });
  }

  const client = await db.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    // 2. LIVE INVENTORY VERIFICATION LAYER
    for (const item of cartItems) {
      // Locking row selection via FOR UPDATE prevents simultaneous overlapping API updates
      const stockCheck = await client.query(
        `SELECT name, stock_quantity FROM products WHERE id = $1 FOR UPDATE`,
        [item.product_id]
      );

      if (stockCheck.rows.length === 0) {
        throw new Error(`Product item matching ID "${item.name || item.product_id}" no longer exists in our database registers.`);
      }

      const productRecord = stockCheck.rows[0];

      if (item.quantity > productRecord.stock_quantity) {
        // Explicitly format a customer-friendly message to pass to your client-side catch block
        throw new Error(`Insufficient Stock: Only ${productRecord.stock_quantity} units of "${productRecord.name}" are available, but you requested ${item.quantity}. Please drop item quantity to checkout.`);
      }
    }

    // 3. FINANCIAL CALCULATION ENGINE
    const subtotal = cartItems.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );
    const delivery = subtotal >= 499 ? 0 : 49;
    const total = subtotal + delivery;

    // 4. WRITE RELATIONAL DATA RECORDS TO ADDRESSES TABLE
    const addressResult = await client.query(
      `
      INSERT INTO addresses 
      (user_id, address_line_1, city, state, postal_code, is_default)
      VALUES ($1, $2, $3, $4, $5, false)
      RETURNING id
      `,
      [
        userId,
        addressDetails.street,
        addressDetails.city || "Mysuru",
        addressDetails.stateName || "Karnataka",
        addressDetails.pincode
      ]
    );
    
    const addressId = addressResult.rows[0].id;

    // 5. WRITE MASTER ORDER ROW ENTRY
    const order = await client.query(
      `
      INSERT INTO orders
      (user_id, address_id, total_items_price, delivery_charge, grand_total, order_status, status)
      VALUES ($1, $2, $3, $4, $5, 'Processing', 'Pending')
      RETURNING id
      `,
      [userId, addressId, subtotal, delivery, total]
    );

    const orderId = order.rows[0].id;

    // 6. MAP UNROLLED ITEMS ARRAY & UPDATE CATALOG LOG QUANTITIES
    for (const item of cartItems) {
      // Drop operational snapshots records
      await client.query(
        `
        INSERT INTO order_items (order_id, product_id, historical_name, historical_price, quantity)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [orderId, item.product_id, item.name, item.price, item.quantity]
      );

      // Decrement physical units right here inside the transaction loop
      await client.query(
        `
        UPDATE products 
        SET stock_quantity = stock_quantity - $1 
        WHERE id = $2
        `,
        [item.quantity, item.product_id]
      );
    }

    // 7. SAFE POLYMORPHIC CART PURGE LAYER
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cart_items' AND column_name = 'user_id'
    `);

    if (columnCheck.rows.length > 0) {
      await client.query(`DELETE FROM cart_items WHERE user_id = $1`, [userId]);
    } else {
      await client.query(
        `DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE user_id = $1)`,
        [userId]
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;

    // Return pure valid structured JSON
    res.json({
      success: true,
      orderId,
      grandTotal: total,
    });

  } catch (err) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackErr) {
        console.error("Fatal transaction cancel failure:", rollbackErr);
      }
    }
    
    console.error("❌ Checkout Pipeline Crash:", err.message);
    res.status(400).json({ success: false, error: err.message || "Checkout engine execution failure" });
  } finally {
    client.release();
  }
});

module.exports = router;