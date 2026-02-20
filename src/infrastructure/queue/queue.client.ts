export interface QueueJob<T = any> {
  name: string
  payload: T
}

export interface QueueClient {
  add<T = any>(job: QueueJob<T>): Promise<void>
  process(
    handler: (job: QueueJob) => Promise<void>
  ): void
}
