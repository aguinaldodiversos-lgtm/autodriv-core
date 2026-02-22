import { EventStore } from "@/infrastructure/event-bus/event.store"
import { EventBus } from "@/infrastructure/event-bus/event.bus"
import { logger } from "@/infrastructure/logger/logger"

export class ReplayTenantUseCase {

  constructor(
    private eventStore: EventStore,
    private eventBus: EventBus
  ) {}

  async execute(tenantId: string): Promise<void> {

    logger.info(`🔁 Starting replay for tenant: ${tenantId}`)

    const events =
      await this.eventStore.replayByTenant(tenantId)

    for (const event of events) {

      await this.eventBus.publish(event)

    }

    logger.info(
      `✅ Replay completed for tenant: ${tenantId} | Events: ${events.length}`
    )
  }
}
