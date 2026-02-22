// src/app/bootstrap.ts

import { DatabaseClient } from "@/infrastructure/db/client"
import { EventStore } from "@/infrastructure/event-bus/event.store"
import { EventBus } from "@/infrastructure/event-bus/event.bus"

import { RevenueIntelligenceCore } from "@/brain/revenue/revenue.core"
import { DecisionEngine } from "@/brain/revenue/decision.engine"
import { SnapshotHandler } from "@/brain/revenue/snapshot.handler"

import { BrainOrchestrator } from "@/brain/brain.orchestrator"
import { BrainHandler } from "@/brain/brain.handler"

import { MarketingSuperEngine } from "@/brain/marketing/campaign.engine"
import { MarketingHandler } from "@/brain/marketing/marketing.handler"

import { VisitPipelineEngine } from "@/brain/conversion/visit.pipeline"
import { VisitHandler } from "@/brain/conversion/visit.handler"

import { SubscriptionRepository } from "@/infrastructure/db/repositories/subscription.repository"
import { PlanPolicyService } from "@/domain/services/plan-policy.service"

import { logger } from "@/infrastructure/logger/logger"

export interface AppContext {
  db: DatabaseClient
  eventStore: EventStore
  eventBus: EventBus
  revenueCore: RevenueIntelligenceCore
  decisionEngine: DecisionEngine
}

export async function bootstrap(env: any): Promise<AppContext> {

  logger.info("🚀 Bootstrapping AIP Unified System...")

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
   * 5️⃣ Subscription + Plan Governance
   */
  const subscriptionRepo = new SubscriptionRepository(db)
  const planPolicy = new PlanPolicyService()

  /**
   * 6️⃣ Brain Orchestrator (Cérebro Central)
   */
  const brain = new BrainOrchestrator(
    revenueCore,
    decisionEngine,
    eventBus,
    subscriptionRepo,
    planPolicy
  )

  eventBus.register(new BrainHandler(brain))

  /**
   * 7️⃣ Snapshot (Read Model Builder)
   */
  eventBus.register(
    new SnapshotHandler(db, revenueCore)
  )

  /**
   * 8️⃣ Marketing Engine
   */
  const marketingEngine = new MarketingSuperEngine()

  eventBus.register(
    new MarketingHandler(marketingEngine)
  )

  /**
   * 9️⃣ Visit / Conversão Engine
   */
  const visitPipeline = new VisitPipelineEngine()

  eventBus.register(
    new VisitHandler(visitPipeline)
  )

  logger.info("✅ Database initialized")
  logger.info("✅ EventStore initialized")
  logger.info("✅ EventBus initialized")
  logger.info("✅ RevenueCore initialized")
  logger.info("✅ DecisionEngine initialized")
  logger.info("✅ Plan governance active")
  logger.info("🧠 Brain Orchestrator registered")
  logger.info("📊 Snapshot system active")
  logger.info("📈 Marketing engine active")
  logger.info("🎯 Visit pipeline active")
  logger.info("🚀 AIP fully operational")

  return {
    db,
    eventStore,
    eventBus,
    revenueCore,
    decisionEngine
  }
}
