import "dotenv/config";

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const isTest = process.env.NODE_ENV === "test";

const connectionString = isTest
  ? process.env.TEST_DATABASE_URL
  : process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    isTest ? "TEST_DATABASE_URL is not defined" : "DATABASE_URL is not defined",
  );
}

export const client = postgres(connectionString);

export const db = drizzle(client);
