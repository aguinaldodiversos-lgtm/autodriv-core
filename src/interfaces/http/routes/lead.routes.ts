import { Router } from "express"
import { LeadController } from "../controllers/lead.controller"

export function leadRoutes(db, eventBus) {

  const router = Router()
  const controller = new LeadController(db, eventBus)

  router.post("/", controller.create)

  return router
}
