import { Router } from "express"
import { SystemController } from "../controllers/system.controller"
import { ReplayTenantUseCase } from "@/application/use-cases/lead/system/replay-tenant.usecase"

export function systemRoutes(context: any) {

  const router = Router()

  const replayUseCase = new ReplayTenantUseCase(
    context.eventStore,
    context.eventBus
  )

  const controller = new SystemController(replayUseCase)

  router.post("/replay/:tenantId", controller.replay)

  return router
}
