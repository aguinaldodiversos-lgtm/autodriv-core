export type DomainEventName =
  | "lead.created"
  | "lead.updated"
  | "visit.scheduled"
  | "visit.completed"
  | "sale.completed"
  | "vehicle.updated"
  | "campaign.updated"
  | "snapshot.generated"
  | "premium.ai.requested"
  | "local.ai.requested"
  | "engine.degraded"

export interface DomainEvent<T = any> {
  id: string
  name: DomainEventName
  tenantId: string
  payload: T
  occurredAt: Date
}
