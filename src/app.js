require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const localAI = require("./infrastructure/ai/localAI.service");

const app = express();

// express roda atrás do Cloudflare; confiar em X-Forwarded-For para rate-limit por IP
app.set("trust proxy", 1);

/* =========================
   MIDDLEWARES DE SEGURANÇA
========================= */
app.use(helmet());

const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (corsOrigins.length === 0) {
  console.warn(
    "[CORS] Nenhum CORS_ORIGINS configurado. Somente requisições de mesma origem serão aceitas."
  );
}

app.use(
  cors({
    origin: (origin, cb) => {
      // same-origin (sem Origin header) e server-to-server são permitidos
      if (!origin) return cb(null, true);
      return cb(null, corsOrigins.includes(origin));
    },
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   RATE LIMITERS
========================= */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    `${req.ip}:${(req.body && req.body.email ? req.body.email : "").toLowerCase()}`,
  message: {
    error:
      "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente."
  }
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

// inicializa sem bloquear o app
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
const notificationRoutes = require("./modules/notifications/notification.routes");
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
// Rate limit só nos endpoints sensíveis de autenticação
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
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
  console.error("Erro global:", err);
  res.status(500).json({
    error: "Erro interno do servidor"
  });
});

module.exports = app;
