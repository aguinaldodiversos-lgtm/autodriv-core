// src/infrastructure/seo/seo.service.ts
// ─── Motor de SEO para concessionárias ──────────────────────────────────────
// Gera meta tags, JSON-LD structured data, sitemaps XML e auditoria SEO

import { DatabaseClient } from "@/infrastructure/db/client"
import { logger }         from "@/infrastructure/logger/logger"

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface VehicleRow {
  id:              number
  dealership_id:   number
  title:           string
  brand:           string | null
  model:           string | null
  year:            number | null
  price:           number | null
  status:          string
  slug:            string | null
  seo_title:       string | null
  seo_description: string | null
  seo_keywords:    string | null
  seo_schema:      object | null
  created_at:      string
}

export interface DealershipRow {
  id:      number
  name:    string
  slug:    string | null
  city:    string | null
  state:   string | null
  phone:   string | null
}

export interface VehicleMeta {
  title:       string
  description: string
  keywords:    string
  slug:        string
}

export interface StructuredDataVehicle {
  "@context":        string
  "@type":           string
  name:              string
  description:       string
  brand:             { "@type": string; name: string }
  model:             string
  vehicleModelDate:  string
  vehicleIdentificationNumber?: string
  offers:            {
    "@type":          string
    price:            string
    priceCurrency:    string
    availability:     string
    seller:           { "@type": string; name: string }
  }
  image?:            string
  url?:              string
}

export interface SeoAuditResult {
  totalVehicles:    number
  withSeo:          number
  missingSeo:       number
  coveragePercent:  number
  missingList:      { id: number; title: string; brand: string | null; model: string | null }[]
}

export interface SeoGenerateResult {
  generated: number
  skipped:   number
  errors:    number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
}

function buildVehicleSlug(vehicle: VehicleRow): string {
  const parts = [
    vehicle.brand ?? "veiculo",
    vehicle.model ?? "seminovo",
    vehicle.year?.toString() ?? "",
    vehicle.id.toString()
  ].filter(Boolean)
  return slugify(parts.join("-"))
}

// ─── SEO Service ─────────────────────────────────────────────────────────────

export class SeoService {

  constructor(private db: DatabaseClient) {}

  // ─── Meta tags ──────────────────────────────────────────────────────────

  generateMeta(
    vehicle:    VehicleRow,
    dealership: DealershipRow
  ): VehicleMeta {

    const brand  = vehicle.brand  ?? "Seminovo"
    const model  = vehicle.model  ?? "Veículo"
    const year   = vehicle.year   ?? ""
    const price  = vehicle.price
      ? `R$ ${Number(vehicle.price).toLocaleString("pt-BR")}`
      : "Consulte o preço"
    const city   = dealership.city  ?? "sua cidade"
    const state  = dealership.state ?? ""
    const dealer = dealership.name

    const title = `${brand} ${model} ${year} à venda | ${dealer}`

    const description =
      `Compre ${brand} ${model} ${year} por ${price} na ${dealer}` +
      (city ? ` em ${city}${state ? `/${state}` : ""}` : "") +
      `. Veículo revisado, com procedência e pronto para transferência. ` +
      `Confira nosso estoque completo de seminovos.`

    const keywords = [
      brand, model, String(year),
      "seminovo", "usado", "comprar carro",
      dealer, city, state,
      `${brand} ${model}`, `comprar ${brand}`,
      "financiamento", "troca aceita"
    ].filter(Boolean).join(", ")

    const slug = vehicle.slug ?? buildVehicleSlug(vehicle)

    return { title, description, keywords, slug }
  }

  // ─── JSON-LD Structured Data ─────────────────────────────────────────────

  generateStructuredData(
    vehicle:    VehicleRow,
    dealership: DealershipRow,
    baseUrl:    string
  ): StructuredDataVehicle {

    const meta = this.generateMeta(vehicle, dealership)
    const url  = `${baseUrl}/veiculos/${meta.slug}`

    return {
      "@context":       "https://schema.org",
      "@type":          "Car",
      name:             `${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
      description:      meta.description,
      brand:            { "@type": "Brand", name: vehicle.brand ?? "" },
      model:            vehicle.model ?? "",
      vehicleModelDate: String(vehicle.year ?? ""),
      offers:           {
        "@type":       "Offer",
        price:         String(vehicle.price ?? 0),
        priceCurrency: "BRL",
        availability:  vehicle.status === "available"
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
        seller: {
          "@type": "AutoDealer",
          name:    dealership.name
        }
      },
      url
    }
  }

  // ─── Sitemap XML ─────────────────────────────────────────────────────────

  generateSitemapXml(
    vehicles:   VehicleRow[],
    dealership: DealershipRow,
    baseUrl:    string
  ): string {

    const urls = vehicles.map(v => {
      const slug    = v.slug ?? buildVehicleSlug(v)
      const loc     = `${baseUrl}/veiculos/${slug}`
      const lastmod = v.created_at
        ? new Date(v.created_at).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]

      return `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    })

    // Página inicial da loja
    const homeUrl = `
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${homeUrl}
${urls.join("\n")}
</urlset>`
  }

  // ─── Robots.txt ──────────────────────────────────────────────────────────

  generateRobotsTxt(baseUrl: string): string {
    return [
      "User-agent: *",
      "Allow: /",
      "Disallow: /api/",
      "Disallow: /admin/",
      "",
      `Sitemap: ${baseUrl}/sitemap.xml`,
    ].join("\n")
  }

  // ─── DB: buscar veículos de um dealer por slug ───────────────────────────

  async getDealershipBySlug(slug: string): Promise<DealershipRow | null> {
    const rows = await this.db.query<DealershipRow>({
      text:   `SELECT id, name, slug, city, state, phone
               FROM dealerships
               WHERE slug = $1
               LIMIT 1`,
      params: [slug]
    })
    return rows[0] ?? null
  }

  async getDealershipById(id: number): Promise<DealershipRow | null> {
    const rows = await this.db.query<DealershipRow>({
      text:   `SELECT id, name, slug, city, state, phone
               FROM dealerships
               WHERE id = $1
               LIMIT 1`,
      params: [id]
    })
    return rows[0] ?? null
  }

  async getAvailableVehicles(dealershipId: number): Promise<VehicleRow[]> {
    return this.db.query<VehicleRow>({
      text: `SELECT id, dealership_id, title, brand, model, year, price, status,
                    slug, seo_title, seo_description, seo_keywords, seo_schema, created_at
             FROM   vehicles
             WHERE  dealership_id = $1
             AND    status = 'available'
             ORDER  BY created_at DESC`,
      params: [dealershipId]
    })
  }

  async getVehicleById(vehicleId: number, dealershipId: number): Promise<VehicleRow | null> {
    const rows = await this.db.query<VehicleRow>({
      text: `SELECT id, dealership_id, title, brand, model, year, price, status,
                    slug, seo_title, seo_description, seo_keywords, seo_schema, created_at
             FROM   vehicles
             WHERE  id = $1
             AND    dealership_id = $2
             LIMIT  1`,
      params: [vehicleId, dealershipId]
    })
    return rows[0] ?? null
  }

  // ─── Auditoria SEO ───────────────────────────────────────────────────────

  async auditSeo(dealershipId: number): Promise<SeoAuditResult> {

    const all = await this.db.query<{
      id: number
      title: string
      brand: string | null
      model: string | null
      has_seo: boolean
    }>({
      text: `SELECT id, title, brand, model,
                    (seo_title IS NOT NULL) AS has_seo
             FROM   vehicles
             WHERE  dealership_id = $1
             AND    status = 'available'
             ORDER  BY created_at DESC`,
      params: [dealershipId]
    })

    const withSeo     = all.filter(v => v.has_seo).length
    const missingList = all
      .filter(v => !v.has_seo)
      .map(v => ({ id: v.id, title: v.title, brand: v.brand, model: v.model }))

    return {
      totalVehicles:   all.length,
      withSeo,
      missingSeo:      missingList.length,
      coveragePercent: all.length > 0
        ? Math.round((withSeo / all.length) * 100)
        : 100,
      missingList
    }
  }

  // ─── Geração em massa ────────────────────────────────────────────────────

  async bulkGenerate(dealershipId: number): Promise<SeoGenerateResult> {

    const dealership = await this.getDealershipById(dealershipId)

    if (!dealership) {
      return { generated: 0, skipped: 0, errors: 1 }
    }

    const vehicles = await this.db.query<VehicleRow>({
      text: `SELECT id, dealership_id, title, brand, model, year, price, status,
                    slug, seo_title, seo_description, seo_keywords, seo_schema, created_at
             FROM   vehicles
             WHERE  dealership_id = $1
             AND    seo_title IS NULL`,
      params: [dealershipId]
    })

    let generated = 0
    let errors    = 0
    const skipped = 0

    for (const vehicle of vehicles) {
      try {
        const meta   = this.generateMeta(vehicle, dealership)
        const schema = this.generateStructuredData(vehicle, dealership, "")

        await this.db.query({
          text: `UPDATE vehicles
                 SET    seo_title       = $1,
                        seo_description = $2,
                        seo_keywords    = $3,
                        seo_schema      = $4,
                        slug            = COALESCE(slug, $5)
                 WHERE  id = $6`,
          params: [
            meta.title,
            meta.description,
            meta.keywords,
            JSON.stringify(schema),
            meta.slug,
            vehicle.id
          ]
        })

        generated++
      } catch (err) {
        logger.error({ err }, `❌ SEO generation failed for vehicle ${vehicle.id}`)
        errors++
      }
    }

    logger.info(`✅ SEO bulk generate: ${generated} generated, ${errors} errors`)

    return { generated, skipped, errors }
  }

  // ─── Update individual ───────────────────────────────────────────────────

  async updateVehicleSeo(
    vehicleId:    number,
    dealershipId: number,
    data: {
      seo_title?:       string
      seo_description?: string
      seo_keywords?:    string
      slug?:            string
    }
  ): Promise<boolean> {

    const sets:   string[]  = []
    const params: unknown[] = []
    let   idx = 1

    if (data.seo_title)       { sets.push(`seo_title = $${idx++}`);       params.push(data.seo_title) }
    if (data.seo_description) { sets.push(`seo_description = $${idx++}`); params.push(data.seo_description) }
    if (data.seo_keywords)    { sets.push(`seo_keywords = $${idx++}`);    params.push(data.seo_keywords) }
    if (data.slug)            { sets.push(`slug = $${idx++}`);            params.push(data.slug) }

    if (sets.length === 0) return false

    params.push(vehicleId, dealershipId)

    await this.db.query({
      text:   `UPDATE vehicles
               SET    ${sets.join(", ")}
               WHERE  id = $${idx++} AND dealership_id = $${idx}`,
      params
    })

    return true
  }
}
