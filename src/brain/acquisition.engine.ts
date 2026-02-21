// src/brain/acquisition.engine.ts

import { DatabaseClient } from "@/infrastructure/db/client"

export class AcquisitionIntelligenceEngine {
  constructor(private db: DatabaseClient) {}

  async analyze(tenantId: string) {
    const leads = await this.db.query({
      text: `
        SELECT source, COUNT(*) as total,
        SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as vendidos
        FROM leads
        WHERE tenant_id = $1
        GROUP BY source
      `,
      params: [tenantId]
    })

    const custos = await this.db.query({
      text: `
        SELECT source, SUM(cost) as investimento
        FROM marketing_spend
        WHERE tenant_id = $1
        GROUP BY source
      `,
      params: [tenantId]
    })

    const resultado = leads.map(l => {
      const investimento =
        custos.find(c => c.source === l.source)
          ?.investimento || 0

      const cac =
        investimento / (l.vendidos || 1)

      const roi =
        (l.vendidos * 3000 - investimento) /
        (investimento || 1)

      return {
        source: l.source,
        totalLeads: l.total,
        vendidos: l.vendidos,
        cac,
        roi
      }
    })

    return resultado
  }
}
