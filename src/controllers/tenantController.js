// src/controllers/tenantController.js
import tenantModel from "../models/tenant.js";

class TenantController {
  async createTenant(req, res) {
    try {
      const { name, subdomain, adminId, adminUser } = req.body;

      if (!name || !subdomain || !adminId || !adminUser) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!/^[a-z0-9-]+$/.test(subdomain)) {
        return res.status(400).json({
          error:
            "Subdomain must contain only lowercase letters, numbers, and hyphens",
        });
      }

      const superAdminId =
        req.user && req.user.isSuperAdmin ? req.user.id : adminId;

      // Create tenant record and schema in the database
      const tenantInfo = await tenantModel.createTenant(
        name,
        subdomain,
        superAdminId
      );

      // After schema creation, initialize the tenant data directly
      try {
        // Convert subdomain to schema name (same logic as in createTenant)
        const schemaName = subdomain.replace(/[^a-z0-9]/gi, "_").toLowerCase();

        // Initialize the tenant data with the admin user
        await tenantModel.initializeTenantData(
          schemaName,
          adminUser,
          name,
          subdomain
        );

        res.status(201).json({
          success: true,
          message: `Tenant ${name} (${subdomain}) created successfully`,
          tenantId: tenantInfo.id,
        });
      } catch (error) {
        console.error("Error initializing tenant data:", error.message);

        // If data initialization fails, revert the tenant creation
        await tenantModel.deleteTenant(tenantInfo.id, superAdminId);

        return res.status(500).json({
          error: "Failed to initialize tenant data",
          details: error.message,
        });
      }
    } catch (error) {
      console.error("Error in createTenant controller:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async getAllTenants(req, res) {
    try {
      const tenants = await tenantModel.getAllTenants();

      if (req.user && req.user.isSuperAdmin) {
        await tenantModel.logAdminAction(
          req.user.id,
          "Retrieved list of all tenants"
        );
      }

      res.json(tenants);
    } catch (error) {
      console.error("Error getting tenants:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getTenantById(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: "Tenant ID is required" });
      }

      const tenant = await tenantModel.getTenantById(id);

      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      await tenantModel.logAdminAction(
        req.user.id,
        `Retrieved details for tenant ${tenant.name} (ID: ${tenant.id})`
      );

      res.json(tenant);
    } catch (error) {
      console.error("Error getting tenant:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async updateTenant(req, res) {
    try {
      const { id } = req.params;
      const { name, status } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Tenant name is required" });
      }

      const currentTenant = await tenantModel.getTenantById(id);
      if (!currentTenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const updatedTenant = await tenantModel.updateTenant(
        id,
        name,
        status,
        req.user.id
      );

      await tenantModel.logAdminAction(
        req.user.id,
        `Updated tenant ${currentTenant.id} - Name: "${currentTenant.name}" → "${name}", Status: "${currentTenant.status}" → "${status}"`
      );

      res.json({
        success: true,
        message: "Tenant updated successfully",
        tenant: updatedTenant,
      });
    } catch (error) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async deleteTenant(req, res) {
    try {
      const { id } = req.params;

      const tenant = await tenantModel.getTenantById(id);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const result = await tenantModel.deleteTenant(id, req.user.id);

      await tenantModel.logAdminAction(
        req.user.id,
        `Deleted tenant "${tenant.name}" (ID: ${tenant.id}, subdomain: ${tenant.subdomain})`
      );

      res.json({
        success: true,
        message: `Tenant deleted successfully`,
        tenant: result,
      });
    } catch (error) {
      console.error("Error deleting tenant:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async checkSubdomain(req, res) {
    try {
      const { subdomain } = req.params;

      if (!subdomain) {
        return res.status(400).json({ error: "Subdomain is required" });
      }

      const tenant = await tenantModel.getTenantBySubdomain(subdomain);

      if (tenant) {
        return res.json({ available: false });
      }

      return res.json({ available: true });
    } catch (error) {
      console.error("Error checking subdomain:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export default new TenantController();
