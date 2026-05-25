// routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db"); // Pulls your reusable Postgres connection pool

// ==========================================
// 💡 ROUTE 1: CUSTOMER REGISTRATION (SIGN UP)
// ==========================================
router.post("/register", async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    // 1. Check if the user already exists in the database
    const userCheck = await db.query("SELECT * FROM users WHERE email = $1", [
      email.toLowerCase().trim(),
    ]);
    if (userCheck.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "An account with this email already exists." });
    }

    // 2. Hash the password securely using bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Insert the new user into your Postgres 'users' table
    const cleanPhone = phone || "N/A";
    const newUser = await db.query(
      "INSERT INTO users (name, email, password_hash, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, role",
      [
        name,
        email.toLowerCase().trim(),
        hashedPassword,
        cleanPhone,
        "Customer",
      ],
    );

    const user = newUser.rows[0];

    // 4. Generate a JWT Token so they are instantly logged in
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // 5. Send back user data (with role) and token to your React Frontend
    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role, // ✅ Fixed: Added role to registration response
      },
    });
  } catch (err) {
    console.error("Registration Error:", err.message);
    res.status(500).json({ message: "Server database registration failed." });
  }
});

// ==========================================
// 💡 ROUTE 2: CUSTOMER LOGIN (SIGN IN)
// ==========================================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Find user by email
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email.toLowerCase().trim(),
    ]);
    if (result.rows.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid email address or password." });
    }

    const user = result.rows[0];

    // 2. Compare incoming cleartext password with hashed database password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Invalid email address or password." });
    }

    // 3. Generate a fresh session token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // 4. Send response data back to update AuthModal frontend state
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role, // ✅ Fixed: Added role to login response
      },
    });
  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(500).json({ message: "Server database login failed." });
  }
});

module.exports = router;