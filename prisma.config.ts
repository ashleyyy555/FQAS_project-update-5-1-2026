// prisma.config.ts  (at project root)
import "dotenv/config";                     // load .env
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // Path is from project root:
  schema: "prisma/schema.prisma",                       // required for Prisma 7 classic engine
  datasource: {
    // Use Prisma's env() helper, not process.env
    url: env("DATABASE_URL"),
  },
});
