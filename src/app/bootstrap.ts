// src/app/bootstrap.ts

import { EventBus } from "@/infrastructure/event-bus/event.bus"
import { DatabaseClient } from "@/infrastructure/db/client"
import { RevenueSnapshotRepository } from "@/infrastructure/db/repositories/revenue-snapshot.repository"

import { RevenueIntelligenceCore } from "@/brain/revenue-intelligence.core"
import { DecisionEngine } from "@/brain/decision.engine"
import { SnapshotHandler } from "@/brain/snapshot.handler"

import { logger } from "@/infrastructure/logger/logger"

export interface AppContext {
  db: DatabaseClient
  eventBus: EventBus
  revenueCore: RevenueIntelligenceCore
  decisionEngine: DecisionEngine
}

export async function bootstrap(
  env: any
): Promise<AppContext> {

  logger.info("🚀 Bootstrapping AIP...")

  /**
   * 1️⃣ Database
   */
  const db = new DatabaseClient(env)

  /**
   * 2️⃣ Event Bus
   */
  const eventBus = new EventBus()

  /**
   * 3️⃣ Core Engines
   */
  const revenueCore = new RevenueIntelligenceCore()
  const decisionEngine = new DecisionEngine(revenueCore)

  /**
   * 4️⃣ Snapshot Repository
   */
  const snapshotRepository =
    new RevenueSnapshotRepository(db)

  /**
   * 5️⃣ Register Event Handlers
   */
  const snapshotHandler =
    new SnapshotHandler(
      snapshotRepository,
      revenueCore
    )

  eventBus.register(snapshotHandler)

  /**
   * 6️⃣ Health Check Log
   */
  logger.info("✅ EventBus initialized")
  logger.info("✅ RevenueCore initialized")
  logger.info("✅ DecisionEngine initialized")
  logger.info("✅ SnapshotHandler registered")

  logger.info("🎯 AIP Ready")

  return {
    db,
    eventBus,
    revenueCore,
    decisionEngine
  }
}
