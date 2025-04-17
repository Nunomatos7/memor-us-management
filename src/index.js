const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
require("dotenv").config();

const tenantController = require("./controllers/tenantController");
const adminController = require("./controllers/adminController");

const { authenticate, isSuperAdmin } = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(cors());
app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, { explorer: true }));

// Static files
app.use(express.static(path.join(__dirname, "../public")));

// Auth routes
app.post("/api/admin/login", adminController.login);

// Tenant management routes
app.get("/api/tenants", authenticate, isSuperAdmin, tenantController.getAllTenants);
app.get("/api/tenants/check-subdomain/:subdomain", tenantController.checkSubdomain);
app.post("/api/tenants", authenticate, isSuperAdmin, tenantController.createTenant);
app.get("/api/tenants/:id", authenticate, isSuperAdmin, tenantController.getTenantById);
app.put("/api/tenants/:id", authenticate, isSuperAdmin, tenantController.updateTenant);
app.delete("/api/tenants/:id", authenticate, isSuperAdmin, tenantController.deleteTenant);

// Admin profile routes
app.get("/api/admin/profile", authenticate, isSuperAdmin, adminController.getProfile);
app.put("/api/admin/profile", authenticate, isSuperAdmin, adminController.updateProfile);
app.get("/api/admin/logs", authenticate, isSuperAdmin, adminController.getLogs);

// Frontend routes
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin-login.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token" });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token expired" });
  }

  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Tenant Manager API running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
  console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
});