import { DatabaseClient } from "@/infrastructure/db/client"

export class LeadProjection {
  constructor(private db: DatabaseClient) {}

  async project(event: any) {
    if (event.name === "LeadCreated") {
      await this.db.query({
        text: `
          INSERT INTO leads_read_model
          (id, name, tenant_id)
          VALUES ($1,$2,$3)
        `,
        params: [
          event.payload.leadId,
          event.payload.name,
          event.tenantId,
        ],
      })
    }
  }
}
