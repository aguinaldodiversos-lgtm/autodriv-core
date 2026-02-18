require("dotenv").config();

const express = require("express");

const app = express();

/* =========================
   MIDDLEWARES
========================= */
app.use(express.json());

/* =========================
   ROTAS DOS MÓDULOS
========================= */

// Vehicles
const vehiclesRoutes = require("./modules/vehicles/vehicles.routes");

// Leads
const leadsRoutes = require("./modules/leads/leads.routes");

// AI Seller
const aiSellerRoutes = require("./modules/ai_seller/aiSeller.routes");

// AI Settings
const aiSettingsRoutes = require("./modules/ai_settings/aiSettings.routes");

// Dashboard
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");

// Tasks
const tasksRoutes = require("./modules/tasks/tasks.routes");

app.use("/api/vehicles", vehiclesRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/ai-seller", aiSellerRoutes);
app.use("/api/ai-settings", aiSettingsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/tasks", tasksRoutes);

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Autodriv API online"
  });
});

/* =========================
   ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error("Erro global:", err);
  res.status(500).json({
    error: "Erro interno do servidor"
  });
});

module.exports = app;
