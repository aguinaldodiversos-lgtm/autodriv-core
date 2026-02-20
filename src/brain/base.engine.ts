import { EventHandler } from "@/infrastructure/event-bus/event.handler"
import { DomainEvent } from "@/infrastructure/event-bus/event.types"
import { DatabaseClient } from "@/infrastructure/db/client"
import { EventBus } from "@/infrastructure/event-bus/event.bus"

export abstract class BaseEngine implements EventHandler {
  abstract eventName: string

  protected db: DatabaseClient
  protected eventBus: EventBus

  constructor(db: DatabaseClient, eventBus: EventBus) {
    this.db = db
    this.eventBus = eventBus
  }

  async handle(event: DomainEvent): Promise<void> {
    await this.execute(event)
  }

  protected abstract execute(event: DomainEvent): Promise<void>
}
