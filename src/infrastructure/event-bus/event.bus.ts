// src/infrastructure/event-bus/event.bus.ts

import PQueue from "p-queue"
import { DomainEvent } from "./event.types"
import { EventHandler } from "./event.handler"
import { EventStore } from "./event.store"
import { logger } from "@/infrastructure/logger/logger"

export class EventBus {

  private handlers: EventHandler[] = []
  private queue: PQueue

  constructor(
    private eventStore: EventStore,
    concurrency: number = 20
  ) {
    this.queue = new PQueue({
      concurrency,
      autoStart: true
    })
  }

  register(handler: EventHandler): void {
    this.handlers.push(handler)
  }

  async publish<T = any>(
    event: DomainEvent<T>
  ): Promise<void> {

    try {

      /**
       * 🔥 1️⃣ Persistir evento antes de qualquer execução
       */
      await this.eventStore.persist(event)

      logger.info(
        `📤 Event persisted: ${event.name} | Tenant: ${event.tenantId}`
      )

    } catch (error) {

      logger.error(
        `❌ Failed to persist event: ${event.name}`,
        error
      )

      // Se não persistir, não executa handlers
      return
    }

    /**
     * 🔥 2️⃣ Executar handlers assincronamente
     */
    const matchingHandlers =
      this.handlers.filter(handler =>
        handler.eventName === event.name ||
        handler.eventName === "*"
      )

    await Promise.all(
      matchingHandlers.map(handler =>
        this.queue.add(async () => {
          try {
            await handler.handle(event)
          } catch (error) {
            logger.error(
              `❌ Handler error: ${handler.constructor.name}`,
              error
            )
          }
        })
      )
    )
  }
}
