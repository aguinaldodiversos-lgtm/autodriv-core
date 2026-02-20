import { createDatabaseClient } from "@/infrastructure/db"
import { InMemoryQueue } from "@/infrastructure/queue/in-memory.queue"
import { EventStore } from "@/infrastructure/event-bus/event.store"
import { EventBus } from "@/infrastructure/event-bus/event.bus"
import { AcquisitionEngine } from "@/brain/acquisition.engine"

export function bootstrap(env: any) {
  const db = createDatabaseClient(env)

  const queue = new InMemoryQueue()
  const eventStore = new EventStore(db)
  const eventBus = new EventBus(queue, eventStore)

  const acquisitionEngine = new AcquisitionEngine(db, eventBus)

  eventBus.register(acquisitionEngine)

  return {
    db,
    eventBus,
  }
}
