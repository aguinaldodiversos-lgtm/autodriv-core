// src/brain/conversion/visit.handler.ts

import { EventHandler } from "@/infrastructure/event-bus/event.handler"
import { DomainEvent } from "@/infrastructure/event-bus/event.types"
import { VisitPipelineEngine } from "./visit.pipeline"
import { logger } from "@/infrastructure/logger/logger"

export class VisitHandler implements EventHandler {

  eventName = "lead.created"

  constructor(
    private visitPipeline: VisitPipelineEngine
  ) {}

  async handle(event: DomainEvent): Promise<void> {

    try {

      const result = this.visitPipeline.nextStage(event.payload)

      logger.info(
        `🎯 Visit Handler | Lead: ${event.payload?.id} | Stage: ${result.stage} | Urgência: ${result.urgency}`
      )

      // Aqui pode-se gravar o estágio no banco ou publicar novo evento
      // ex: eventBus.publish({ name: "lead.stage.updated", payload: result, ... })

    } catch (error) {

      logger.error({ err: error }, "❌ Visit Handler falhou")
    }
  }
}
