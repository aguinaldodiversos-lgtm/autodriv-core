import { DomainEvent } from "./event.types"
import { EventHandler } from "./event.handler"
import { QueueClient } from "@/infrastructure/queue/queue.client"
import { EventStore } from "./event.store"
import { executeWithRetry } from "@/infrastructure/queue/retry.policy"

export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map()

  constructor(
    private queue: QueueClient,
    private eventStore: EventStore
  ) {
    this.queue.process(this.dispatch.bind(this))
  }

  register(handler: EventHandler) {
    const existing = this.handlers.get(handler.eventName) || []
    existing.push(handler)
    this.handlers.set(handler.eventName, existing)
  }

  async publish(event: DomainEvent) {
    await this.eventStore.append(event)

    await this.queue.add({
      name: event.name,
      payload: event,
    })
  }

  private async dispatch(job: { name: string; payload: DomainEvent }) {
    const handlers = this.handlers.get(job.name)
    if (!handlers) return

    for (const handler of handlers) {
      try {
        await executeWithRetry(
          () => handler.handle(job.payload),
          { attempts: 3, backoffMs: 500 }
        )
      } catch (err) {
        await this.eventStore.append({
          name: "event.failed",
          payload: {
            originalEvent: job.payload,
            error: String(err),
          },
          tenantId: job.payload.tenantId,
          occurredAt: new Date(),
        })
      }
    }
  }
}
