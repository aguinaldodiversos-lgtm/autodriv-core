import { DatabaseClient } from "@/infrastructure/db/client"
import { VectorClock, incrementClock } from "./vector-clock"
import { randomUUID } from "crypto"

export class ActiveActiveRepository {
  constructor(
    private db: DatabaseClient,
    private region: string
  ) {}

  async save(
    aggregateId: string,
    tenantId: string,
    event: any,
    clock: VectorClock
  ) {
    const newClock = incrementClock(clock, this.region)

    await this.db.query({
      text: `
        INSERT INTO global_event_store
        (id, aggregate_id, region, version, vector_clock, name, payload, tenant_id, occurred_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `,
      params: [
        randomUUID(),
        aggregateId,
        this.region,
        Date.now(),
        JSON.stringify(newClock),
        event.name,
        JSON.stringify(event.payload),
        tenantId,
        new Date()
      ]
    })

    return newClock
  }
}
