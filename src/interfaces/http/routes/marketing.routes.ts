// src/interfaces/http/routes/marketing.routes.ts

import { Router }               from "express"
import { MarketingController }  from "@/interfaces/http/controllers/marketing.controller"
import { DatabaseClient }       from "@/infrastructure/db/client"

export function marketingRoutes(db: DatabaseClient) {
  const router     = Router()
  const controller = new MarketingController(db)

  router.get("/campaigns",         controller.listCampaigns)
  router.get("/campaigns/analyze", controller.analyze)

  return router
}
