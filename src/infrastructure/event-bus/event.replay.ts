import { EventStore } from "./event.store"
import { EventBus } from "./event.bus"

export class EventReplay {
  constructor(
    private store: EventStore,
    private bus: EventBus
  ) {}

  async replayTenant(tenantId: string) {
    const events =
      await this.store.replayByTenant(tenantId)

    for (const event of events) {
      await this.bus.replay(event)
    }
  }
}
