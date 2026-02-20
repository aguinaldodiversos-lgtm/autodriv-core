export interface DomainEvent<T = any> {
  name: string
  payload: T
  occurredAt: Date
  tenantId: string
}
