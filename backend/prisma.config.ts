// Prisma configuration
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use SQLite for local development
    url: process.env.DATABASE_URL || "file:./dev.db",
  },
});
