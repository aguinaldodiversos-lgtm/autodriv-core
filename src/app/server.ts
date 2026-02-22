import express from "express"
import dotenv from "dotenv"
import { bootstrap } from "./bootstrap"
import { systemRoutes } from "@/interfaces/http/routes/system.routes"
dotenv.config()

async function start() {

  const app = express()
  app.use(express.json())

  const context = await bootstrap(process.env)
  
  app.use("/api/system", systemRoutes(context))
  app.get("/health", (_, res) => {
    res.json({ status: "AIP running" })
  })

  app.listen(3000, () =>
    console.log("🚀 AIP API running on port 3000")
  )
}

start()
