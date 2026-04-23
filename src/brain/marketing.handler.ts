import { EventHandler } from "@/infrastructure/event-bus/event.handler"
import { DomainEvent } from "@/infrastructure/event-bus/event.types"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MarketingSuperEngine = require("./marketing-super.engine")

export class MarketingHandler implements EventHandler {

  eventName = "snapshot.generated"

  constructor(
    private marketing: InstanceType<typeof MarketingSuperEngine>
  ) {}

  async handle(event: DomainEvent): Promise<void> {

    await this.marketing.execute(
      event.tenantId,
      event.payload.totalBudget
    )
  }
}
