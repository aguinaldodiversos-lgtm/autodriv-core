import { DatabaseClient } from "@/infrastructure/db/client"
import { DomainEvent } from "./event.types"

export class EventStore {

  constructor(private db: DatabaseClient) {}

  async persist(event: DomainEvent) {
    await this.db.query({
      text: `
        INSERT INTO event_store
        (id, tenant_id, event_name, payload, occurred_at)
        VALUES ($1,$2,$3,$4,$5)
      `,
      params: [
        event.id,
        event.tenantId,
        event.name,
        JSON.stringify(event.payload),
        event.occurredAt
      ]
    })
  }
}
