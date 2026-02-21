export class CircuitBreaker {
  private failures = 0
  private lastFailure = 0
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED"

  constructor(
    private threshold = 5,
    private timeoutMs = 10000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailure > this.timeoutMs) {
        this.state = "HALF_OPEN"
      } else {
        throw new Error("Circuit Open")
      }
    }

    try {
      const result = await fn()
      this.reset()
      return result
    } catch (err) {
      this.fail()
      throw err
    }
  }

  private fail() {
    this.failures++
    this.lastFailure = Date.now()

    if (this.failures >= this.threshold) {
      this.state = "OPEN"
    }
  }

  private reset() {
    this.failures = 0
    this.state = "CLOSED"
  }
}
