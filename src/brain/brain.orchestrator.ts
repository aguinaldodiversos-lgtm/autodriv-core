// src/brain/brain.orchestrator.ts

import { RevenueIntelligenceCore } from "./revenue/revenue.core"
import { DecisionEngine } from "./revenue/decision.engine"
import { EventBus } from "@/infrastructure/event-bus/event.bus"
import { DomainEvent } from "@/infrastructure/event-bus/event.types"
import { DomainEvents } from "@/domain/events/domain-events"

export class BrainOrchestrator {

  constructor(
    private revenue: RevenueIntelligenceCore,
    private decision: DecisionEngine,
    private eventBus: EventBus
  ) {}

  async process(event: DomainEvent) {

    const intelligence =
      this.revenue.evaluateSystem(event.payload)

    const decisions =
      await this.decision.evaluate(intelligence)

    // 🔥 Dispara eventos derivados baseados na decisão

    if (decisions.adjustBudget) {
      await this.eventBus.publish({
        id: crypto.randomUUID(),
        name: DomainEvents.CampaignUpdated,
        tenantId: event.tenantId,
        payload: { reason: "budget_adjustment" },
        occurredAt: new Date()
      })
    }

    if (decisions.reducePrice) {
      await this.eventBus.publish({
        id: crypto.randomUUID(),
        name: DomainEvents.VehicleUpdated,
        tenantId: event.tenantId,
        payload: { reason: "price_optimization" },
        occurredAt: new Date()
      })
    }

    if (decisions.prioritizeLeads) {
      await this.eventBus.publish({
        id: crypto.randomUUID(),
        name: DomainEvents.LeadUpdated,
        tenantId: event.tenantId,
        payload: { reason: "priority_increase" },
        occurredAt: new Date()
      })
    }
  }
}
