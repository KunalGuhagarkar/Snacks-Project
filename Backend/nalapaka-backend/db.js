// db.js
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || "5432", 10),
  // Optional but recommended production settings:
  max: 20, // Maximum number of clients the pool should contain
  idleTimeoutMillis: 30000, // How long a client is allowed to sit idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait before timing out when connecting a new client
});

// 🚨 CRITICAL PRODUCTION FIX: Catch unexpected errors on idle pool connections
pool.on("error", (err, client) => {
  console.error("❌ Unexpected error on idle PostgreSQL client:", err);
  // Do not exit the process; the pool will handle removing the broken client
});

module.exports = {
  // Shortcut for single, independent queries
  query: (text, params) => pool.query(text, params),
  
  // Method to acquire a dedicated client for multi-statement transactions
  connect: () => pool.connect(),
  
  // Shortcut to shut down the pool cleanly when turning off your server
  end: () => pool.end(),
};