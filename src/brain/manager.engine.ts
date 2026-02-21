// src/brain/manager.engine.ts

import { StockIntelligenceEngine } from "./stock.engine"
import { AcquisitionIntelligenceEngine } from "./acquisition.engine"
import { PricingIntelligenceEngine } from "./pricing.engine"
import { DatabaseClient } from "@/infrastructure/db/client"

export class GeneralManagerAI {
  constructor(private db: DatabaseClient) {}

  async dailyDiagnosis(tenantId: string) {
    const stock = new StockIntelligenceEngine(this.db)
    const acquisition = new AcquisitionIntelligenceEngine(this.db)

    const stockData = await stock.analyze(tenantId)
    const acquisitionData =
      await acquisition.analyze(tenantId)

    const piorFonte = acquisitionData.sort(
      (a, b) => a.roi - b.roi
    )[0]

    const vendedores = await this.db.query({
      text: `
        SELECT seller_id,
        COUNT(*) as vendas
        FROM sales
        WHERE tenant_id = $1
        GROUP BY seller_id
      `,
      params: [tenantId]
    })

    const vendedorImprodutivo =
      vendedores.sort((a, b) => a.vendas - b.vendas)[0]

    return {
      comprar:
        stockData.diasMediosEstoque < 35,
      baixarPreco: stockData.sugestaoDesova,
      pararAnuncio: piorFonte?.roi < 0,
      ondePerdeDinheiro: piorFonte,
      vendedorImprodutivo
    }
  }
}
