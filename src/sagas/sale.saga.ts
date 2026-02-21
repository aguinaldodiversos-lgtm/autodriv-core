import { EventBus } from "@/infrastructure/event-bus/event.bus"

export class SaleSaga {
  constructor(private eventBus: EventBus) {}

  async handle(event: any) {
    if (event.name === "ProposalApproved") {
      await this.eventBus.publish({
        id: crypto.randomUUID(),
        name: "ContractGenerateRequested",
        payload: event.payload,
        tenantId: event.tenantId,
        occurredAt: new Date(),
      })
    }

    if (event.name === "PaymentConfirmed") {
      await this.eventBus.publish({
        id: crypto.randomUUID(),
        name: "VehicleMarkSold",
        payload: event.payload,
        tenantId: event.tenantId,
        occurredAt: new Date(),
      })
    }
  }
}
