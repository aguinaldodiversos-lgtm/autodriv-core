require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pkg = require("../package.json");

const localAI = require("./infrastructure/ai/localAI.service");

const app = express();

if (process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

/* =========================
   MIDDLEWARES
========================= */
app.use(helmet());

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : null;

const devLocalOrigin = [
  /^https?:\/\/localhost(?::\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i
];

const privateCorsOptions =
  corsOrigins && corsOrigins.length > 0
    ? { origin: corsOrigins, credentials: true }
    : process.env.NODE_ENV === "production"
      ? { origin: false, credentials: true }
      : { origin: devLocalOrigin, credentials: true };

function corsMiddleware(req, res, next) {
  if (req.path.startsWith("/api/public")) {
    return cors({ origin: true, credentials: false })(req, res, next);
  }
  return cors(privateCorsOptions)(req, res, next);
}

app.use(corsMiddleware);

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10);
const readMax = parseInt(process.env.RATE_LIMIT_READ_MAX || "600", 10);
const authMax = parseInt(process.env.AUTH_RATE_LIMIT_MAX || "30", 10);
const writeMax = parseInt(process.env.RATE_LIMIT_WRITE_MAX || "120", 10);

const authLimiter = rateLimit({
  windowMs,
  max: authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Tente mais tarde." }
});

const readLimiter = rateLimit({
  windowMs,
  max: readMax,
  standardHeaders: true,
  legacyHeaders: false
});

const writeLimiter = rateLimit({
  windowMs,
  max: writeMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Limite de alterações excedido. Tente mais tarde." }
});

app.use((req, res, next) => {
  if (!req.path.startsWith("/api")) return next();
  if (req.path.startsWith("/api/auth")) return next();
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return readLimiter(req, res, next);
  }
  return writeLimiter(req, res, next);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require("./modules/auth/auth.routes");
app.use("/api/auth", authLimiter, authRoutes);

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
   ROTAS (mapa único: altere só este array)
========================= */
const mountRoutes = [
  ["/api/vehicles", require("./modules/vehicles/vehicles.routes")],
  ["/api/leads", require("./modules/leads/leads.routes")],
  ["/api/dashboard", require("./modules/dashboard/dashboard.routes")],
  ["/api/ai-seller", require("./modules/ai_seller/aiSeller.routes")],
  ["/api/ai-settings", require("./modules/ai_settings/aiSettings.routes")],
  ["/api/pipeline", require("./modules/pipeline/pipeline.routes")],
  ["/api/leads-import", require("./modules/leads_import/leadsImport.routes")],
  ["/api/whatsapp", require("./modules/whatsapp/whatsapp.routes")],
  ["/api/inbox", require("./modules/inbox/inbox.routes")],
  ["/api/lead-distribution", require("./modules/lead_distribution/distribution.routes")],
  ["/api/forecast", require("./modules/analytics/forecast.routes")],
  ["/api/dashboard-intelligence", require("./modules/dashboard_intelligence/dashboard.routes")],
  ["/api/notifications", require("./modules/notifications/rules/notification.routes")],
  ["/api/goals", require("./modules/goals/goal.routes")],
  ["/api/funnel-analysis", require("./modules/funnel_analysis/funnel.routes")],
  ["/api/seller-ranking", require("./modules/seller_ranking/ranking.routes")],
  ["/api/ai-strategy", require("./modules/ai_strategy/strategy.routes")],
  ["/api/commission", require("./modules/commission/commission.routes")],
  ["/api/sales", require("./modules/sales/sales.routes")],
  ["/api/contracts", require("./modules/contracts/contracts.routes")],
  ["/api/sales-approval-panel", require("./modules/sales_approval_panel/approvalPanel.routes")],
  ["/api/approval-dashboard", require("./modules/approval_dashboard/approvalDashboard.routes")],
  ["/api/clients", require("./modules/clients/clients.routes")],
  ["/api/finance", require("./modules/finance/finance.routes")],
  ["/api/proposals", require("./modules/proposals/proposals.routes")],
  ["/api/tasks", require("./modules/tasks/tasks.routes")],
  ["/api/ads", require("./modules/ads/ads.routes")],
  ["/api/integrations", require("./modules/integrations/integrations.routes")],
  ["/api/maintenance", require("./modules/maintenance/maintenance.routes")],
  ["/api/images", require("./modules/images/images.routes")],
  ["/api/public", require("./modules/public/public.routes")]
];

if (process.env.NODE_ENV !== "production") {
  mountRoutes.push(["/api/dev", require("./modules/dev/dev.routes")]);
}

mountRoutes.forEach(([path, router]) => {
  app.use(path, router);
});

/* =========================
   ENDPOINT DE SAÚDE + MAPA DA API
========================= */
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "autodriv-core",
    version: pkg.version,
    localAI: localAI ? "initialized_or_attempted" : "not_loaded",
    apiMap: "/api"
  });
});

app.get("/api", (req, res) => {
  res.json({
    service: pkg.name,
    version: pkg.version,
    description: pkg.description,
    mounts: ["/api/auth", ...mountRoutes.map(([prefix]) => prefix)]
  });
});

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
