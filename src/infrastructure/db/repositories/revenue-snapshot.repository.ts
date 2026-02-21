import { RevenueSnapshot } from "@/domain/entities/revenue-snapshot"
import { DatabaseClient } from "../client"

export class RevenueSnapshotRepository {

  constructor(private db: DatabaseClient) {}

  async save(snapshot: RevenueSnapshot) {
    await this.db.query({
      text: `
        INSERT INTO revenue_snapshots
        (tenant_id, vehicle_score, lead_score, channel_score, global_health, created_at)
        VALUES ($1,$2,$3,$4,$5,$6)
      `,
      params: [
        snapshot.tenantId,
        snapshot.vehicleScore,
        snapshot.leadScore,
        snapshot.channelScore,
        snapshot.globalHealth,
        snapshot.createdAt
      ]
    })
  }
}
