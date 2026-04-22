// src/interfaces/http/routes/finance.routes.ts

import { Router }            from "express"
import { FinanceController } from "@/interfaces/http/controllers/finance.controller"
import { DatabaseClient }    from "@/infrastructure/db/client"

export function financeRoutes(db: DatabaseClient) {
  const router     = Router()
  const controller = new FinanceController(db)

  router.get("/summary",        controller.summary)
  router.get("/",               controller.list)
  router.post("/",              controller.create)
  router.patch("/:id/pay",      controller.pay)

  return router
}
