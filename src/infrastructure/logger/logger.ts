import pino from "pino"

const transport =
  process.env.NODE_ENV !== "production"
    ? (() => {
        try {
          return pino.transport({
            target: "pino-pretty"
          })
        } catch (error) {
          console.warn(
            "pino-pretty is unavailable; falling back to the default logger transport.",
            error
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
