import { getMetrics } from "@/infrastructure/metrics/engine.metrics"

export class AutoScaler {
  evaluate() {
    const metrics = getMetrics()

    for (const [engine, data] of metrics.entries()) {
      const failureRate =
        data.failures / (data.executions || 1)

      if (failureRate > 0.2) {
        console.warn(
          `Engine ${engine} acima de 20% falhas — sugerir scale-out`
        )
      }

      if (data.executions > 1000) {
        console.warn(
          `Engine ${engine} alto volume — sugerir worker dedicado`
        )
      }
    }
  }
}
