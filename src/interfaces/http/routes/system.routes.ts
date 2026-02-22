import { Router } from "express"
import { SystemController } from "../controllers/system.controller"
import { ReplayTenantUseCase } from "@/application/use-cases/system/replay-tenant.usecase"
import { EventStore } from "@/infrastructure/event-bus/event.store"

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
