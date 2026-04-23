// src/interfaces/http/controllers/system.controller.ts

import { Request, Response, NextFunction } from "express"
import { ReplayTenantUseCase } from "@/application/use-cases/lead/system/replay-tenant.usecase"
import { logger } from "@/infrastructure/logger/logger"

export class SystemController {

  constructor(
    private replayTenantUseCase: ReplayTenantUseCase
  ) {}

  /**
   * 🔁 POST /api/system/replay/:tenantId
   * Reconstrói estado completo do tenant
   */
  replay = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {

    try {

      const { tenantId } = req.params

      if (!tenantId) {
        res.status(400).json({
          success: false,
          message: "tenantId is required"
        })
        return
      }

      logger.info(
        `🛠 Admin replay requested for tenant: ${tenantId}`
      )

      const result =
        await this.replayTenantUseCase.execute(tenantId)

      res.status(200).json({
        success: true,
        message: "Replay completed successfully",
        data: result
      })

    } catch (error) {

      logger.error(
        { err: error },
        "❌ Admin replay failed"
      )

      next(error)
    }
  }
}
