const express = require("express");
const controller = require("./dashboard.controller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

// rota principal do dashboard
if (controller.getDashboard) {
  router.get("/", auth, controller.getDashboard);
}

// métricas
if (controller.getMetrics) {
  router.get("/metrics", auth, controller.getMetrics);
}

// leads recentes
if (controller.getRecentLeads) {
  router.get("/recent-leads", auth, controller.getRecentLeads);
}

// veículos recentes
if (controller.getRecentVehicles) {
  router.get("/recent-vehicles", auth, controller.getRecentVehicles);
}

module.exports = router;
