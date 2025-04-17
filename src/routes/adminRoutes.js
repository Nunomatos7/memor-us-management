const express = require("express");
const adminController = require("../controllers/adminController");
const router = express.Router();

router.post("/login", adminController.login);
router.get("/profile", adminController.getProfile);
router.put("/profile", adminController.updateProfile);
router.get("/logs", adminController.getLogs);

module.exports = router;
