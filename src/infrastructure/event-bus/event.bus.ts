import { DomainEvent } from "./event.types"
import { EventHandler } from "./event.handler"
import PQueue from "p-queue"

export class EventBus {

  private handlers: EventHandler[] = []
  private queue = new PQueue({ concurrency: 10 })

  register(handler: EventHandler) {
    this.handlers.push(handler)
  }

  async publish(event: DomainEvent) {

    const matching = this.handlers.filter(
      h => h.eventName === event.name
    )

    await Promise.all(
      matching.map(handler =>
        this.queue.add(() => handler.handle(event))
      )
    )
  }
}
