// src/models/tenant.js
import { prisma } from "../utils/prisma.js";
import schemaManager from "../utils/schemaManager.js";
import crypto from "crypto";

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
      return await prisma.tenants.findMany({
        where: {
          deleted_at: null,
        },
        orderBy: {
          created_at: "desc",
        },
      });
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
      // Verify schema setup
      const schemaStatus = await schemaManager.verifySchemaSetup(schemaName);

      if (!schemaStatus.users_exists) {
        console.error(
          `Schema ${schemaName} is missing required tables. Attempting to recreate...`
        );
        await schemaManager.createSchema(schemaName);

        const verifyAgain = await schemaManager.verifySchemaSetup(schemaName);
        if (!verifyAgain.users_exists) {
          throw new Error(
            `Failed to create required tables in schema ${schemaName}`
          );
        }
      }

      const { firstName, lastName, email, password } = adminUser;
      const hashedPassword = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");

      // Use direct SQL execution for tenant data initialization
      // First create the user
      const userResult = await schemaManager.executeSqlInSchema(
        schemaName,
        `INSERT INTO users(
          first_name, last_name, email, password, tenant_subdomain, teams_id
        ) VALUES($1, $2, $3, $4, $5, NULL)
        RETURNING id;`,
        [firstName, lastName, email, hashedPassword, subdomain]
      );

      const userId = userResult.rows[0].id;

      // Then create the admin role
      await schemaManager.executeSqlInSchema(
        schemaName,
        "INSERT INTO roles(title, user_id) VALUES($1, $2);",
        ["admin", userId]
      );

      console.log(
        `Successfully initialized tenant data for ${schemaName} with admin user ID: ${userId}`
      );
      return { success: true, userId };
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
