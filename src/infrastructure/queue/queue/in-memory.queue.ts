import PQueue from "p-queue"
import { QueueClient, QueueJob } from "./queue.client"

export class InMemoryQueue implements QueueClient {
  private queue = new PQueue({ concurrency: 5 })
  private handler?: (job: QueueJob) => Promise<void>

  async add<T = any>(job: QueueJob<T>): Promise<void> {
    await this.queue.add(async () => {
      if (this.handler) {
        await this.handler(job)
      }
    })
  }

  process(handler: (job: QueueJob) => Promise<void>) {
    this.handler = handler
  }
}
