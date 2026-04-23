// src/brain/snapshot.handler.ts

import { EventHandler } from "@/infrastructure/event-bus/event.handler"
import { DomainEvent } from "@/infrastructure/event-bus/event.types"
import { RevenueSnapshotRepository } from "@/infrastructure/db/repositories/revenue-snapshot.repository"
import { RevenueIntelligenceCore } from "./revenue-intelligence.core"
import { RevenueSnapshot } from "@/domain/entities/revenue-snapshot"
import { logger } from "@/infrastructure/logger/logger"

const CRITICAL_EVENTS = [
  "sale.completed",
  "visit.completed",
  "campaign.updated",
  "vehicle.updated"
]

export class SnapshotHandler implements EventHandler {

  // usamos wildcard lógico, mas filtramos internamente
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
        `📊 Generating snapshot for tenant ${event.tenantId} | event: ${event.name}`
      )

      /**
       * Espera-se que o payload já contenha:
       * vehicleScore
       * leadScore
       * channelScore
       *
       * Caso queira futuramente,
       * pode-se buscar dados completos do banco aqui.
       */

      const revenueResult =
        this.revenueCore.evaluateSystem({
          vehicleScore: event.payload.vehicleScore,
          leadScore: event.payload.leadScore,
          channelScore: event.payload.channelScore
        })

      const snapshot: RevenueSnapshot = {
        tenantId: event.tenantId,
        vehicleScore: revenueResult.vehicleScore,
        leadScore: revenueResult.leadScore,
        channelScore: revenueResult.channelScore,
        globalHealth: revenueResult.globalHealth,
        createdAt: new Date()
      }

      await this.snapshotRepo.save(snapshot)

      logger.info(
        `✅ Snapshot saved | Global Health: ${snapshot.globalHealth}`
      )

    } catch (error) {

      logger.error(
        { err: error },
        `❌ Snapshot generation failed for tenant ${event.tenantId}`
      )

      // não lançar erro para não quebrar o EventBus
    }
  }
}
