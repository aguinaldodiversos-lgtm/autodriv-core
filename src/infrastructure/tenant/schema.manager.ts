// src/infrastructure/tenant/schema.manager.ts

import { DatabaseClient } from "@/infrastructure/db/client"

export class SchemaManager {
  constructor(private db: DatabaseClient) {}

  async ensureSchema(tenantId: string) {
    await this.db.query({
      text: `CREATE SCHEMA IF NOT EXISTS tenant_${tenantId}`
    })
  }

  async setTenantSchema(tenantId: string) {
    await this.db.query({
      text: `SET search_path TO tenant_${tenantId}`
    })
  }
}
