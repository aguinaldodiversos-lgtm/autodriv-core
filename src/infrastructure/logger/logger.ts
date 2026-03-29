import pino from "pino"

const transport =
  process.env.NODE_ENV !== "production"
    ? (() => {
        try {
          return pino.transport({
            target: "pino-pretty"
          })
        } catch (error) {
          process.stderr.write(
            `pino-pretty is unavailable; falling back to the default logger transport. ${String(error)}\n`
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
