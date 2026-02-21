import { DatabaseClient } from "@/infrastructure/db/client"

export class StockReadModel {
  constructor(private db: DatabaseClient) {}

  async rebuild(tenantId: string) {
    const rows = await this.db.query({
      text: `
        SELECT COUNT(*) as total,
               AVG(price - cost) as avg_margin
        FROM vehicles
        WHERE tenant_id = $1
      `,
      params: [tenantId],
    })

    await this.db.query({
      text: `
        INSERT INTO stock_read_model
        (tenant_id, total_vehicles, avg_margin, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (tenant_id)
        DO UPDATE SET
          total_vehicles = $2,
          avg_margin = $3,
          updated_at = NOW()
      `,
      params: [
        tenantId,
        rows[0].total,
        rows[0].avg_margin,
      ],
    })
  }
}
