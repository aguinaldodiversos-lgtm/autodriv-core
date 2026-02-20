import { EventHandler } from "@/infrastructure/event-bus/event.handler"
import { DomainEvent } from "@/infrastructure/event-bus/event.types"

export class AcquisitionEngine implements EventHandler {
  eventName = "lead.created"

  async handle(event: DomainEvent): Promise<void> {
    // 1. Buscar histórico
    // 2. Calcular CAC parcial
    // 3. Atualizar métricas
    // 4. Disparar novo evento se necessário
  }
}
