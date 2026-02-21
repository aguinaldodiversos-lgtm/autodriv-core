// src/infrastructure/event-bus/event.types.ts

export interface DomainEvent<T = any> {
  id: string
  name: string
  payload: T
  occurredAt: Date
  tenantId: string
}
