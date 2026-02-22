import { Lead } from "@/domain/entities/lead"
import { DatabaseClient } from "../client"

export class LeadRepository {

  constructor(private db: DatabaseClient) {}

  async save(lead: Lead): Promise<void> {
    await this.db.query({
      text: `
        INSERT INTO leads
        (id, tenant_id, name, phone, message, source, status, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      params: [
        lead.id,
        lead.tenantId,
        lead.name,
        lead.phone,
        lead.message,
        lead.source,
        lead.status,
        lead.createdAt
      ]
    })
  }
}
