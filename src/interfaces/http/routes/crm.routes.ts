// src/interfaces/http/routes/crm.routes.ts

import { Router }         from "express"
import { CrmController }  from "@/interfaces/http/controllers/crm.controller"
import { DatabaseClient } from "@/infrastructure/db/client"

export function crmRoutes(db: DatabaseClient) {
  const router     = Router()
  const controller = new CrmController(db)

  router.get("/",                    controller.listClients)
  router.post("/",                   controller.createClient)
  router.get("/:id",                 controller.getClient)
  router.patch("/:id",               controller.updateClient)
  router.get("/:id/timeline",        controller.getTimeline)

  return router
}
