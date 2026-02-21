type EngineMetric = {
  executions: number
  failures: number
}

const metrics = new Map<string, EngineMetric>()

export function recordExecution(engine: string) {
  const current = metrics.get(engine) || {
    executions: 0,
    failures: 0,
  }

  current.executions++
  metrics.set(engine, current)
}

export function recordFailure(engine: string) {
  const current = metrics.get(engine) || {
    executions: 0,
    failures: 0,
  }

  current.failures++
  metrics.set(engine, current)
}

export function getMetrics() {
  return metrics
}
