import { DomainEvent } from "./event.types"
import { EventHandler } from "./event.handler"

export class EventBus {
  private handlers: EventHandler[] = []

  register(handler: EventHandler) {
    this.handlers.push(handler)
  }

  async publish(event: DomainEvent) {
    const matching = this.handlers.filter(
      h => h.eventName === event.name
    )

    await Promise.all(
      matching.map(h => h.handle(event))
    )
  }
}
