import { Hono } from "hono"

const health = new Hono()

health.get("/health", (c) =>
  c.json({ status: "ok" })
)

health.get("/ready", async (c) => {
  return c.json({ ready: true })
})

export default health
