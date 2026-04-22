// src/brain/stock/stock.engine.ts
// Análise de estoque: giro, capital imobilizado, sugestão de desova

import { DatabaseClient } from "@/infrastructure/db/client"
import { logger } from "@/infrastructure/logger/logger"

export interface StockAnalysis {
  giroPorFaixa:      GiroPorFaixa[]
  diasMediosEstoque: number
  capitalTravado:    number
  sugestaoDesova:    string[]   // ids de veículos candidatos a desova
  totalVeiculos:     number
  alertas:           string[]
}

interface GiroPorFaixa {
  faixa:      string
  total:      number
  diasMedios: number
}

export class StockIntelligenceEngine {

  constructor(private db: DatabaseClient) {}

  async analyze(tenantId: string): Promise<StockAnalysis> {

    logger.info(`📦 Stock Engine | Analisando estoque do tenant ${tenantId}`)

    const vehicles = await this.db.query<any>({
      text: `
        SELECT id, price, cost, entry_date, brand, model
        FROM vehicles
        WHERE dealership_id = $1
          AND status = 'available'
      `,
      params: [tenantId]
    })

    if (vehicles.length === 0) {
      return {
        giroPorFaixa:      [],
        diasMediosEstoque: 0,
        capitalTravado:    0,
        sugestaoDesova:    [],
        totalVeiculos:     0,
        alertas:           ["Estoque vazio"]
      }
    }

    const now = new Date()
    const faixas: Record<string, { total: number; somaDias: number }> = {}
    let capitalTravado = 0
    let somaDias = 0

    const sugestaoDesova: string[] = []
    const alertas: string[] = []

    for (const v of vehicles) {
      const dias = (now.getTime() - new Date(v.entry_date).getTime()) / 86_400_000

      const faixa =
        v.price < 30_000  ? "0-30k"   :
        v.price < 60_000  ? "30-60k"  :
        v.price < 100_000 ? "60-100k" : "100k+"

      if (!faixas[faixa]) faixas[faixa] = { total: 0, somaDias: 0 }

      faixas[faixa].total++
      faixas[faixa].somaDias += dias

      capitalTravado += Number(v.cost ?? v.price * 0.85)
      somaDias += dias

      if (dias > 60) sugestaoDesova.push(v.id)
      if (dias > 90) alertas.push(`${v.brand} ${v.model} (${v.id}) há ${Math.round(dias)} dias parado`)
    }

    const giroPorFaixa: GiroPorFaixa[] = Object.entries(faixas).map(
      ([faixa, data]) => ({
        faixa,
        total:      data.total,
        diasMedios: data.somaDias / data.total
      })
    )

    const diasMediosEstoque = somaDias / vehicles.length

    if (diasMediosEstoque > 45)
      alertas.push(`Giro médio acima de 45 dias — revisar estratégia de precificação`)

    logger.info(
      `✅ Stock Engine | ${vehicles.length} veículos | capital travado: R$ ${capitalTravado.toFixed(2)}`
    )

    return {
      giroPorFaixa,
      diasMediosEstoque,
      capitalTravado,
      sugestaoDesova,
      totalVeiculos: vehicles.length,
      alertas
    }
  }
}
