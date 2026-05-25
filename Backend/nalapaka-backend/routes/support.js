const express = require("express");
const router = express.Router();
const db = require("../db");

// =========================================================================
// 📤 POST: Log a new support ticket / inquiry
// =========================================================================
router.post("/support", async (req, res) => {
  const { userId, name, email, subjectType, message } = req.body;

  // Enforce structural field validity check parameters
  if (!name || !email || !subjectType || !message) {
    return res.status(400).json({ error: "All required form fields must be populated." });
  }

  try {
    const result = await db.query(
      `INSERT INTO contact_messages (user_id, name, email, subject_type, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId || null, name, email, subjectType, message]
    );

    res.status(201).json({
      success: true,
      message: "Your message has been logged successfully! Our team will reach out shortly.",
      ticketId: result.rows[0].id
    });
  } catch (err) {
    console.error("❌ Support Submission Drop:", err.message);
    res.status(500).json({ error: "Failed to submit your message. Please try again later." });
  }
});

// =========================================================================
// 📬 GET: Fetch historical query tracking for a logged-in user
// =========================================================================
router.get("/users/support", async (req, res) => {
  try {
    const { userId } = req.query;

    // Fail early to prevent undefined queries or leaking broad table scopes
    if (!userId || userId === "undefined") {
      return res.status(400).json({ error: "Missing required identification token: userId" });
    }

    // COALESCE acts as a fallback protector if structural column defaults are absent
    const queryText = `
      SELECT 
        id, 
        subject_type AS "subjectType", 
        message, 
        COALESCE(status, 'Pending') AS status, 
        created_at AS "createdAt"
      FROM contact_messages 
      WHERE user_id = $1 
      ORDER BY id DESC
    `;

    const result = await db.query(queryText, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Support Fetch Error:", err.message);
    res.status(500).json({ error: "Failed to load live status matrices updates." });
  }
});

module.exports = router;