async publish<T = any>(
  event: DomainEvent<T>
): Promise<void> {

  try {

    /**
     * 🛑 1️⃣ Idempotência
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
     * 📦 2️⃣ Persistir evento (Event Sourcing)
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

    // Se falhar persistência, não executa handlers
    return
  }

  /**
   * 🔎 3️⃣ Selecionar handlers compatíveis
   */
  const matchingHandlers =
    this.handlers.filter(handler =>
      handler.eventName === event.name ||
      handler.eventName === "*"
    )

  if (matchingHandlers.length === 0) {

    logger.warn(
      `⚠️ No handlers found for event: ${event.name}`
    )

    await this.eventStore.markProcessed(event.id)
    return
  }

  /**
   * ⚡ 4️⃣ Executar handlers em paralelo controlado
   */
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

          logger.error(
            `❌ Handler error: ${handler.constructor.name}`,
            error
          )

          // Não interrompe outros handlers
        }
      })
    )
  )

  /**
   * ✅ 5️⃣ Marcar como processado
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
