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

  /**
   * 📌 Registrar handler
   */
  register(handler: EventHandler): void {
    this.handlers.push(handler)

    logger.info(
      `📌 Handler registered for event: ${handler.eventName}`
    )
  }

  /**
   * 🚀 Publicação oficial de evento
   * - Valida idempotência
   * - Persiste no event_store
   * - Executa handlers
   * - Marca como processado
   */
  async publish<T = any>(
    event: DomainEvent<T>
  ): Promise<void> {

    try {

      /**
       * 1️⃣ Idempotência
       */
      const alreadyProcessed =
        await this.eventStore.isProcessed(event.id)

      if (alreadyProcessed) {
        logger.warn(
          `⚠️ Event already processed: ${event.name} | ${event.id}`
        )
        return
      }

      /**
       * 2️⃣ Persistência (Event Sourcing)
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

      return
    }

    /**
     * 3️⃣ Executar handlers
     */
    const execution =
      await this.executeHandlersOnly(event)

    if (!execution.success) {
      logger.error(
        `❌ Event not marked as processed because ${execution.failedHandlers.length} handler(s) failed (${execution.failedHandlers.join(", ")}) for event: ${event.id}`
      )
      return
    }

    /**
     * 4️⃣ Marcar como processado
     */
    try {

      await this.eventStore.markProcessed(event.id)

      logger.info(
        `✔ Event marked as processed: ${event.id}`
      )

    } catch (error) {

      logger.error(
        `❌ Failed to mark event as processed: ${event.id}`,
        error
      )
    }
  }

  /**
   * 🔁 Replay seguro
   * - Não persiste novamente
   * - Não valida idempotência
   * - Apenas executa handlers
   */
  async replay<T = any>(
    event: DomainEvent<T>
  ): Promise<void> {

    logger.info(
      `🔁 Replaying event: ${event.name} | ${event.id}`
    )

    const execution =
      await this.executeHandlersOnly(event)

    if (!execution.success) {
      logger.warn(
        `⚠️ Replay finished with handler failures for event: ${event.id}`
      )
    }
  }

  /**
   * 🔥 Execução interna de handlers
   */
  private async executeHandlersOnly<T = any>(
    event: DomainEvent<T>
  ): Promise<{
    success: boolean
    failedHandlers: string[]
  }> {

    const matchingHandlers =
      this.handlers.filter(handler =>
        handler.eventName === event.name ||
        handler.eventName === "*"
      )

    if (matchingHandlers.length === 0) {

      logger.warn(
        `⚠️ No handlers found for event: ${event.name}`
      )

      return {
        success: true,
        failedHandlers: []
      }
    }

    const failedHandlers: string[] = []

    await Promise.all(
      matchingHandlers.map(handler =>
        this.queue.add(async () => {

          const start = Date.now()

          try {

            await handler.handle(event)

            const duration = Date.now() - start

            logger.info(
              `✅ Handler executed: ${handler.constructor.name} | ${duration}ms`
            )

          } catch (error) {
            failedHandlers.push(
              handler.constructor.name
            )

            logger.error(
              `❌ Handler error: ${handler.constructor.name}`,
              error
            )
          }
        })
      )
    )

    return {
      success: failedHandlers.length === 0,
      failedHandlers
    }
  }

  /**
   * 📊 Monitoramento de fila
   */
  getQueueSize(): number {
    return this.queue.size
  }

  async drain(): Promise<void> {
    await this.queue.onIdle()
  }
}
