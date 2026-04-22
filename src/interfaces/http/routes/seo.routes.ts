// src/interfaces/http/routes/seo.routes.ts
// ─── Rotas SEO — Sitemap, JSON-LD, Meta Tags, Auditoria ─────────────────────

import { Router }         from "express"
import { DatabaseClient } from "@/infrastructure/db/client"
import { SeoService }     from "@/infrastructure/seo/seo.service"
import { SeoController }  from "@/interfaces/http/controllers/seo.controller"
import { authMiddleware } from "@/interfaces/http/middleware/auth.middleware"

export function seoRoutes(db: DatabaseClient): Router {

  const router     = Router()
  const service    = new SeoService(db)
  const controller = new SeoController(service)

  // ─── Rotas PÚBLICAS — para crawlers e bots de busca ─────────────────────
  // Não exigem autenticação

  // Sitemap XML completo de uma loja pelo slug
  // GET /api/v2/seo/sitemap/:dealershipSlug
  router.get("/sitemap/:dealershipSlug", controller.sitemap)

  // Robots.txt da loja
  // GET /api/v2/seo/robots/:dealershipSlug
  router.get("/robots/:dealershipSlug", controller.robots)

  // JSON-LD structured data de um veículo (para embed em páginas)
  // GET /api/v2/seo/vehicle/:vehicleId/schema?dealershipId=X
  router.get("/vehicle/:vehicleId/schema", controller.vehicleSchema)

  // Meta tags completas de um veículo (title, description, og:tags)
  // GET /api/v2/seo/vehicle/:vehicleId/meta?dealershipId=X
  router.get("/vehicle/:vehicleId/meta", controller.vehicleMeta)

  // ─── Rotas PRIVADAS — gestão de SEO do tenant ───────────────────────────

  // Auditoria: quais veículos estão sem SEO configurado
  // GET /api/v2/seo/audit
  router.get("/audit", authMiddleware, controller.audit)

  // Geração em massa: auto-gera SEO para todos os veículos sem dados
  // POST /api/v2/seo/generate
  router.post("/generate", authMiddleware, controller.bulkGenerate)

  // Atualização manual do SEO de um veículo específico
  // PUT /api/v2/seo/vehicle/:vehicleId
  router.put("/vehicle/:vehicleId", authMiddleware, controller.updateVehicle)

  return router
}
