import { LeadRepository } from "@/infrastructure/db/repositories/lead.repository"
import { EventBus } from "@/infrastructure/event-bus/event.bus"
import { DomainEvents } from "@/domain/events/domain-events"
import { randomUUID } from "crypto"

export class CreateLeadUseCase {

  constructor(
    private leadRepo: LeadRepository,
    private eventBus: EventBus
  ) {}

  async execute(data: any) {

    const lead = {
      id: randomUUID(),
      tenantId: data.tenantId,
      name: data.name,
      phone: data.phone,
      message: data.message,
      source: data.source,
      status: "NEW",
      createdAt: new Date()
    }

    await this.leadRepo.save(lead)

    await this.eventBus.publish({
      id: randomUUID(),
      name: DomainEvents.LeadCreated,
      tenantId: lead.tenantId,
      payload: lead,
      occurredAt: new Date()
    })

    return lead
  }
}
