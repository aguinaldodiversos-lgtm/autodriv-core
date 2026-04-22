export type DomainEventName =
  | "lead.created"
  | "lead.updated"
  | "lead.converted"
  | "visit.scheduled"
  | "visit.completed"
  | "sale.completed"
  | "vehicle.updated"
  | "campaign.updated"
  | "snapshot.generated"
  | "premium.ai.requested"
  | "local.ai.requested"
  | "maintenance.updated"
  | "contract.approved"
  | string   // permite extensão sem quebrar o tipo

export interface DomainEvent<T = any> {
  id:         string
  name:       DomainEventName
  tenantId:   string
  payload:    T
  occurredAt: Date
}
