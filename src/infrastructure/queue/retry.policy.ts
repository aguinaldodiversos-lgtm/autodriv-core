export interface RetryOptions {
  attempts: number
  backoffMs: number
}

export async function executeWithRetry(
  fn: () => Promise<void>,
  options: RetryOptions
) {
  let attempt = 0

  while (attempt < options.attempts) {
    try {
      await fn()
      return
    } catch (err) {
      attempt++
      if (attempt >= options.attempts) throw err
      await new Promise((r) =>
        setTimeout(r, options.backoffMs * attempt)
      )
    }
  }
}
