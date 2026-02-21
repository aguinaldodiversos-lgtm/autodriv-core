import { BaseEngine } from "./base.engine"

export class AIOrchestratorEngine extends BaseEngine {
  eventName = "lead.created"

  protected async execute(event: any) {
    const complexity =
      await this.detectComplexity(event.payload)

    if (complexity === "high") {
      await this.eventBus.publish({
        id: crypto.randomUUID(),
        name: "premium.ai.requested",
        payload: event.payload,
        tenantId: event.tenantId,
        occurredAt: new Date(),
      })
    } else {
      await this.eventBus.publish({
        id: crypto.randomUUID(),
        name: "local.ai.requested",
        payload: event.payload,
        tenantId: event.tenantId,
        occurredAt: new Date(),
      })
    }
  }

  private async detectComplexity(payload: any) {
    if (payload.budget > 100000) return "high"
    return "low"
  }
}
