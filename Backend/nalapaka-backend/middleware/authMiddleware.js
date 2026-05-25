// backend/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

// 🛡️ Middleware 1: Verify user is logged in
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Expects "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: "Access Denied: No token provided." });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // Contains { id, role } from your payload
    next();
  } catch (err) {
    res.status(403).json({ message: "Invalid or expired token." });
  }
};

// 👑 Middleware 2: Verify user is an Admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "Admin") {
    next(); // Authorized! Proceed to the route handler.
  } else {
    res.status(403).json({ message: "Access Denied: Admin privileges required." });
  }
};

module.exports = { verifyToken, isAdmin };