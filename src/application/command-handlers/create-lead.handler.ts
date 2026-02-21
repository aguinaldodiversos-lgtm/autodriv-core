import { EventRepository } from "@/infrastructure/event-sourcing/event.repository"
import { LeadAggregate } from "@/domain/aggregates/lead.aggregate"

export class CreateLeadHandler {
  constructor(private repo: EventRepository) {}

  async execute(command: any) {
    const aggregate = new LeadAggregate(command.leadId)

    aggregate.create(command.name)

    await this.repo.save(
      command.leadId,
      "Lead",
      aggregate.getUncommittedEvents(),
      aggregate.version,
      command.tenantId
    )

    aggregate.markCommitted()
  }
}
