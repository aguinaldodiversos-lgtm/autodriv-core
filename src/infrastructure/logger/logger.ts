import pino from "pino"

const transport =
  process.env.NODE_ENV !== "production"
    ? (() => {
        try {
          return pino.transport({
            target: "pino-pretty"
          })
        } catch {
          console.warn(
            "pino-pretty is unavailable; falling back to the default logger transport."
          )
          return undefined
        }
      })()
    : undefined

export const logger = pino(
  {
    level: "info"
  },
  transport
)
