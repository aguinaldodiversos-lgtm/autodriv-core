// src/infrastructure/self-healing/self-healing.engine.ts

import { EventBus } from "@/infrastructure/event-bus/event.bus"
import { getMetrics } from "@/infrastructure/metrics/engine.metrics"

export class SelfHealingEngine {
  constructor(private eventBus: EventBus) {}

  async evaluate() {
    const metrics = getMetrics()

    for (const [engine, data] of metrics.entries()) {
      const failureRate = data.failures / (data.executions || 1)

      if (failureRate > 0.3) {
        await this.eventBus.publish({
          id: crypto.randomUUID(),
          name: "engine.degraded",
          payload: { engine },
          tenantId: "system",
          occurredAt: new Date()
        })
      }
    }
  }
}
