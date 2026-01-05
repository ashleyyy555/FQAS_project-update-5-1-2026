// lib/db.ts

import { Pool } from "pg";

// Use the connection string from your environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set in environment variables.");
}

// Create a connection pool to manage database connections efficiently
export const pool = new Pool({
  connectionString,
  // Neon requires SSL. The connection string should handle it, 
  // but explicitly setting ssl: true ensures compatibility.
  ssl: {
    rejectUnauthorized: false, // May be needed depending on your environment
  }
})