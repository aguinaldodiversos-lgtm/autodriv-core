// src/infrastructure/event-bus/event.store.ts

import { DatabaseClient } from "@/infrastructure/db/client"
import { DomainEvent } from "./event.types"
import { logger } from "@/infrastructure/logger/logger"

export class EventStore {

  constructor(private db: DatabaseClient) {}

  /**
   * 🔥 Persistir evento (Event Sourcing)
   */
  async persist<T = any>(event: DomainEvent<T>): Promise<void> {

    await this.db.query({
      text: `
        INSERT INTO event_store
        (id, tenant_id, event_name, payload, occurred_at)
        VALUES ($1, $2, $3, $4, $5)
      `,
      params: [
        event.id,
        event.tenantId,
        event.name,
        JSON.stringify(event.payload),
        event.occurredAt
      ]
    })

    logger.info(
      `📦 Event persisted: ${event.name} | ${event.id}`
    )
  }

  /**
   * 🔁 Replay eventos por tenant
   */
  async replayByTenant(tenantId: string): Promise<DomainEvent[]> {

    const rows = await this.db.query<any>({
      text: `
        SELECT *
        FROM event_store
        WHERE tenant_id = $1
        ORDER BY occurred_at ASC
      `,
      params: [tenantId]
    })

    return rows.map(row => ({
      id: row.id,
      name: row.event_name,
      tenantId: row.tenant_id,
      payload: row.payload,
      occurredAt: row.occurred_at
    }))
  }

  /**
   * 🔁 Replay global (todos tenants)
   */
  async replayAll(): Promise<DomainEvent[]> {

    const rows = await this.db.query<any>({
      text: `
        SELECT *
        FROM event_store
        ORDER BY occurred_at ASC
      `
    })

    return rows.map(row => ({
      id: row.id,
      name: row.event_name,
      tenantId: row.tenant_id,
      payload: row.payload,
      occurredAt: row.occurred_at
    }))
  }

  /**
   * 🛑 Verifica se evento já foi processado (idempotência)
   */
  async isProcessed(eventId: string): Promise<boolean> {

    const rows = await this.db.query({
      text: `
        SELECT 1
        FROM processed_events
        WHERE event_id = $1
        LIMIT 1
      `,
      params: [eventId]
    })

    return rows.length > 0
  }

  /**
   * ✅ Marca evento como processado
   */
  async markProcessed(eventId: string): Promise<void> {

    await this.db.query({
      text: `
        INSERT INTO processed_events
        (event_id, processed_at)
        VALUES ($1, NOW())
        ON CONFLICT (event_id) DO NOTHING
      `,
      params: [eventId]
    })
  }

  /**
   * 🧠 Persistência transacional (opcional)
   */
  async persistTransactional<T = any>(
    event: DomainEvent<T>
  ): Promise<void> {

    await this.db.query({ text: "BEGIN" })

    try {

      await this.persist(event)

      await this.db.query({ text: "COMMIT" })

    } catch (error) {

      await this.db.query({ text: "ROLLBACK" })
      logger.error({ err: error }, "❌ Event transaction failed")
      throw error
    }
  }
}
