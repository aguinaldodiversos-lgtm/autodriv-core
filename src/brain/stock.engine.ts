// src/brain/stock.engine.ts

import { DatabaseClient } from "@/infrastructure/db/client"

export class StockIntelligenceEngine {
  constructor(private db: DatabaseClient) {}

  async analyze(tenantId: string) {
    const vehicles = await this.db.query({
      text: `
        SELECT id, price, cost, entry_date
        FROM vehicles
        WHERE tenant_id = $1 AND status = 'available'
      `,
      params: [tenantId]
    })

    const now = new Date()

    const faixas: Record<string, any> = {}
    let capitalTravado = 0
    let somaDias = 0

    for (const v of vehicles) {
      const dias =
        (now.getTime() - new Date(v.entry_date).getTime()) /
        (1000 * 60 * 60 * 24)

      const faixa =
        v.price < 30000
          ? "0-30k"
          : v.price < 60000
          ? "30-60k"
          : v.price < 100000
          ? "60-100k"
          : "100k+"

      if (!faixas[faixa]) {
        faixas[faixa] = {
          total: 0,
          somaDias: 0
        }
      }

      faixas[faixa].total++
      faixas[faixa].somaDias += dias

      capitalTravado += Number(v.cost)
      somaDias += dias
    }

    const giroPorFaixa = Object.entries(faixas).map(
      ([faixa, data]: any) => ({
        faixa,
        diasMedios: data.somaDias / data.total,
        total: data.total
      })
    )

    const diasMediosEstoque =
      somaDias / (vehicles.length || 1)

    const sugestaoDesova = vehicles
      .filter(v => {
        const dias =
          (now.getTime() -
            new Date(v.entry_date).getTime()) /
          (1000 * 60 * 60 * 24)
        return dias > 60
      })
      .map(v => v.id)

    return {
      giroPorFaixa,
      diasMediosEstoque,
      capitalTravado,
      sugestaoDesova
    }
  }
}
