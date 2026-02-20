import { BaseEngine } from "./base.engine"
import { DomainEvent } from "@/infrastructure/event-bus/event.types"

export class AcquisitionEngine extends BaseEngine {
  eventName = "lead.created"

  protected async execute(event: DomainEvent): Promise<void> {
    const { leadId } = event.payload

    const leads = await this.db.query({
      text: `
        SELECT COUNT(*) as total
        FROM leads
        WHERE tenant_id = $1
      `,
      params: [event.tenantId],
    })

    const totalLeads = Number(leads[0]?.total || 0)

    if (totalLeads > 100) {
      await this.eventBus.publish({
        name: "acquisition.threshold.reached",
        payload: { totalLeads },
        tenantId: event.tenantId,
        occurredAt: new Date(),
      })
    }
  }
}
