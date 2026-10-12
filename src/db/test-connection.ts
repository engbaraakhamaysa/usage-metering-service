import { pool } from "./pool.js";

// Test the connection to PostgreSQL
async function testConnection() {
  try {
    const result = await pool.query("SELECT NOW()");

    console.log("Database connection successful!");
    console.log("Current database time:", result.rows[0].now);
  } catch (error) {
    console.error("Database connection failed:", error);
  } finally {
    await pool.end();
  }
}

testConnection();
