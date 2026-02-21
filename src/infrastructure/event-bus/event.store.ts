// src/infrastructure/event-bus/event.store.ts

import { DatabaseClient } from "@/infrastructure/db/client"
import { DomainEvent } from "./event.types"
import { randomUUID } from "crypto"

export class EventStore {
  constructor(private db: DatabaseClient) {}

  async append(event: DomainEvent): Promise<void> {
    await this.db.query({
      text: `
        INSERT INTO domain_events (
          id,
          name,
          payload,
          tenant_id,
          occurred_at
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `,
      params: [
        event.id ?? randomUUID(),
        event.name,
        JSON.stringify(event.payload),
        event.tenantId,
        event.occurredAt,
      ],
    })
  }

  async exists(eventId: string): Promise<boolean> {
    const rows = await this.db.query({
      text: `SELECT 1 FROM domain_events WHERE id = $1`,
      params: [eventId],
    })

    return rows.length > 0
  }

  async getByTenant(tenantId: string) {
    const rows = await this.db.query({
      text: `
        SELECT id, name, payload, tenant_id, occurred_at
        FROM domain_events
        WHERE tenant_id = $1
        ORDER BY occurred_at ASC
      `,
      params: [tenantId],
    })

    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      payload: JSON.parse(r.payload),
      tenantId: r.tenant_id,
      occurredAt: new Date(r.occurred_at),
    }))
  }
}
