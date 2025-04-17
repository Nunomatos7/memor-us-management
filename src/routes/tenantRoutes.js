const express = require("express");
const tenantController = require("../controllers/tenantController");
const router = express.Router();

router.post("/", tenantController.createTenant);
router.get("/", tenantController.getAllTenants);
router.get("/check-subdomain/:subdomain", tenantController.checkSubdomain);

module.exports = router;
