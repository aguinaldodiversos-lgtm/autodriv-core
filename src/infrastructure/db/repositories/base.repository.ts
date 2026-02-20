import { DatabaseClient } from "../client"
import { TenantContext } from "@/shared/types/tenant-context"

export abstract class BaseRepository {
  protected db: DatabaseClient
  protected tenantId: string

  constructor(db: DatabaseClient, context: TenantContext) {
    this.db = db
    this.tenantId = context.tenantId
  }
}
