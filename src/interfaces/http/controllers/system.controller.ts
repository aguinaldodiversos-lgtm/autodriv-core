import { Request, Response } from "express"
import { ReplayTenantUseCase } from "@/application/use-cases/system/replay-tenant.usecase"

export class SystemController {

  constructor(
    private replayTenant: ReplayTenantUseCase
  ) {}

  replay = async (req: Request, res: Response) => {

    const { tenantId } = req.params

    await this.replayTenant.execute(tenantId)

    res.json({ status: "replay completed" })
  }
}
