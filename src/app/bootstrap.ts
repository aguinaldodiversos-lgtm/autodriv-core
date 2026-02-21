// src/app/bootstrap.ts

import { createDatabaseClient } from "@/infrastructure/db"
import { InMemoryQueue } from "@/infrastructure/queue/in-memory.queue"
import { CloudflareQueueAdapter } from "@/infrastructure/queue/cloudflare.queue"
import { EventStore } from "@/infrastructure/event-bus/event.store"
import { EventBus } from "@/infrastructure/event-bus/event.bus"
import { AcquisitionEngine } from "@/brain/acquisition.engine"
import { LocalAIService } from "@/infrastructure/ai/local-ai.service"

export async function bootstrap(env: any) {
  const db = createDatabaseClient(env)

  const localAI = new LocalAIService()
  await localAI.init()

  return {
    db,
    localAI
  }
}
export function bootstrap(env: any) {
  const db = createDatabaseClient(env)

  const queue =
    env.QUEUE_TYPE === "cloudflare"
      ? new CloudflareQueueAdapter(env.AIP_QUEUE)
      : new InMemoryQueue()

  const eventStore = new EventStore(db)
  const eventBus = new EventBus(queue, eventStore)

  const acquisitionEngine = new AcquisitionEngine(db, eventBus)

  eventBus.register(acquisitionEngine)

  return {
    db,
    eventBus,
  }
}
