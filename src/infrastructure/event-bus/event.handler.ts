import { DomainEvent } from "./event.types"

export interface EventHandler {
  eventName: string
  handle(event: DomainEvent): Promise<void>
}
