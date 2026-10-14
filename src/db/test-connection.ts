import { db, client } from "./client.js";
import { sql } from "drizzle-orm";

async function testConnection() {
  try {
    const result = await db.execute(sql`SELECT current_database() AS database`);

    console.log("Database connection successful!");
    console.log(result);
  } catch (error) {
    console.error("Database connection failed:", error);
  } finally {
    await client.end();
  }
}

testConnection();
