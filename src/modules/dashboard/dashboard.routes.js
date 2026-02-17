const express = require("express");
const controller = require("./dashboard.controller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

// Dashboard principal
router.get("/", auth, controller.getDashboard);

// Métricas gerais
router.get("/metrics", auth, controller.getMetrics);

// Leads recentes
router.get("/recent-leads", auth, controller.getRecentLeads);

// Veículos recentes
router.get("/recent-vehicles", auth, controller.getRecentVehicles);

module.exports = router;
