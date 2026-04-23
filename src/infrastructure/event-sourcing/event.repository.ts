import { DatabaseClient } from "@/infrastructure/db/client"
import { randomUUID } from "crypto"

export class EventRepository {
  constructor(private db: DatabaseClient) {}

  async save(
    aggregateId: string,
    aggregateType: string,
    events: any[],
    version: number,
    tenantId: string
  ) {
    let currentVersion = version

    for (const event of events) {
      currentVersion++

      await this.db.query({
        text: `
          INSERT INTO event_store
          (id, aggregate_id, aggregate_type, version, event_name, payload, tenant_id, occurred_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        params: [
          randomUUID(),
          aggregateId,
          aggregateType,
          currentVersion,
          event.name,
          JSON.stringify(event.payload),
          tenantId,
          new Date(),
        ],
      })
    }
  }

  async load(aggregateId: string) {
    const rows = await this.db.query<any>({
      text: `
        SELECT * FROM event_store
        WHERE aggregate_id = $1
        ORDER BY version ASC
      `,
      params: [aggregateId],
    })

    return rows.map((row) => ({
      ...row,
      name: row.event_name ?? row.name,
    }))
  }
}
