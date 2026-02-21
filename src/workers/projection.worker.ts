import { EventRepository } from "@/infrastructure/event-sourcing/event.repository"
import { LeadProjection } from "@/projections/lead.projection"

export class ProjectionWorker {
  constructor(
    private repo: EventRepository,
    private projection: LeadProjection
  ) {}

  async run(aggregateId: string) {
    const events = await this.repo.load(aggregateId)

    for (const event of events) {
      await this.projection.project(event)
    }
  }
}
