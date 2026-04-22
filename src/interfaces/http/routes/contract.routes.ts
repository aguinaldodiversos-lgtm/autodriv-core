// src/interfaces/http/routes/contract.routes.ts

import { Router }              from "express"
import { ContractController }  from "@/interfaces/http/controllers/contract.controller"
import { DatabaseClient }      from "@/infrastructure/db/client"

export function contractRoutes(db: DatabaseClient) {
  const router     = Router()
  const controller = new ContractController(db)

  router.get("/",                       controller.list)
  router.post("/",                      controller.create)
  router.get("/:id",                    controller.getById)
  router.post("/:id/send-approval",     controller.sendForApproval)
  router.post("/:id/approve",           controller.approve)
  router.post("/:id/reject",            controller.reject)
  router.post("/:id/generate",          controller.generate)

  return router
}
