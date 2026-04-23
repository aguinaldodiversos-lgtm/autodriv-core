// src/application/use-cases/system/replay-tenant.usecase.ts

import { EventStore } from "@/infrastructure/event-bus/event.store"
import { EventBus } from "@/infrastructure/event-bus/event.bus"
import { logger } from "@/infrastructure/logger/logger"

export class ReplayTenantUseCase {

  constructor(
    private eventStore: EventStore,
    private eventBus: EventBus
  ) {}

  /**
   * 🔁 Reconstrói completamente o estado de um tenant
   * - Busca todos eventos ordenados
   * - Executa handlers via EventBus.replay()
   * - Não persiste novamente
   * - Não valida idempotência
   */
  async execute(tenantId: string): Promise<{
    tenantId: string
    totalEvents: number
    durationMs: number
  }> {

    const start = Date.now()

    logger.info(`🔁 Starting replay for tenant: ${tenantId}`)

    const events =
      await this.eventStore.replayByTenant(tenantId)

    logger.info(
      `📦 ${events.length} events found for tenant: ${tenantId}`
    )

    for (const event of events) {

      try {
        await this.eventBus.replay(event)
      } catch (error) {
        logger.error(
          { err: error },
          `❌ Replay failed for event ${event.id}`
        )
        // continua replay mesmo se um evento falhar
      }
    }

    const duration = Date.now() - start

    logger.info(
      `✅ Replay completed for tenant: ${tenantId} | ${events.length} events | ${duration}ms`
    )

    return {
      tenantId,
      totalEvents: events.length,
      durationMs: duration
    }
  }
}
