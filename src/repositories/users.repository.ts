import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";

// Get all users
export async function findAllUsers() {
  return db.select().from(users);
}

// Get a user by ID
export async function findUserById(id: string) {
  const result = await db.select().from(users).where(eq(users.id, id));

  return result[0] ?? null;
}

// Create a new user
export async function insertUser(data: typeof users.$inferInsert) {
  const result = await db.insert(users).values(data).returning();

  return result[0];
}
