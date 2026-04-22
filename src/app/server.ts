// src/app/server.ts
// ─── Entry point principal do AIP Core ───────────────────────────────────────
// Substitui src/server.js para o runtime TypeScript com toda a arquitetura DDD

import "dotenv/config"
import express, { Request, Response, NextFunction } from "express"
import cors  from "cors"
import path  from "path"

import { bootstrap }        from "./bootstrap"
import { logger }           from "@/infrastructure/logger/logger"

// ─── Rotas TypeScript (interfaces/http) ──────────────────────────────────────
import { leadRoutes }        from "@/interfaces/http/routes/lead.routes"
import { vehicleRoutes }     from "@/interfaces/http/routes/vehicle.routes"
import { saleRoutes }        from "@/interfaces/http/routes/sale.routes"
import { financeRoutes }     from "@/interfaces/http/routes/finance.routes"
import { marketingRoutes }   from "@/interfaces/http/routes/marketing.routes"
import { crmRoutes }         from "@/interfaces/http/routes/crm.routes"
import { maintenanceRoutes } from "@/interfaces/http/routes/maintenance.routes"
import { contractRoutes }    from "@/interfaces/http/routes/contract.routes"
import { systemRoutes }      from "@/interfaces/http/routes/system.routes"
import { seoRoutes }         from "@/interfaces/http/routes/seo.routes"

// ─── Auth middleware TypeScript ───────────────────────────────────────────────
import { authMiddleware }    from "@/interfaces/http/middleware/auth.middleware"

// ─── Read Models Controllers ──────────────────────────────────────────────────
import { DashboardViewBuilder } from "@/read-models/dashboard.view"
import { ChannelViewBuilder }   from "@/read-models/channel.view"
import { VehicleViewBuilder }   from "@/read-models/vehicle.view"

const PORT = Number(process.env.PORT ?? 10000)

async function start() {

  // ─── 1. Migrations ─────────────────────────────────────────────────────────
  try {
    const runMigrations = require("../database/migrate")
    await runMigrations()
    logger.info("✅ Migrations executadas")
  } catch (err) {
    logger.error({ err }, "❌ Falha nas migrations")
    process.exit(1)
  }

  // ─── 2. Bootstrap DDD / Cérebro Central ────────────────────────────────────
  const context = await bootstrap(process.env)

  // ─── 3. Express App ────────────────────────────────────────────────────────
  const app = express()

  app.use(cors())
  app.use(express.json({ limit: "10mb" }))
  app.use(express.urlencoded({ extended: true }))
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")))

  // ─── 4. Health check ───────────────────────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({
      status:    "AIP running",
      version:   "2.0.0",
      timestamp: new Date().toISOString(),
      brain:     "active"
    })
  })

  // ─── 5. Rotas do Sistema (DDD/CQRS) ────────────────────────────────────────
  app.use("/api/system", systemRoutes(context))

  // ─── 6. Rotas autenticadas — Domínios de negócio ───────────────────────────
  const auth = authMiddleware

  // Leads — CRM core
  app.use("/api/v2/leads",       auth, leadRoutes(context.db, context.eventBus))

  // Veículos — Gestão de estoque
  app.use("/api/v2/vehicles",    auth, vehicleRoutes(context.db, context.eventBus))

  // Vendas
  app.use("/api/v2/sales",       auth, saleRoutes(context.db, context.eventBus))

  // Finanças
  app.use("/api/v2/finance",     auth, financeRoutes(context.db))

  // Marketing / Campanhas
  app.use("/api/v2/marketing",   auth, marketingRoutes(context.db))

  // CRM — Clientes
  app.use("/api/v2/crm",         auth, crmRoutes(context.db))

  // Manutenção
  app.use("/api/v2/maintenance", auth, maintenanceRoutes(context.db))

  // Contratos de compra e venda
  app.use("/api/v2/contracts",   auth, contractRoutes(context.db))

  // SEO — Sitemap, JSON-LD, Auditoria (rotas públicas + privadas misturadas)
  app.use("/api/v2/seo",         seoRoutes(context.db))

  // ─── 7. Read Models — Views inteligentes ─────────────────────────────────
  const dashboardView = new DashboardViewBuilder(context.db)
  const channelView   = new ChannelViewBuilder(context.db)
  const vehicleView   = new VehicleViewBuilder(context.db)

  app.get("/api/v2/views/dashboard", auth, async (req: Request, res: Response) => {
    try {
      const { dealership_id } = (req as any).user
      const { month, year }   = req.query
      const view = await dashboardView.build(dealership_id, Number(month), Number(year))
      return res.json(view)
    } catch (err: any) { return res.status(500).json({ error: err.message }) }
  })

  app.get("/api/v2/views/channels", auth, async (req: Request, res: Response) => {
    try {
      const { dealership_id } = (req as any).user
      const view = await channelView.build(dealership_id)
      return res.json(view)
    } catch (err: any) { return res.status(500).json({ error: err.message }) }
  })

  app.get("/api/v2/views/stock", auth, async (req: Request, res: Response) => {
    try {
      const { dealership_id } = (req as any).user
      const { receitaMensal } = req.query
      const view = await vehicleView.build(dealership_id, Number(receitaMensal ?? 0))
      return res.json(view)
    } catch (err: any) { return res.status(500).json({ error: err.message }) }
  })

  // ─── 8. Módulos legados (mantidos para compatibilidade) ───────────────────
  const legacyModules = [
    { path: "/api/auth",                   module: "../modules/auth/auth.routes" },
    { path: "/api/leads",                  module: "../modules/leads/leads.routes" },
    { path: "/api/vehicles",               module: "../modules/vehicles/vehicles.routes" },
    { path: "/api/dashboard",              module: "../modules/dashboard/dashboard.routes" },
    { path: "/api/ai-seller",              module: "../modules/ai_seller/aiSeller.routes" },
    { path: "/api/ai-settings",            module: "../modules/ai_settings/aiSettings.routes" },
    { path: "/api/pipeline",               module: "../modules/pipeline/pipeline.routes" },
    { path: "/api/leads-import",           module: "../modules/leads_import/leadsImport.routes" },
    { path: "/api/whatsapp",               module: "../modules/whatsapp/whatsapp.routes" },
    { path: "/api/inbox",                  module: "../modules/inbox/inbox.routes" },
    { path: "/api/lead-distribution",      module: "../modules/lead_distribution/distribution.routes" },
    { path: "/api/notifications",          module: "../modules/notifications/rules/notification.routes" },
    { path: "/api/goals",                  module: "../modules/goals/goal.routes" },
    { path: "/api/funnel-analysis",        module: "../modules/funnel_analysis/funnel.routes" },
    { path: "/api/seller-ranking",         module: "../modules/seller_ranking/ranking.routes" },
    { path: "/api/ai-strategy",            module: "../modules/ai_strategy/strategy.routes" },
    { path: "/api/commission",             module: "../modules/commission/commission.routes" },
    { path: "/api/sales",                  module: "../modules/sales/sales.routes" },
    { path: "/api/contracts",              module: "../modules/contracts/contracts.routes" },
    { path: "/api/sales-approval-panel",   module: "../modules/sales_approval_panel/approvalPanel.routes" },
    { path: "/api/approval-dashboard",     module: "../modules/approval_dashboard/approval.routes" },
    { path: "/api/forecast",               module: "../modules/analytics/forecast.routes" },
    { path: "/api/dashboard-intelligence", module: "../modules/dashboard_intelligence/dashboard.routes" },
  ]

  for (const { path: routePath, module: modulePath } of legacyModules) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const routes = require(modulePath)
      app.use(routePath, routes.default ?? routes)
    } catch {
      // Módulo não encontrado — ignorar silenciosamente
    }
  }

  // ─── 9. Error handler global ───────────────────────────────────────────────
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, "❌ Erro não tratado")
    res.status(500).json({ error: "Internal server error", message: err.message })
  })

  // ─── 10. Start server ──────────────────────────────────────────────────────
  app.listen(PORT, () => {
    logger.info(`🚀 AIP Server iniciado na porta ${PORT}`)
    logger.info(`📡 API v2 disponível em /api/v2/`)
    logger.info(`🧠 Brain Orchestrator: ATIVO`)
  })

  // ─── 11. WhatsApp Baileys (async, não-bloqueante) ─────────────────────────
  try {
    const { startWhatsApp } = require("../modules/whatsapp_baileys/whatsapp.baileys")
    startWhatsApp().catch((err: any) =>
      logger.warn(`⚠️ WhatsApp não iniciou: ${(err as any).message}`)
    )
  } catch {
    logger.info("ℹ️ WhatsApp Baileys não disponível")
  }

  // ─── 12. Handlers de processo ─────────────────────────────────────────────
  process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "❌ unhandledRejection")
  })

  process.on("uncaughtException", (err) => {
    logger.error({ err }, "❌ uncaughtException")
    process.exit(1)
  })
}

start()
