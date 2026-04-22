// src/read-models/vehicle.view.ts
// Read Model de estoque — visão consolidada com inteligência de preço e risco

import { DatabaseClient }  from "@/infrastructure/db/client"
import { PricingEngine }   from "@/brain/stock/pricing.engine"
import { StockRiskEngine } from "@/brain/stock/risk.engine"
import { logger }          from "@/infrastructure/logger/logger"

export interface VehicleViewItem {
  id:           string
  brand:        string
  model:        string
  year:         number
  price:        number
  cost:         number
  daysInStock:  number
  status:       string
  coverImage:   string | null
  pricing: {
    suggestedPrice:  number
    discount:        number
    strategy:        string
    urgency:         string
  }
}

export interface VehicleView {
  totalAvailable:   number
  totalValue:       number
  avgDaysInStock:   number
  risk:             ReturnType<StockRiskEngine["evaluate"]>
  vehicles:         VehicleViewItem[]
  desovaAlerts:     VehicleViewItem[]   // veículos prioritários para desova
}

export class VehicleViewBuilder {

  private pricingEngine = new PricingEngine()
  private riskEngine    = new StockRiskEngine()

  constructor(private db: DatabaseClient) {}

  async build(dealershipId: string, receitaMensal: number = 0): Promise<VehicleView> {

    logger.info(`🚗 Construindo VehicleView | tenant: ${dealershipId}`)

    const vehicles = await this.db.query<any>({
      text: `
        SELECT v.*,
          COALESCE(
            (SELECT url FROM vehicle_images WHERE vehicle_id = v.id ORDER BY created_at LIMIT 1),
            null
          ) AS cover_image,
          vf.fipe_value
        FROM vehicles v
        LEFT JOIN vehicle_fipe vf ON vf.vehicle_id = v.id
        WHERE v.dealership_id = $1 AND v.status = 'available'
        ORDER BY v.entry_date ASC
      `,
      params: [dealershipId]
    })

    const now = new Date()

    const items: VehicleViewItem[] = vehicles.map((v: any) => {
      const daysInStock = v.entry_date
        ? (now.getTime() - new Date(v.entry_date).getTime()) / 86_400_000
        : 0

      const pricing = this.pricingEngine.suggest({
        vehicleId:    v.id,
        currentPrice: Number(v.price),
        fipeValue:    v.fipe_value ? Number(v.fipe_value) : undefined,
        daysInStock:  Math.round(daysInStock),
        category:     "médio"
      })

      return {
        id:          v.id,
        brand:       v.brand,
        model:       v.model,
        year:        v.year,
        price:       Number(v.price),
        cost:        Number(v.cost ?? v.price * 0.85),
        daysInStock: Math.round(daysInStock),
        status:      v.status,
        coverImage:  v.cover_image ?? null,
        pricing: {
          suggestedPrice: pricing.suggestedPrice,
          discount:       pricing.discount,
          strategy:       pricing.strategy,
          urgency:        pricing.urgency
        }
      }
    })

    const avgDays = items.length > 0
      ? items.reduce((s, v) => s + v.daysInStock, 0) / items.length
      : 0

    const totalValue = items.reduce((s, v) => s + v.cost, 0)

    const risk = this.riskEngine.evaluate({
      capitalTravado:    totalValue,
      receitaMensal,
      diasMediosEstoque: avgDays,
      totalVeiculos:     items.length,
      veiculosAcima60d:  items.filter(v => v.daysInStock > 60).length
    })

    const desovaAlerts = items
      .filter(v => v.pricing.urgency === "critical" || v.pricing.urgency === "high")
      .slice(0, 10)

    return {
      totalAvailable: items.length,
      totalValue,
      avgDaysInStock: Math.round(avgDays),
      risk,
      vehicles:       items,
      desovaAlerts
    }
  }
}
