// src/brain/base.engine.ts

import { EventHandler } from "@/infrastructure/event-bus/event.handler"
import { DomainEvent } from "@/infrastructure/event-bus/event.types"
import { DatabaseClient } from "@/infrastructure/db/client"
import { EventBus } from "@/infrastructure/event-bus/event.bus"
import { logger } from "@/infrastructure/logger/logger"
import {
  recordExecution,
  recordFailure,
} from "@/infrastructure/metrics/engine.metrics"
import { tracer } from "@/infrastructure/observability/tracer"

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

    const span = tracer.startSpan(engineName)

    try {
      recordExecution(engineName)

      span.setAttribute("engine.name", engineName)
      span.setAttribute("event.name", event.name)
      span.setAttribute("tenant.id", event.tenantId)

      logger.info({
        engine: engineName,
        event: event.name,
        tenant: event.tenantId,
      })

      await this.execute(event)

      span.setStatus({ code: 1 }) // OK
    } catch (err: any) {
      recordFailure(engineName)

      span.recordException(err)
      span.setStatus({
        code: 2,
        message: err?.message,
      })

      logger.error({
        engine: engineName,
        error: err,
      })

      throw err
    } finally {
      span.end()
    }
  }

  protected abstract execute(
    event: DomainEvent
  ): Promise<void>
}
