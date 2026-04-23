import { EventHandler } from "@/infrastructure/event-bus/event.handler"
import { DomainEvent } from "@/infrastructure/event-bus/event.types"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const VisitPipelineEngine = require("./visit-pipeline.engine")

export class VisitHandler implements EventHandler {

  eventName = "lead.created"

  constructor(
    private visitPipeline: InstanceType<typeof VisitPipelineEngine>
  ) {}

  async handle(event: DomainEvent): Promise<void> {

    const stage =
      this.visitPipeline.nextStage(event.payload)

    // atualizar lead status no banco
  }
}
