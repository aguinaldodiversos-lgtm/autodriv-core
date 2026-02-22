// src/brain/brain.handler.ts

import { EventHandler } from "@/infrastructure/event-bus/event.handler"
import { DomainEvent } from "@/infrastructure/event-bus/event.types"
import { BrainOrchestrator } from "./brain.orchestrator"

export class BrainHandler implements EventHandler {

  eventName = "*"

  constructor(
    private brain: BrainOrchestrator
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    await this.brain.process(event)
  }
}
