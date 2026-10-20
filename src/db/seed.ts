import { db, client } from "./connection.js";
import { plans } from "./schema/plans.js";

const predefinedPlans = [
  {
    name: "Starter",
    planType: "account",
    monthlyAllowance: 1_000,
    maxUnitsPerRequest: 100,
    ownerAccountId: null,
  },
  {
    name: "Pro",
    planType: "account",
    monthlyAllowance: 10_000,
    maxUnitsPerRequest: 1_000,
    ownerAccountId: null,
  },
  {
    name: "Basic",
    planType: "user",
    monthlyAllowance: 100,
    maxUnitsPerRequest: 10,
    ownerAccountId: null,
  },
  {
    name: "Premium",
    planType: "user",
    monthlyAllowance: 1_000,
    maxUnitsPerRequest: 100,
    ownerAccountId: null,
  },
] satisfies (typeof plans.$inferInsert)[];

///////////////////////////////////////////////////////
// Create predefined public plans without duplicates
///////////////////////////////////////////////////////
async function seed(): Promise<void> {
  try {
    const insertedPlans = await db
      .insert(plans)
      .values(predefinedPlans)
      .onConflictDoNothing()
      .returning({
        name: plans.name,
        planType: plans.planType,
      });

    console.log(`Created ${insertedPlans.length} predefined plans.`);
    console.table(insertedPlans);
  } catch (error) {
    console.error("Failed to seed predefined plans:", error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

await seed();
