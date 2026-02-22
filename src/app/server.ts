import express from "express"
import { bootstrap } from "./bootstrap"
import { leadRoutes } from "@/interfaces/http/routes/lead.routes"

async function start() {

  const app = express()
  app.use(express.json())

  const context = await bootstrap(process.env)

  app.use(
    "/api/leads",
    leadRoutes(context.db, context.eventBus)
  )

  app.listen(3000, () =>
    console.log("🚀 AIP running")
  )
}

start()
