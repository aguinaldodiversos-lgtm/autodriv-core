import { EventHandler } from "@/infrastructure/event-bus/event.handler"
import { DomainEvent } from "@/infrastructure/event-bus/event.types"
import { DatabaseClient } from "@/infrastructure/db/client"
import { EventBus } from "@/infrastructure/event-bus/event.bus"
import { logger } from "@/infrastructure/logger/logger"
import {
  recordExecution,
  recordFailure,
} from "@/infrastructure/metrics/engine.metrics"

export abstract class BaseEngine implements EventHandler {
  abstract eventName: string

  protected db: DatabaseClient
  protected eventBus: EventBus

  constructor(db: DatabaseClient, eventBus: EventBus) {
    this.db = db
    this.eventBus = eventBus
  }

  async handle(event: DomainEvent): Promise<void> {
    const engineName = this.constructor.name

    try {
      recordExecution(engineName)

      logger.info({
        engine: engineName,
        event: event.name,
        tenant: event.tenantId,
      })

      await this.execute(event)
    } catch (err) {
      recordFailure(engineName)

      logger.error({
        engine: engineName,
        error: err,
      })

      throw err
    }
  }

  protected abstract execute(event: DomainEvent): Promise<void>
}
