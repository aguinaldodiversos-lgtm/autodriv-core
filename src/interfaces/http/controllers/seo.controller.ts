// src/interfaces/http/controllers/seo.controller.ts
// ─── Controller SEO — Sitemap, JSON-LD, Auditoria e Geração em Massa ────────

import { Request, Response, NextFunction } from "express"
import { SeoService } from "@/infrastructure/seo/seo.service"
import { logger }     from "@/infrastructure/logger/logger"

export class SeoController {

  constructor(private seoService: SeoService) {}

  // ─── GET /seo/sitemap/:dealershipSlug ────────────────────────────────────
  // Público — para crawlers de busca

  sitemap = async (req: Request, res: Response): Promise<void> => {
    try {
      const { dealershipSlug } = req.params

      const dealership = await this.seoService.getDealershipBySlug(dealershipSlug)

      if (!dealership) {
        res.status(404).json({ error: "Concessionária não encontrada" })
        return
      }

      const vehicles = await this.seoService.getAvailableVehicles(dealership.id)

      const baseUrl = process.env.PUBLIC_URL ?? `https://${dealershipSlug}.autodriv.com.br`

      const xml = this.seoService.generateSitemapXml(vehicles, dealership, baseUrl)

      res.set("Content-Type", "application/xml; charset=utf-8")
      res.set("Cache-Control", "public, max-age=3600") // cache 1h
      res.send(xml)

    } catch (err) {
      logger.error({ err }, "❌ Erro ao gerar sitemap")
      res.status(500).json({ error: "Erro interno" })
    }
  }

  // ─── GET /seo/robots/:dealershipSlug ─────────────────────────────────────
  // Público

  robots = async (req: Request, res: Response): Promise<void> => {
    try {
      const { dealershipSlug } = req.params

      const baseUrl = process.env.PUBLIC_URL ?? `https://${dealershipSlug}.autodriv.com.br`

      const content = this.seoService.generateRobotsTxt(baseUrl)

      res.set("Content-Type", "text/plain; charset=utf-8")
      res.set("Cache-Control", "public, max-age=86400") // cache 24h
      res.send(content)

    } catch (err) {
      logger.error({ err }, "❌ Erro ao gerar robots.txt")
      res.status(500).json({ error: "Erro interno" })
    }
  }

  // ─── GET /seo/vehicle/:vehicleId/schema ──────────────────────────────────
  // Público — JSON-LD para um veículo específico

  vehicleSchema = async (req: Request, res: Response): Promise<void> => {
    try {
      const vehicleId = Number(req.params.vehicleId)
      const dealershipId = Number(req.query.dealershipId)

      if (!vehicleId || !dealershipId) {
        res.status(400).json({ error: "vehicleId e dealershipId são obrigatórios" })
        return
      }

      const vehicle    = await this.seoService.getVehicleById(vehicleId, dealershipId)
      const dealership = await this.seoService.getDealershipById(dealershipId)

      if (!vehicle || !dealership) {
        res.status(404).json({ error: "Veículo ou concessionária não encontrado" })
        return
      }

      // Retorna o schema salvo se existir, ou gera em tempo real
      const schema = vehicle.seo_schema
        ?? this.seoService.generateStructuredData(
            vehicle,
            dealership,
            process.env.PUBLIC_URL ?? ""
          )

      res.set("Cache-Control", "public, max-age=3600")
      res.json(schema)

    } catch (err) {
      logger.error({ err }, "❌ Erro ao gerar schema de veículo")
      res.status(500).json({ error: "Erro interno" })
    }
  }

  // ─── GET /seo/vehicle/:vehicleId/meta ────────────────────────────────────
  // Público — Meta tags (title, description, keywords, og:tags)

  vehicleMeta = async (req: Request, res: Response): Promise<void> => {
    try {
      const vehicleId   = Number(req.params.vehicleId)
      const dealershipId = Number(req.query.dealershipId)

      if (!vehicleId || !dealershipId) {
        res.status(400).json({ error: "vehicleId e dealershipId são obrigatórios" })
        return
      }

      const vehicle    = await this.seoService.getVehicleById(vehicleId, dealershipId)
      const dealership = await this.seoService.getDealershipById(dealershipId)

      if (!vehicle || !dealership) {
        res.status(404).json({ error: "Veículo não encontrado" })
        return
      }

      // Usa os dados salvos se existirem, caso contrário gera ao vivo
      const meta = vehicle.seo_title
        ? {
            title:       vehicle.seo_title,
            description: vehicle.seo_description ?? "",
            keywords:    vehicle.seo_keywords ?? "",
            slug:        vehicle.slug ?? ""
          }
        : this.seoService.generateMeta(vehicle, dealership)

      const baseUrl   = process.env.PUBLIC_URL ?? ""
      const vehicleUrl = `${baseUrl}/veiculos/${meta.slug}`

      res.set("Cache-Control", "public, max-age=3600")
      res.json({
        title:       meta.title,
        description: meta.description,
        keywords:    meta.keywords,
        slug:        meta.slug,
        canonical:   vehicleUrl,
        og: {
          title:       meta.title,
          description: meta.description,
          url:         vehicleUrl,
          type:        "product",
          locale:      "pt_BR"
        },
        twitter: {
          card:        "summary_large_image",
          title:       meta.title,
          description: meta.description
        }
      })

    } catch (err) {
      logger.error({ err }, "❌ Erro ao gerar meta tags")
      res.status(500).json({ error: "Erro interno" })
    }
  }

  // ─── GET /seo/audit ───────────────────────────────────────────────────────
  // Privado — auditoria SEO do tenant autenticado

  audit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { dealership_id } = (req as any).user

      const result = await this.seoService.auditSeo(dealership_id)

      res.json({
        success: true,
        data: result,
        message: result.coveragePercent === 100
          ? "✅ Todos os veículos têm SEO configurado"
          : `⚠️ ${result.missingSeo} veículo(s) sem SEO — use POST /seo/generate para corrigir`
      })

    } catch (err) {
      logger.error({ err }, "❌ Erro na auditoria SEO")
      next(err)
    }
  }

  // ─── POST /seo/generate ───────────────────────────────────────────────────
  // Privado — geração em massa de SEO para veículos sem dados

  bulkGenerate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { dealership_id } = (req as any).user

      logger.info(`🔍 SEO bulk generate iniciado para dealership ${dealership_id}`)

      const result = await this.seoService.bulkGenerate(dealership_id)

      res.json({
        success: true,
        data:    result,
        message: `✅ ${result.generated} veículo(s) com SEO gerado` +
                 (result.errors > 0 ? ` | ⚠️ ${result.errors} erro(s)` : "")
      })

    } catch (err) {
      logger.error({ err }, "❌ Erro na geração em massa de SEO")
      next(err)
    }
  }

  // ─── PUT /seo/vehicle/:vehicleId ──────────────────────────────────────────
  // Privado — atualização manual do SEO de um veículo

  updateVehicle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { dealership_id } = (req as any).user
      const vehicleId         = Number(req.params.vehicleId)

      if (!vehicleId) {
        res.status(400).json({ error: "vehicleId inválido" })
        return
      }

      const { seo_title, seo_description, seo_keywords, slug } = req.body

      const updated = await this.seoService.updateVehicleSeo(vehicleId, dealership_id, {
        seo_title,
        seo_description,
        seo_keywords,
        slug
      })

      if (!updated) {
        res.status(400).json({ error: "Nenhum campo válido para atualizar" })
        return
      }

      res.json({
        success: true,
        message: `✅ SEO do veículo ${vehicleId} atualizado com sucesso`
      })

    } catch (err) {
      logger.error({ err }, "❌ Erro ao atualizar SEO do veículo")
      next(err)
    }
  }
}
