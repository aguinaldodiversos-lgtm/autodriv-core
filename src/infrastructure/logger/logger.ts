import pino from "pino"

const transport =
  process.env.NODE_ENV !== "production"
    ? (() => {
        try {
          return pino.transport({
            target: "pino-pretty"
          })
        } catch {
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
