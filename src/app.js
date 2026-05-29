require("dotenv").config();

const { randomUUID } = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pinoHttp = require("pino-http");
const { RedisStore } = require("rate-limit-redis");
const pkg = require("../package.json");

const logger = require("./config/logger");
const { getRedis } = require("./config/redis");
const { runReadinessCheck } = require("./health/readiness");
const { getClientIpForRateLimit } = require("./utils/clientIp");
const { devRoutesGuard } = require("./middlewares/devRoutesGuard");
const auth = require("./middlewares/auth");
const { parseCorsOrigins } = require("./config/env");

const app = express();

if (process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1") {
  const hops = parseInt(process.env.TRUST_PROXY_HOPS || "1", 10);
  app.set("trust proxy", Number.isFinite(hops) && hops > 0 ? hops : 1);
}

if (process.env.NODE_ENV === "production" && process.env.TRUST_PROXY !== "true" && process.env.TRUST_PROXY !== "1") {
  logger.warn(
    "[op] TRUST_PROXY não está a true: req.ip e rate limit podem colapsar no IP do proxy. " +
      "Defina TRUST_PROXY=true atrás de reverse proxy. Ver docs/OPERATIONS.md"
  );
}

app.use(helmet());

const rawCorsOrigin = process.env.CORS_ORIGIN ? String(process.env.CORS_ORIGIN).trim() : "";
const corsOrigins = parseCorsOrigins();
const defaultProductionCorsOrigins =
  process.env.NODE_ENV === "production" && !rawCorsOrigin
    ? ["https://autodriv-frontend.onrender.com"]
    : null;
const browserCorsOrigins =
  corsOrigins && corsOrigins.length > 0 ? corsOrigins : defaultProductionCorsOrigins;

const devLocalOrigin = [
  /^https?:\/\/localhost(?::\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i
];

const privateCorsOptions =
  browserCorsOrigins && browserCorsOrigins.length > 0
    ? { origin: browserCorsOrigins, credentials: true }
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

app.use(
  pinoHttp({
    logger,
    genReqId: (req) => {
      const hdr = req.headers["x-request-id"];
      if (hdr) return Array.isArray(hdr) ? hdr[0] : String(hdr);
      return randomUUID();
    },
    customLogLevel: (req, res, err) => {
      if (err) return "error";
      if (res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    autoLogging: {
      ignore: (req) =>
        req.url === "/health" ||
        req.url === "/ready" ||
        req.url === "/favicon.ico"
    }
  })
);

app.use((req, res, next) => {
  if (req.id) res.setHeader("X-Request-Id", req.id);
  next();
});

function createLimiter(options, keyPrefix) {
  const redis = getRedis();
  const store =
    redis &&
    new RedisStore({
      sendCommand: (command, ...args) => redis.call(command, ...args),
      prefix: `rl:${keyPrefix}:`
    });

  return rateLimit({
    ...options,
    keyGenerator: (req) => getClientIpForRateLimit(req),
    ...(store ? { store } : {})
  });
}

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10);
const readMax = parseInt(process.env.RATE_LIMIT_READ_MAX || "600", 10);
const authMax = parseInt(process.env.AUTH_RATE_LIMIT_MAX || "30", 10);
const writeMax = parseInt(process.env.RATE_LIMIT_WRITE_MAX || "120", 10);

const authLimiter = createLimiter(
  {
    windowMs,
    max: authMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas tentativas. Tente mais tarde." }
  },
  "auth"
);

const readLimiter = createLimiter(
  {
    windowMs,
    max: readMax,
    standardHeaders: true,
    legacyHeaders: false
  },
  "read"
);

const writeLimiter = createLimiter(
  {
    windowMs,
    max: writeMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Limite de alteracoes excedido. Tente mais tarde." }
  },
  "write"
);

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

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "autodriv-core" });
});

app.get("/ready", async (req, res) => {
  const { statusCode, body } = await runReadinessCheck();
  if (statusCode >= 500) {
    logger.error({ body }, "readiness falhou");
  } else if (statusCode === 503) {
    logger.warn({ body }, "readiness: não pronto");
  }
  res.status(statusCode).json(body);
});

const authRoutes = require("./modules/auth/auth.routes");
app.use("/api/auth", authLimiter, authRoutes);

const billingRoutes = require("./modules/billing/billing.routes");
app.use("/api/billing", auth, billingRoutes);

const billingAdminRoutes = require("./modules/billing/billing.admin.routes");
const billingAdminSubscriptionsRoutes = require("./modules/billing/billing.admin.subscriptions.routes");
app.use(
  "/api/admin/billing",
  auth,
  auth.requireRoles("super_admin", "support"),
  billingAdminRoutes
);
app.use(
  "/api/admin/subscriptions",
  auth,
  auth.requireRoles("super_admin", "support"),
  billingAdminSubscriptionsRoutes
);

const billingWebhookRoutes = require("./modules/billing/billing.webhook.routes");
app.use("/api/webhooks", billingWebhookRoutes);

const webhookRoutes = require("./modules/lead_sources/webhook.routes");
app.use("/api/webhooks", webhookRoutes);

const whatsappAiAdminRoutes = require("./modules/whatsapp_ai/whatsappAi.routes");
app.use(
  "/api/admin/whatsapp-ai",
  auth,
  auth.requireRoles("super_admin", "support", "admin", "manager"),
  whatsappAiAdminRoutes
);

const mountRoutes = [
  ["/api/vehicles", require("./modules/vehicles/vehicles.routes")],
  ["/api/leads", require("./modules/leads/leads.routes")],
  ["/api/lead-sources", require("./modules/lead_sources/leadSources.routes")],
  ["/api/after-sales", require("./modules/after_sales/afterSales.routes")],
  ["/api/stock-intelligence", require("./modules/stock_intelligence/stockIntelligence.routes")],
  ["/api/dashboard", require("./modules/dashboard/dashboard.routes")],
  ["/api/ai-seller", require("./modules/ai_seller/aiSeller.routes")],
  ["/api/ai-settings", require("./modules/ai_settings/aiSettings.routes")],
  ["/api/pipeline", require("./modules/pipeline/pipeline.routes")],
  ["/api/leads-import", require("./modules/leads_import/leadsImport.routes")],
  ["/api/whatsapp", require("./modules/whatsapp/whatsapp.routes")],
  ["/api/inbox", require("./modules/inbox/inbox.routes")],
  ["/api/lead-distribution", require("./modules/lead_distribution/distribution.routes")],
  ["/api/lead-priority", require("./modules/lead_priority/priority.routes")],
  ["/api/intelligence", require("./modules/intelligence/intelligence.routes")],
  ["/api/lead-ai-reception", require("./modules/lead_ai_reception/leadAiReception.routes")],
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
  ["/api/fipe", require("./modules/fipe/fipe.routes")],
  ["/api/trade-appraisals", require("./modules/trade_appraisals/tradeAppraisals.routes")],
  ["/api/proposals", require("./modules/proposals/proposals.routes")],
  ["/api/vehicles", require("./modules/ad_preparation/adPreparation.routes")],
  ["/api/tasks", require("./modules/tasks/tasks.routes")],
  ["/api/seller-actions", require("./modules/seller_actions/sellerActions.routes")],
  ["/api/ads", require("./modules/ads/ads.routes")],
  ["/api/integrations", require("./modules/integrations/integrations.routes")],
  ["/api/maintenance", require("./modules/maintenance/maintenance.routes")],
  ["/api/images", require("./modules/images/images.routes")],
  ["/api/public", require("./modules/public/public.routes")]
];

mountRoutes.forEach(([path, router]) => {
  if (path === "/api/public") {
    app.use(path, router);
  } else {
    app.use(path, auth.withSubscription, router);
  }
});

const isProd = process.env.NODE_ENV === "production";
const wantDev = process.env.ENABLE_DEV_ROUTES === "true" && !isProd;
const devSecretLen = (process.env.DEV_ROUTES_SECRET || "").length;
const canMountDev = wantDev && devSecretLen >= 16;
if (wantDev && !canMountDev) {
  logger.warn(
    "[op] ENABLE_DEV_ROUTES sem DEV_ROUTES_SECRET (mín. 16 caracteres); /api/dev não foi montada"
  );
}
if (canMountDev) {
  const devRouter = require("./modules/dev/dev.routes");
  app.use("/api/dev", devRoutesGuard, devRouter);
}

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "autodriv-core",
    version: pkg.version,
    apiMap: "/api"
  });
});

app.get("/api", (req, res) => {
  const devExtra = canMountDev ? ["/api/dev"] : [];
  res.json({
    service: pkg.name,
    version: pkg.version,
    description: pkg.description,
    mounts: ["/api/auth", ...mountRoutes.map(([prefix]) => prefix), ...devExtra]
  });
});

app.use((err, req, res, next) => {
  logger.error({ err }, "Erro global");
  res.status(500).json({
    error: "Erro interno do servidor"
  });
});

module.exports = app;
