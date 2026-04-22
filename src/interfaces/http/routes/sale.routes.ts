// src/interfaces/http/routes/sale.routes.ts

import { Router }         from "express"
import { SaleController } from "@/interfaces/http/controllers/sale.controller"
import { DatabaseClient } from "@/infrastructure/db/client"
import { EventBus }       from "@/infrastructure/event-bus/event.bus"

export function saleRoutes(db: DatabaseClient, eventBus: EventBus) {
  const router     = Router()
  const controller = new SaleController(db, eventBus)

  router.get("/",   controller.list)
  router.post("/",  controller.create)

  return router
}
