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

// console.log(
//   await insertPlan({
//     name: "Starter",
//     planType: "user",
//     monthlyAllowance: 1000,
//     maxUnitsPerRequest: 100,
//   }),
// );

console.log(await findAllPlans());

console.log(await findPlanById("50db84a4-ed84-4af5-b65d-486ea632b728"));
