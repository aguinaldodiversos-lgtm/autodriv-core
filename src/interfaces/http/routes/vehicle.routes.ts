// src/interfaces/http/routes/vehicle.routes.ts

import { Router }            from "express"
import { VehicleController } from "@/interfaces/http/controllers/vehicle.controller"
import { DatabaseClient }    from "@/infrastructure/db/client"
import { EventBus }          from "@/infrastructure/event-bus/event.bus"

export function vehicleRoutes(db: DatabaseClient, eventBus: EventBus) {
  const router     = Router()
  const controller = new VehicleController(db, eventBus)

  router.get("/",     controller.list)
  router.post("/",    controller.create)
  router.get("/:id",  controller.getById)

  return router
}
