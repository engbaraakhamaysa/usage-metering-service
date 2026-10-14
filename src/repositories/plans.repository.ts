import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { plans } from "../db/schema/plans.js";

// Get all plans from the database
export async function findAllPlans() {
  return db.select().from(plans);
}

export async function findPlanById(id: string) {
  const result = await db.select().from(plans).where(eq(plans.id, id));

  return result[0] ?? null;
}

// Create a new plan
export async function insertPlan(data: typeof plans.$inferInsert) {
  const result = await db.insert(plans).values(data).returning();

  return result[0];
}
