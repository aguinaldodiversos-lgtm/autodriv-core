// src/app/bootstrap.ts

import { DatabaseClient } from "@/infrastructure/db/client"
import { EventBus } from "@/infrastructure/event-bus/event.bus"
import { EventStore } from "@/infrastructure/event-bus/event.store"

import { RevenueIntelligenceCore } from "@/brain/revenue/revenue.core"
import { DecisionEngine } from "@/brain/revenue/decision.engine"
import { SnapshotHandler } from "@/brain/revenue/snapshot.handler"

import { MarketingSuperEngine } from "@/brain/marketing/campaign.engine"
import { MarketingHandler } from "@/brain/marketing/marketing.handler"

import { VisitPipelineEngine } from "@/brain/conversion/visit.pipeline"
import { VisitHandler } from "@/brain/conversion/visit.handler"

import { logger } from "@/infrastructure/logger/logger"

export interface AppContext {
  db: DatabaseClient
  eventBus: EventBus
  revenueCore: RevenueIntelligenceCore
  decisionEngine: DecisionEngine
}

export async function bootstrap(env: any): Promise<AppContext> {

  logger.info("🚀 Bootstrapping AIP 2.0...")

  /**
   * 1️⃣ Database
   */
  const db = new DatabaseClient(env)

  /**
   * 2️⃣ Event Store (Event Sourcing base)
   */
  const eventStore = new EventStore(db)

  /**
   * 3️⃣ Event Bus (Sistema Nervoso)
   */
  const eventBus = new EventBus(eventStore, 20)

  /**
   * 4️⃣ Core Intelligence
   */
  const revenueCore = new RevenueIntelligenceCore()
  const decisionEngine = new DecisionEngine(revenueCore)

  /**
   * 5️⃣ Marketing Engine
   */
  const marketingEngine = new MarketingSuperEngine()

  /**
   * 6️⃣ Visit Engine
   */
  const visitPipeline = new VisitPipelineEngine()
  
  const brain = new BrainOrchestrator(
  revenueCore,
  decisionEngine,
  eventBus
)

eventBus.register(
  new BrainHandler(brain)
)
  /**
   * 7️⃣ Handlers Registration
   */

  // Snapshot automático
  eventBus.register(
    new SnapshotHandler(db, revenueCore)
  )

  // Decisão central
  eventBus.register(
    new DecisionEngine(revenueCore)
  )

  // Marketing reativo
  eventBus.register(
    new MarketingHandler(marketingEngine)
  )

  // Conversão reativa
  eventBus.register(
    new VisitHandler(visitPipeline)
  )

  logger.info("✅ Database initialized")
  logger.info("✅ EventStore initialized")
  logger.info("✅ EventBus initialized")
  logger.info("✅ RevenueCore initialized")
  logger.info("✅ DecisionEngine initialized")
  logger.info("✅ MarketingEngine initialized")
  logger.info("✅ VisitPipeline initialized")
  logger.info("🧠 System Nervous Core Ready")

  return {
    db,
    eventBus,
    revenueCore,
    decisionEngine
  }
}
