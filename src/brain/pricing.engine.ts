// src/brain/pricing.engine.ts

import { DatabaseClient } from "@/infrastructure/db/client"

export class PricingIntelligenceEngine {
  constructor(private db: DatabaseClient) {}

  async analyze(vehicleId: string, tenantId: string) {
    const vehicle = await this.db.query({
      text: `
        SELECT price, cost, model
        FROM vehicles
        WHERE id = $1 AND tenant_id = $2
      `,
      params: [vehicleId, tenantId]
    })

    const marketAvg = await this.db.query({
      text: `
        SELECT AVG(price) as avg
        FROM vehicles
        WHERE model = $1 AND tenant_id != $2
      `,
      params: [vehicle[0].model, tenantId]
    })

    const precoIdeal = marketAvg[0]?.avg || vehicle[0].price
    const margemAtual =
      vehicle[0].price - vehicle[0].cost

    const margemSegura =
      vehicle[0].cost * 0.08

    const elasticidade =
      (vehicle[0].price - precoIdeal) /
      (precoIdeal || 1)

    return {
      precoAtual: vehicle[0].price,
      precoIdeal,
      margemAtual,
      margemSegura,
      elasticidade,
      precisaAjustar:
        margemAtual < margemSegura ||
        elasticidade > 0.1
    }
  }
}
