import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const isTest = process.env.NODE_ENV === "test";

const connectionString = isTest
  ? process.env.TEST_DATABASE_URL
  : process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    isTest ? "TEST_DATABASE_URL is not defined" : "DATABASE_URL is not defined",
  );
}

export default defineConfig({
  schema: "./src/db/schema/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
