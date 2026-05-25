const express = require("express");
const router = express.Router();
const db = require("../db");

// ==========================================
// 1. GET ALL ITEMS IN A USER'S CART
// ==========================================
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await db.query(
      `SELECT 
        c.id, 
        c.product_id, 
        p.name, 
        p.price, 
        p.category, 
        p.brand_key, 
        c.quantity 
       FROM cart_items c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = $1
       ORDER BY c.id ASC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Cart Error:", err);
    res.status(500).json({ error: "Failed to load database cart" });
  }
});

// ==========================================
// 2. ADD OR INCREMENT ITEM IN CART
// ==========================================
router.post("/", async (req, res) => {
  const { userId, productId, quantity } = req.body;
  
  if (!userId || !productId) {
    return res.status(400).json({ error: "Missing required properties" });
  }

  const addQty = quantity !== undefined ? quantity : 1;

  try {
    const existing = await db.query(
      "SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2",
      [userId, productId]
    );

    if (existing.rows.length > 0) {
      const newQty = existing.rows[0].quantity + addQty;
      
      if (newQty <= 0) {
        await db.query("DELETE FROM cart_items WHERE id = $1", [existing.rows[0].id]);
        return res.json({ success: true, message: "Item removed from cart completely" });
      }

      await db.query(
        "UPDATE cart_items SET quantity = $1 WHERE id = $2",
        [newQty, existing.rows[0].id]
      );
    } else {
      if (addQty <= 0) {
        return res.status(400).json({ error: "Cannot add items with base quantities under 1" });
      }
      await db.query(
        "INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)",
        [userId, productId, addQty]
      );
    }

    res.json({ success: true, message: "Cart synced successfully" });
  } catch (err) {
    console.error("Add to Cart Error:", err);
    res.status(500).json({ error: "Failed to persist cart updates" });
  }
});

// ==========================================
// 3. SET ABSOLUTE QUANTITY OR DELETE IF ZERO
// ==========================================
router.delete("/", async (req, res) => {
  const { userId, productId } = req.body;

  if (!userId || !productId) {
    return res.status(400).json({ error: "Missing parameters to delete item pair" });
  }

  try {
    await db.query(
      "DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2",
      [userId, productId]
    );
    res.json({ success: true, message: "Product drop complete" });
  } catch (err) {
    console.error("Update Cart Error:", err);
    res.status(500).json({ error: "Failed to update cart item quantity" });
  }
});

module.exports = router;