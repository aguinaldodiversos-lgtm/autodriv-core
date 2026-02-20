import { createDatabaseClient } from "@/infrastructure/db"
import { EventBus } from "@/infrastructure/event-bus/event.bus"
import { AcquisitionEngine } from "@/brain/acquisition.engine"

export function bootstrap(env: any) {
  const db = createDatabaseClient(env)
  const eventBus = new EventBus()

  const acquisitionEngine = new AcquisitionEngine()

  eventBus.register(acquisitionEngine)

  return {
    db,
    eventBus,
  }
}
