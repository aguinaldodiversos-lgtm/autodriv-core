import { DomainEvent } from "./event.types"
import { EventHandler } from "./event.handler"

export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map()

  register(handler: EventHandler) {
    const existing = this.handlers.get(handler.eventName) || []
    existing.push(handler)
    this.handlers.set(handler.eventName, existing)
  }

  async publish(event: DomainEvent) {
    const handlers = this.handlers.get(event.name)

    if (!handlers || handlers.length === 0) return

    await Promise.all(
      handlers.map((handler) => handler.handle(event))
    )
  }
}
