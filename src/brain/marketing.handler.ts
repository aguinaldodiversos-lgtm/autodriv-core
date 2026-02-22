import { EventHandler } from "@/infrastructure/event-bus/event.handler"
import { DomainEvent } from "@/infrastructure/event-bus/event.types"
import { MarketingSuperEngine } from "./marketing-super.engine"

export class MarketingHandler implements EventHandler {

  eventName = "snapshot.generated"

  constructor(
    private marketing: MarketingSuperEngine
  ) {}

  async handle(event: DomainEvent): Promise<void> {

    await this.marketing.execute(
      event.tenantId,
      event.payload.totalBudget
    )
  }
}
