require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

/* =========================
   MIDDLEWARES
========================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   ROTAS
========================= */
const authRoutes = require("./routes/auth");
const vehiclesRoutes = require("./modules/vehicles/vehicles.routes");
const leadsRoutes = require("./modules/leads/leads.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const aiSellerRoutes = require("./modules/ai_seller/aiSeller.routes");
const aiSettingsRoutes = require("./modules/ai_settings/aiSettings.routes");
const pipelineRoutes = require("./modules/pipeline/pipeline.routes");
const leadsImportRoutes = require("./modules/leads_import/leadsImport.routes");
const whatsappRoutes = require("./modules/whatsapp/whatsapp.routes");
const inboxRoutes = require("./modules/inbox/inbox.routes");
const whatsappRoutes = require("./modules/whatsapp/whatsapp.routes");
const leadDistributionRoutes = require("./modules/lead_distribution/distribution.routes");
const forecastRoutes = require("./modules/analytics/forecast.routes");
const dashboardIntelligenceRoutes = require("./modules/dashboard_intelligence/dashboard.routes");

/* =========================
   ENDPOINT DE SAÚDE
========================= */
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "autodriv-core"
  });
});

/* =========================
   REGISTRO DAS ROTAS
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehiclesRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/ai-seller", aiSellerRoutes);
app.use("/api/ai-settings", aiSettingsRoutes);
app.use("/api/pipeline", pipelineRoutes);
app.use("/api/leads-import", leadsImportRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/inbox", inboxRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/lead-distribution", leadDistributionRoutes);
app.use("/api/forecast", forecastRoutes);
app.use("/api/dashboard-intelligence", dashboardIntelligenceRoutes);

/* =========================
   HANDLER DE ERROS
========================= */
app.use((err, req, res, next) => {
  console.error("Erro global:", err);
  res.status(500).json({
    error: "Erro interno do servidor"
  });
});

module.exports = app;
