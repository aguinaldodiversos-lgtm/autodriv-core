export abstract class BaseSaga {
  abstract steps(): {
    action: () => Promise<void>
    compensate: () => Promise<void>
  }[]

  async execute() {
    const executed: any[] = []

    try {
      for (const step of this.steps()) {
        await step.action()
        executed.push(step)
      }
    } catch (err) {
      for (const step of executed.reverse()) {
        await step.compensate()
      }
      throw err
    }
  }
}
