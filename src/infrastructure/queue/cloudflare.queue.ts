import { QueueClient, QueueJob } from "./queue.client"

interface CloudflareQueueBinding {
  send(message: string): Promise<void>
}

/** Forma mínima compatível com Workers Queue consumer (sem @cloudflare/workers-types). */
export interface MessageBatch<T = unknown> {
  messages: Array<{
    body: string
    ack(): void
    retry(): void
  }>
}

export class CloudflareQueueAdapter implements QueueClient {
  private handler?: (job: QueueJob) => Promise<void>

  constructor(private queue: CloudflareQueueBinding) {}

  async add<T = any>(job: QueueJob<T>): Promise<void> {
    await this.queue.send(JSON.stringify(job))
  }

  process(handler: (job: QueueJob) => Promise<void>) {
    this.handler = handler
  }

  async consume(batch: MessageBatch<any>) {
    if (!this.handler) return

    for (const message of batch.messages) {
      try {
        const job: QueueJob = JSON.parse(message.body)
        await this.handler(job)
        message.ack()
      } catch (err) {
        message.retry()
      }
    }
  }
}
