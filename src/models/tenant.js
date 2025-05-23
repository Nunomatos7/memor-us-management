// src/models/tenant.js
import { prisma } from "../utils/prisma.js";
import schemaManager from "../utils/schemaManager.js";
import crypto from "crypto";
import axios from "axios";

class TenantModel {
  async createTenant(name, subdomain, adminId) {
    try {
      // Create schema name from subdomain
      const schemaName = subdomain.replace(/[^a-z0-9]/gi, "_").toLowerCase();

      // Check if tenant with subdomain or schema name already exists
      const existingTenant = await prisma.tenants.findFirst({
        where: {
          OR: [{ subdomain }, { schema_name: schemaName }],
          deleted_at: null,
        },
      });

      if (existingTenant) {
        throw new Error("Tenant com este subdomínio já existe");
      }

      // Create the tenant in the database
      const tenant = await prisma.tenants.create({
        data: {
          name,
          subdomain,
          schema_name: schemaName,
          status: "active",
          created_by_admin_id: adminId,
        },
      });

      // Log the tenant creation
      await this.logAdminAction(
        adminId,
        `Created new tenant: ${name} (${subdomain})`
      );

      // Create schema in database
      await schemaManager.createSchema(schemaName);

      return { id: tenant.id, schema: schemaName };
    } catch (error) {
      console.error("Error creating tenant:", error);
      throw error;
    }
  }

  async getTenantBySubdomain(subdomain) {
    try {
      return await prisma.tenants.findFirst({
        where: {
          subdomain,
          deleted_at: null,
        },
      });
    } catch (error) {
      console.error("Error getting tenant by subdomain:", error);
      throw error;
    }
  }

  async getTenantById(id) {
    try {
      return await prisma.tenants.findFirst({
        where: {
          id: parseInt(id),
          deleted_at: null,
        },
      });
    } catch (error) {
      console.error("Error getting tenant by ID:", error);
      throw error;
    }
  }

  async getAllTenants() {
    try {
      console.log("Fetching all tenants from database...");

      const tenants = await prisma.tenants.findMany({
        where: {
          deleted_at: null,
        },
        orderBy: {
          created_at: "desc",
        },
      });

      console.log(`Found ${tenants.length} active tenants`);
      return tenants;
    } catch (error) {
      console.error("Error getting all tenants:", error);
      throw error;
    }
  }

  async updateTenant(id, name, status, adminId) {
    try {
      // Check if tenant exists
      const existingTenant = await this.getTenantById(id);
      if (!existingTenant) {
        throw new Error("Tenant not found");
      }

      // Update tenant
      const updatedTenant = await prisma.tenants.update({
        where: {
          id: parseInt(id),
        },
        data: {
          name,
          status,
          updated_at: new Date(),
        },
      });

      // Log the update
      await this.logAdminAction(
        adminId,
        `Updated tenant: ID ${id} - Name: "${name}", Status: "${status}"`
      );

      return updatedTenant;
    } catch (error) {
      console.error("Error updating tenant:", error);
      throw error;
    }
  }

  async deleteTenant(id, adminId) {
    try {
      // Check if tenant exists
      const tenant = await this.getTenantById(id);
      if (!tenant) {
        throw new Error("Tenant not found");
      }

      // Soft delete tenant (update deleted_at timestamp and status)
      await prisma.tenants.update({
        where: {
          id: parseInt(id),
        },
        data: {
          deleted_at: new Date(),
          status: "terminated",
        },
      });

      // Log the deletion
      await this.logAdminAction(
        adminId,
        `Deleted tenant: ${tenant.name} (ID: ${id})`
      );

      return { success: true, name: tenant.name, id: tenant.id };
    } catch (error) {
      console.error("Error deleting tenant:", error);
      throw error;
    }
  }

  async initializeTenantData(schemaName, adminUser, tenantName, subdomain) {
    try {
      const tenantServiceUrl = process.env.TENANT_SERVICE_URL;
      const apiKey = process.env.INTERNAL_API_KEY;

      if (!tenantServiceUrl || !apiKey) {
        throw new Error("Tenant service URL or API key is not configured");
      }

      console.log(
        `Requesting tenant service to initialize schema ${schemaName}`
      );

      const response = await axios.post(
        `${tenantServiceUrl}/api/internal/tenants/initialize`,
        {
          schemaName,
          adminUser,
          tenantInfo: {
            name: tenantName,
            subdomain,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
        }
      );

      if (!response.data || !response.data.success) {
        throw new Error(
          "Failed to initialize tenant: " +
            (response.data?.error || "Unknown error")
        );
      }

      console.log(
        `Tenant service successfully initialized tenant data for ${schemaName}`
      );
      return response.data;
    } catch (error) {
      console.error("Error initializing tenant data:", error);
      throw error;
    }
  }

  async logAdminAction(adminId, action) {
    try {
      await prisma.logs.create({
        data: {
          super_admins_id: adminId,
          action,
        },
      });
      return true;
    } catch (error) {
      console.error("Error logging admin action:", error);
      return false;
    }
  }
}

export default new TenantModel();
