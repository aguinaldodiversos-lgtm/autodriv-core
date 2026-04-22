// src/interfaces/http/routes/maintenance.routes.ts

import { Router }                 from "express"
import { MaintenanceController }  from "@/interfaces/http/controllers/maintenance.controller"
import { DatabaseClient }         from "@/infrastructure/db/client"

export function maintenanceRoutes(db: DatabaseClient) {
  const router     = Router()
  const controller = new MaintenanceController(db)

  router.get("/",                    controller.list)
  router.post("/",                   controller.create)
  router.get("/:id",                 controller.getById)
  router.patch("/:id/status",        controller.updateStatus)

  return router
}
