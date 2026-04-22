// src/brain/revenue/snapshot.handler.ts

import { EventHandler } from "@/infrastructure/event-bus/event.handler"
import { DomainEvent } from "@/infrastructure/event-bus/event.types"
import { RevenueSnapshotRepository } from "@/infrastructure/db/repositories/revenue-snapshot.repository"
import { RevenueIntelligenceCore } from "./revenue.core"
import { RevenueSnapshot } from "@/domain/entities/revenue-snapshot"
import { logger } from "@/infrastructure/logger/logger"

const CRITICAL_EVENTS = [
  "sale.completed",
  "visit.completed",
  "campaign.updated",
  "vehicle.updated",
  "lead.created",
  "lead.converted"
]

export class SnapshotHandler implements EventHandler {

  eventName = "*"

  constructor(
    private snapshotRepo: RevenueSnapshotRepository,
    private revenueCore: RevenueIntelligenceCore
  ) {}

  async handle(event: DomainEvent<any>): Promise<void> {

    try {

      if (!CRITICAL_EVENTS.includes(event.name)) {
        return
      }

      logger.info(
        `📊 Gerando snapshot para tenant ${event.tenantId} | evento: ${event.name}`
      )

      const revenueResult = this.revenueCore.evaluateSystem({
        vehicleScore:  event.payload?.vehicleScore  ?? 50,
        leadScore:     event.payload?.leadScore     ?? 50,
        channelScore:  event.payload?.channelScore  ?? 50
      })

      const snapshot: RevenueSnapshot = {
        tenantId:      event.tenantId,
        vehicleScore:  revenueResult.vehicleScore,
        leadScore:     revenueResult.leadScore,
        channelScore:  revenueResult.channelScore,
        globalHealth:  revenueResult.globalHealth,
        createdAt:     new Date()
      }

      await this.snapshotRepo.save(snapshot)

      logger.info(
        `✅ Snapshot salvo | Global Health: ${snapshot.globalHealth.toFixed(1)}`
      )

    } catch (error) {

      logger.error({ err: error }, `❌ Falha ao gerar snapshot para tenant ${event.tenantId}`)
    }
  }
}
