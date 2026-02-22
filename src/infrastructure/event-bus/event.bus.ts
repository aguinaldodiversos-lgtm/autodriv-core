// src/infrastructure/event-bus/event.bus.ts

import PQueue from "p-queue"
import { DomainEvent } from "./event.types"
import { EventHandler } from "./event.handler"
import { logger } from "@/infrastructure/logger/logger"

export class EventBus {

  private handlers: EventHandler[] = []

  /**
   * Fila interna assíncrona
   * Controla concorrência e evita overload
   */
  private queue: PQueue

  constructor(concurrency: number = 20) {
    this.queue = new PQueue({
      concurrency,
      autoStart: true
    })
  }

  /**
   * Registra um handler
   */
  register(handler: EventHandler): void {
    this.handlers.push(handler)

    logger.info(
      `📌 EventHandler registered for event: ${handler.eventName}`
    )
  }

  /**
   * Publica evento
   */
  async publish<T = any>(event: DomainEvent<T>): Promise<void> {

    logger.info(
      `📤 Event published: ${event.name} | Tenant: ${event.tenantId}`
    )

    const matchingHandlers =
      this.handlers.filter(handler =>
        handler.eventName === event.name ||
        handler.eventName === "*"
      )

    if (matchingHandlers.length === 0) {
      logger.warn(
        `⚠️ No handlers found for event: ${event.name}`
      )
      return
    }

    await Promise.all(
      matchingHandlers.map(handler =>
        this.queue.add(async () => {
          try {

            const start = Date.now()

            await handler.handle(event)

            const duration = Date.now() - start

            logger.info(
              `✅ Handler executed: ${handler.constructor.name} | Event: ${event.name} | ${duration}ms`
            )

          } catch (error) {

            logger.error(
              `❌ Handler error: ${handler.constructor.name} | Event: ${event.name}`,
              error
            )

            // Não propaga erro
            // Mantém sistema resiliente
          }
        })
      )
    )
  }

  /**
   * Permite monitorar tamanho da fila
   */
  getQueueSize(): number {
    return this.queue.size
  }

  /**
   * Permite aguardar processamento total
   */
  async drain(): Promise<void> {
    await this.queue.onIdle()
  }
}
