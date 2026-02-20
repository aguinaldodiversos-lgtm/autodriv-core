import { DomainEvent } from "@/infrastructure/event-bus/event.types"

export interface LeadCreatedPayload {
  leadId: string
  source: string
}

export function LeadCreatedEvent(
  payload: LeadCreatedPayload,
  tenantId: string
): DomainEvent<LeadCreatedPayload> {
  return {
    name: "lead.created",
    payload,
    tenantId,
    occurredAt: new Date(),
  }
}
