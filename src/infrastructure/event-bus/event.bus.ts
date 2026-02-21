import { DomainEvent } from "./event.types"
import { EventHandler } from "./event.handler"
import { QueueClient } from "@/infrastructure/queue/queue.client"
import { EventStore } from "./event.store"
import { executeWithRetry } from "@/infrastructure/queue/retry.policy"
import { DistributedLock } from "@/infrastructure/lock/distributed.lock"

export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map()

  constructor(
    private queue: QueueClient,
    private eventStore: EventStore,
    private lock: DistributedLock
  ) {
    this.queue.process(this.dispatch.bind(this))
  }

  register(handler: EventHandler) {
    const list = this.handlers.get(handler.eventName) || []
    list.push(handler)
    this.handlers.set(handler.eventName, list)
  }

  async publish(event: DomainEvent) {
    if (await this.eventStore.exists(event.id)) return

    await this.eventStore.append(event)

    await this.queue.add({
      name: event.name,
      payload: event,
    })
  }

  private async dispatch(job: { payload: DomainEvent }) {
    const event = job.payload

    await this.lock.withLock(event.id, async () => {
      const handlers = this.handlers.get(event.name)
      if (!handlers) return

      for (const handler of handlers) {
        await executeWithRetry(
          () => handler.handle(event),
          { attempts: 3, backoffMs: 500 }
        )
      }
    })
  }
}
