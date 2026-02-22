import { Request, Response } from "express"
import { CreateLeadUseCase } from "@/application/use-cases/lead/create-lead.usecase"
import { LeadRepository } from "@/infrastructure/db/repositories/lead.repository"
import { EventBus } from "@/infrastructure/event-bus/event.bus"
import { DatabaseClient } from "@/infrastructure/db/client"

export class LeadController {

  constructor(
    private db: DatabaseClient,
    private eventBus: EventBus
  ) {}

  create = async (req: Request, res: Response) => {

    const repo = new LeadRepository(this.db)

    const useCase =
      new CreateLeadUseCase(repo, this.eventBus)

    const result =
      await useCase.execute(req.body)

    return res.status(201).json(result)
  }
}
