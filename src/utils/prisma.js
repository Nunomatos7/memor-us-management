// src/utils/prisma.js
import { PrismaClient } from "@prisma/client";
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

// Initialize the main PrismaClient for tenant management database
const prisma = new PrismaClient();

// Get the application database URL
const APP_DATABASE_URL =
  process.env.APP_DATABASE_URL || process.env.DATABASE_URL;

// Create a function to get a Prisma client for a specific tenant schema
async function getTenantPrismaClient(schemaName) {
  if (!APP_DATABASE_URL) {
    throw new Error("APP_DATABASE_URL environment variable is not set");
  }

  // Create a tenant-specific Prisma client with schema option pointing to the application database
  const tenantPrisma = new PrismaClient({
    datasources: {
      db: {
        url: `${APP_DATABASE_URL}?schema=${schemaName}`,
      },
    },
  });

  return tenantPrisma;
}

// Create a function to get a direct database connection to the application database
async function getAppDatabasePool() {
  if (!APP_DATABASE_URL) {
    throw new Error("APP_DATABASE_URL environment variable is not set");
  }

  return new Pool({
    connectionString: APP_DATABASE_URL,
  });
}

export { prisma, getTenantPrismaClient, getAppDatabasePool };
