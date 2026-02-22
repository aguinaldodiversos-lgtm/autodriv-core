import { EventHandler } from "@/infrastructure/event-bus/event.handler"
import { DomainEvent } from "@/infrastructure/event-bus/event.types"
import { DecisionEngine } from "./decision.engine"

export class DecisionHandler implements EventHandler {

  eventName = "sale.completed"

  constructor(
    private decisionEngine: DecisionEngine
  ) {}

  async handle(event: DomainEvent): Promise<void> {

    const decision =
      await this.decisionEngine.evaluate(event.payload)

    if (decision.adjustBudget) {
      // disparar evento de marketing
    }

    if (decision.reducePrice) {
      // disparar evento vehicle.updated
    }
  }
}
