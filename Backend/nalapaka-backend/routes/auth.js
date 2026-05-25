// routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { OAuth2Client } = require("google-auth-library"); // 👈 Added Google OAuth Dependency
const db = require("../db"); // Pulls your reusable Postgres connection pool

// =========================================================================
// 🌐 GOOGLE OAUTH CLIENT INITIALIZATION
// =========================================================================
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// =========================================================================
// 📬 LIVE EMAIL ENGINE CONFIGURATION (DIAGNOSTIC & SECURE PORT 587 SHIFT)
// =========================================================================
console.log("\n-------------------------------------------------------------");
console.log("🔍 SYSTEM ENVIRONMENT VERIFICATION");
console.log("-------------------------------------------------------------");
console.log("EMAIL_USER string loaded:", !!process.env.EMAIL_USER ? `Yes (${process.env.EMAIL_USER})` : "❌ MISSING");
console.log("EMAIL_PASS string length:", process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : "❌ MISSING");
console.log("GOOGLE_CLIENT_ID loaded :", !!process.env.GOOGLE_CLIENT_ID ? "Yes" : "❌ MISSING");
console.log("-------------------------------------------------------------\n");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,      // Port 587 handles firewalls and local ISPs significantly better than 465
  secure: false,  // Must be false for port 587; it auto-upgrades securely using STARTTLS
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS, 
  },
  tls: {
    // Prevents local development SSL certificate handshake rejections
    rejectUnauthorized: false
  }
});

// Automatically runs on boot to tell you if your settings work instantly
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ NODEMAILER CONFIGURATION HANDSHAKE FAILED:");
    console.error(error); // Prints the complete descriptive Google error object
  } else {
    console.log("🚀 NODEMAILER STATUS: Connected cleanly to Google SMTP servers!");
  }
});

// ==========================================
// 💡 ROUTE 1: CUSTOMER REGISTRATION (SIGN UP)
// ==========================================
router.post("/register", async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    const userCheck = await db.query("SELECT * FROM users WHERE email = $1", [
      email.toLowerCase().trim(),
    ]);
    if (userCheck.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "An account with this email already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

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

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
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
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email.toLowerCase().trim(),
    ]);
    if (result.rows.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid email address or password." });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Invalid email address or password." });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(500).json({ message: "Server database login failed." });
  }
});

// =========================================================================
// 🔑 ROUTE 3: FORGOT PASSWORD (LIVE EMAIL DISPATCH)
// =========================================================================
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    if (!email || email.trim() === "") {
      return res.status(400).json({ message: "Email address parameter is required." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const userCheck = await db.query("SELECT * FROM users WHERE email = $1", [cleanEmail]);
    
    if (userCheck.rows.length === 0) {
      return res.status(200).json({ 
        message: "Recovery token generated and sent to your email! 🚀" 
      });
    }

    const user = userCheck.rows[0];
    const token = crypto.randomBytes(32).toString("hex");
    const expirationLifespan = new Date(Date.now() + 3600000); // 1 hour

    await db.query(
      "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3",
      [token, expirationLifespan, user.id]
    );

    const resetLink = `http://localhost:5173/reset-password?token=${token}`;

    await transporter.sendMail({
      from: `"Nalapaka" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "🔒 Reset Your Nalapaka Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #f3eeda; border-radius: 16px; background-color: #fff;">
          <h2 style="color: #1c1409; text-align: center; font-family: Georgia, serif;">नालपाक</h2>
          <p style="color: #444; font-size: 1rem; line-height: 1.5;">Hello ${user.name || "Customer"},</p>
          <p style="color: #666; font-size: 0.95rem; line-height: 1.5;">We received a request to reset your password for your snack basket account.</p>
          <p style="color: #666; font-size: 0.95rem; line-height: 1.5;">Click the button below to complete the setup. This security link expires in 1 hour:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #e07b2a; color: white; padding: 14px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block; font-size: 1rem; box-shadow: 0 4px 12px rgba(224,123,42,0.25);">Reset Password</a>
          </div>
          <p style="font-size: 0.8rem; color: #999; text-align: center; margin-top: 30px; border-top: 1px solid #f3eeda; padding-top: 15px;">
            If you did not make this request, you can safely ignore this automated message.
          </p>
        </div>
      `,
    });

    return res.status(200).json({ 
      message: "Recovery token generated and sent to your email! 🚀" 
    });

  } catch (err) {
    console.error("❌ CRITICAL DISPATCH EXCEPTION ENCOUNTERED:");
    console.error(err); 
    return res.status(500).json({ 
      message: "Failed to dispatch recovery email. Please check server configuration settings." 
    });
  }
});

// =========================================================================
// 💾 ROUTE 4: RESET PASSWORD (DATABASE UPDATE CONVERSION)
// =========================================================================
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Required token key or password criteria missing." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    const userResult = await db.query(
      "SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()",
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ 
        message: "Validation code token is invalid, corrupted, or past expiration deadline." 
      });
    }

    const user = userResult.rows[0];

    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(newPassword, salt);

    await db.query(
      "UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2",
      [newHashedPassword, user.id]
    );

    return res.status(200).json({ 
      message: "Credentials rewritten successfully! Your access profile has been restored." 
    });

  } catch (err) {
    console.error("Reset Password Error:", err.message);
    return res.status(500).json({ 
      message: "Internal backend anomaly rejected modification update sequence." 
    });
  }
});

// =========================================================================
// 🌐 ROUTE 5: GOOGLE OAUTH IDENTITY RECOVERY (SIGN IN / AUTOMATIC SIGN UP)
// =========================================================================
router.post("/google-login", async (req, res) => {
  const { idToken } = req.body;

  try {
    if (!idToken) {
      return res.status(400).json({ message: "Google ID Token payload parameter is missing." });
    }

    // 1. Verify integrity of token string directly against Google's security ledger
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    if (!email) {
      return res.status(400).json({ message: "Google profile lookup data is corrupted." });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 2. Query PostgreSQL to see if account exists
    let userResult = await db.query("SELECT * FROM users WHERE email = $1", [cleanEmail]);
    let user;

    if (userResult.rows.length === 0) {
      // 3. User does not exist -> Automatically register them!
      // Social sign-ins don't use conventional passwords, so we flag it with a placeholder
      const placeholderPassword = "OAUTH_EXTERNAL_GOOGLE_ACCOUNT_VALIDATED";
      
      const newUser = await db.query(
        "INSERT INTO users (name, email, password_hash, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, role",
        [name, cleanEmail, placeholderPassword, "N/A", "Customer"]
      );
      user = newUser.rows[0];
    } else {
      // 4. User exists -> Retrieve database profile data row
      user = userResult.rows[0];
    }

    // 5. Build your app's regular native session JWT token configuration
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 6. Respond with standard response layout used by standard password authorization routes
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });

  } catch (err) {
    console.error("❌ Google Authorization Payload Error:", err);
    return res.status(500).json({ message: "Google verification token handshake failed." });
  }
});

module.exports = router;