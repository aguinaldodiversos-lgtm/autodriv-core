import { DatabaseClient } from "@/infrastructure/db/client"

export class EventualConsistencyMonitor {
  constructor(private db: DatabaseClient) {}

  async checkLag(
    projection: string,
    aggregateId: string,
    tenantId: string
  ) {
    const latest = await this.db.query({
      text: `
        SELECT MAX(version) as version
        FROM event_store
        WHERE aggregate_id = $1
      `,
      params: [aggregateId],
    })

    const offset = await this.db.query({
      text: `
        SELECT last_event_version
        FROM projection_offsets
        WHERE projection_name = $1
        AND tenant_id = $2
      `,
      params: [projection, tenantId],
    })

    const lag =
      (latest[0]?.version || 0) -
      (offset[0]?.last_event_version || 0)

    return lag
  }
}
