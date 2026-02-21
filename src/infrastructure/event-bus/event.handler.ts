import { DomainEvent } from "./event.types"

export interface EventHandler<T = any> {
  eventName: string
  handle(event: DomainEvent<T>): Promise<void>
}
