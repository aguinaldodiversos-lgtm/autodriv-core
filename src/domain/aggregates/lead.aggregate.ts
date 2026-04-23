import { LeadCreatedEvent } from "@/domain/events/lead-created.event"

/**
 * Agregado mínimo para o command handler de criação (event sourcing).
 * Mantido explícito em vez de AggregateRoot até o convenção onEvent alinhar com nomes de domínio.
 */
export class LeadAggregate {
  private _version = 0
  private _uncommitted: ReturnType<typeof LeadCreatedEvent>[] = []

  constructor(private readonly leadId: string) {}

  create(name: string, tenantId: string) {
    const ev = LeadCreatedEvent(
      { leadId: this.leadId, source: name || "manual" },
      tenantId
    )
    this._uncommitted.push(ev)
    this._version++
  }

  get version() {
    return this._version
  }

  getUncommittedEvents() {
    return this._uncommitted
  }

  markCommitted() {
    this._uncommitted = []
  }
}
