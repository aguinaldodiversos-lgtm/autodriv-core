require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { CORS_ORIGINS, NODE_ENV } = require("./config/env");
const localAI = require("./infrastructure/ai/localAI.service");

const app = express();

/* =========================
   HARDENING BÁSICO
========================= */
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());

/* CORS com allowlist explícita. Lista vazia só é aceita em dev. */
const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (CORS_ORIGINS.length === 0 && NODE_ENV !== "production") {
      return callback(null, true);
    }
    if (CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS bloqueado para origem: ${origin}`));
  },
  credentials: true
};
app.use(cors(corsOptions));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

/* =========================
   RATE LIMIT EM AUTH
========================= */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_requests" }
});

/* =========================
   INICIALIZAÇÃO SEGURA DA IA LOCAL
========================= */
async function initializeLocalAI() {
  try {
    await localAI.init();
    console.log("🧠 IA Local inicializada com sucesso");
  } catch (error) {
    console.error("⚠️ IA Local desabilitada:", error.message);
    // NÃO derruba o sistema
  }
}

initializeLocalAI();

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
const leadDistributionRoutes = require("./modules/lead_distribution/distribution.routes");
const forecastRoutes = require("./modules/analytics/forecast.routes");
const dashboardIntelligenceRoutes = require("./modules/dashboard_intelligence/dashboard.routes");
const notificationRoutes = require("./modules/notifications/rules/notification.routes");
const goalRoutes = require("./modules/goals/goal.routes");
const funnelRoutes = require("./modules/funnel_analysis/funnel.routes");
const rankingRoutes = require("./modules/seller_ranking/ranking.routes");
const strategyRoutes = require("./modules/ai_strategy/strategy.routes");
const commissionRoutes = require("./modules/commission/commission.routes");
const salesRoutes = require("./modules/sales/sales.routes");
const contractRoutes = require("./modules/contracts/contracts.routes");
const approvalPanelRoutes = require("./modules/sales_approval_panel/approvalPanel.routes");
const approvalDashboardRoutes = require("./modules/approval_dashboard/approvalDashboard.routes");

/* =========================
   ENDPOINT DE SAÚDE
========================= */
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "autodriv-core",
    localAI: localAI ? "initialized_or_attempted" : "not_loaded"
  });
});

/* =========================
   REGISTRO DAS ROTAS
========================= */
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/vehicles", vehiclesRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/ai-seller", aiSellerRoutes);
app.use("/api/ai-settings", aiSettingsRoutes);
app.use("/api/pipeline", pipelineRoutes);
app.use("/api/leads-import", leadsImportRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/inbox", inboxRoutes);
app.use("/api/lead-distribution", leadDistributionRoutes);
app.use("/api/forecast", forecastRoutes);
app.use("/api/dashboard-intelligence", dashboardIntelligenceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/funnel-analysis", funnelRoutes);
app.use("/api/seller-ranking", rankingRoutes);
app.use("/api/ai-strategy", strategyRoutes);
app.use("/api/commission", commissionRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/sales-approval-panel", approvalPanelRoutes);
app.use("/api/approval-dashboard", approvalDashboardRoutes);

/* =========================
   HANDLER DE ERROS
========================= */
app.use((err, req, res, next) => {
  if (err && err.message && err.message.startsWith("CORS bloqueado")) {
    return res.status(403).json({ error: "cors_blocked" });
  }
  console.error("Erro global:", err);
  res.status(500).json({
    error: "Erro interno do servidor"
  });
});

module.exports = app;
