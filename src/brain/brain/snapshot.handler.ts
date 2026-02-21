import { EventHandler } from "@/infrastructure/event-bus/event.handler"
import { DomainEvent } from "@/infrastructure/event-bus/event.types"
import { RevenueSnapshotRepository } from "@/infrastructure/db/repositories/revenue-snapshot.repository"
import { RevenueIntelligenceCore } from "./revenue-intelligence.core"

export class SnapshotHandler implements EventHandler {

  eventName = "sale.completed"

  constructor(
    private repo: RevenueSnapshotRepository,
    private revenue: RevenueIntelligenceCore
  ) {}

  async handle(event: DomainEvent): Promise<void> {

    const revenueResult =
      this.revenue.evaluateSystem(event.payload)

    await this.repo.save({
      tenantId: event.tenantId,
      vehicleScore: revenueResult.vehicleScore,
      leadScore: revenueResult.leadScore,
      channelScore: revenueResult.channelScore,
      globalHealth: revenueResult.globalHealth,
      createdAt: new Date()
    })
  }
}
