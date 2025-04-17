const auth = require("../utils/auth");
const { tenantsPool } = require("../config/database");

// Helper function to log auth failures
async function logAuthFailure(message, details = {}) {
  try {
    // Log to admin logs with a special system ID for unauthorized access attempts
    const systemAdminId = 1; // Assuming ID 1 is reserved for system logs

    // Format details as a string if they exist
    const detailsStr =
      Object.keys(details).length > 0
        ? ` - Details: ${JSON.stringify(details)}`
        : "";

    await tenantsPool.query(
      "INSERT INTO logs(super_admins_id, action) VALUES($1, $2)",
      [systemAdminId, `Auth failure: ${message}${detailsStr}`]
    );
  } catch (error) {
    console.error("Error logging auth failure:", error);
    // Don't throw error, just continue
  }
}

// Middleware para verificar autenticação
async function authenticate(req, res, next) {
  // Obter o token do cabeçalho Authorization
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    await logAuthFailure("No token provided", {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    return res.status(401).json({ error: "No token provided" });
  }

  // Formato: "Bearer TOKEN"
  const parts = authHeader.split(" ");

  if (parts.length !== 2) {
    await logAuthFailure("Token malformatted", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      authHeader: authHeader.substring(0, 20) + "...",
    });
    return res.status(401).json({ error: "Token error" });
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    await logAuthFailure("Token scheme invalid", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      scheme,
    });
    return res.status(401).json({ error: "Token malformatted" });
  }

  const payload = auth.verifyToken(token);

  if (!payload) {
    await logAuthFailure("Invalid token", {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    return res.status(401).json({ error: "Invalid token" });
  }

  console.log("Auth payload:", payload);
  console.log("Tenant info:", req.tenantInfo);

  req.user = payload;

  if (payload.isSuperAdmin) {
    try {
      await tenantsPool.query(
        "INSERT INTO logs(super_admins_id, action) VALUES($1, $2)",
        [payload.id, `Authenticated access to ${req.method} ${req.path}`]
      );
    } catch (error) {
      console.error("Error logging super admin authentication:", error);
    }
  }

  return next();
}

async function isSuperAdmin(req, res, next) {
  if (!req.user || !req.user.isSuperAdmin) {
    await logAuthFailure("Super admin access denied", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userId: req.user ? req.user.id : "unknown",
    });
    return res
      .status(403)
      .json({ error: "Access denied: Super admin privileges required" });
  }

  return next();
}

async function isAdmin(req, res, next) {
  if (!req.user || !req.user.roles || !req.user.roles.includes("admin")) {
    await logAuthFailure("Admin access denied", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userId: req.user ? req.user.id : "unknown",
    });
    return res
      .status(403)
      .json({ error: "Access denied: Admin privileges required" });
  }

  return next();
}

module.exports = { authenticate, isSuperAdmin, canAccessTenant, isAdmin };

async function canAccessTenant(req, res, next) {
  if (!req.user || !req.tenantInfo) {
    return res
      .status(403)
      .json({ error: "Access denied: Tenant context required" });
  }

  if (req.user.tenant_subdomain !== req.tenantInfo.subdomain) {
    return res.status(403).json({
      error: "Access denied: You cannot access this tenant",
    });
  }

  return next();
}

module.exports = { authenticate, isSuperAdmin, canAccessTenant };
