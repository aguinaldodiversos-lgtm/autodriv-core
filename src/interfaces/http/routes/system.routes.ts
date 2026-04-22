// src/interfaces/http/routes/system.routes.ts

import { Router }              from "express"
import { SystemController }    from "@/interfaces/http/controllers/system.controller"
import { ReplayTenantUseCase } from "@/application/use-cases/system/replay-tenant.usecase"
import { AppContext }           from "@/app/bootstrap"

export function systemRoutes(context: AppContext) {

  const router = Router()

  const replayUseCase = new ReplayTenantUseCase(
    context.eventStore,
    context.eventBus
  )

  const controller = new SystemController(replayUseCase)

  router.post("/replay/:tenantId", controller.replay)

  return router
}
