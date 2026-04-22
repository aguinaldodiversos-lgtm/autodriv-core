// src/brain/marketing/marketing.handler.ts

import { EventHandler } from "@/infrastructure/event-bus/event.handler"
import { DomainEvent } from "@/infrastructure/event-bus/event.types"
import { MarketingSuperEngine } from "./campaign.engine"
import { logger } from "@/infrastructure/logger/logger"

export class MarketingHandler implements EventHandler {

  eventName = "snapshot.generated"

  constructor(
    private marketing: MarketingSuperEngine
  ) {}

  async handle(event: DomainEvent): Promise<void> {

    try {

      const result = await this.marketing.execute(
        event.tenantId,
        event.payload?.totalBudget ?? 0,
        event.payload?.campaigns   ?? []
      )

      logger.info(
        `📈 Marketing Handler | ${result.length} campanhas avaliadas para tenant ${event.tenantId}`
      )

    } catch (error) {

      logger.error({ err: error }, "❌ Marketing Handler falhou")
    }
  }
}
