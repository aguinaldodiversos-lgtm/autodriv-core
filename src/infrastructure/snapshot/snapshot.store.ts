import { DatabaseClient } from "@/infrastructure/db/client"

export class SnapshotStore {
  constructor(private db: DatabaseClient) {}

  async save(
    engine: string,
    tenantId: string,
    state: any
  ) {
    await this.db.query({
      text: `
        INSERT INTO engine_snapshots
        (engine_name, tenant_id, state, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (engine_name, tenant_id)
        DO UPDATE SET state = $3, updated_at = NOW()
      `,
      params: [engine, tenantId, JSON.stringify(state)],
    })
  }

  async load(engine: string, tenantId: string) {
    const rows = await this.db.query({
      text: `
        SELECT state
        FROM engine_snapshots
        WHERE engine_name = $1 AND tenant_id = $2
      `,
      params: [engine, tenantId],
    })

    return rows[0]?.state ?? null
  }
}
