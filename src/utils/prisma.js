// src/utils/prisma.js
import { PrismaClient } from "@prisma/client";
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

// Initialize the main PrismaClient
const prisma = new PrismaClient();

// Create a function to get a Prisma client for a specific tenant schema
async function getTenantPrismaClient(schemaName) {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Create a tenant-specific Prisma client with schema option
  const tenantPrisma = new PrismaClient({
    datasources: {
      db: {
        url: `${DATABASE_URL}?schema=${schemaName}`,
      },
    },
  });

  return tenantPrisma;
}

export { prisma, getTenantPrismaClient };
