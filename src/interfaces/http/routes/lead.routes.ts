// src/interfaces/http/routes/lead.routes.ts

import { Router }          from "express"
import { LeadController }  from "@/interfaces/http/controllers/lead.controller"
import { DatabaseClient }  from "@/infrastructure/db/client"
import { EventBus }        from "@/infrastructure/event-bus/event.bus"

export function leadRoutes(db: DatabaseClient, eventBus: EventBus) {
  const router     = Router()
  const controller = new LeadController(db, eventBus)

  router.post("/",   controller.create)

  return router
}
