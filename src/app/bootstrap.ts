// src/app/bootstrap.ts

import { PostgresAdapter }           from "@/infrastructure/db/adapters/postgres.adapter"
import { EventStore }                from "@/infrastructure/event-bus/event.store"
import { EventBus }                  from "@/infrastructure/event-bus/event.bus"

import { RevenueIntelligenceCore }   from "@/brain/revenue/revenue.core"
import { DecisionEngine }            from "@/brain/revenue/decision.engine"
import { SnapshotHandler }           from "@/brain/revenue/snapshot.handler"

import { BrainOrchestrator }         from "@/brain/brain.orchestrator"
import { BrainHandler }              from "@/brain/brain.handler"

import { MarketingSuperEngine }      from "@/brain/marketing/campaign.engine"
import { MarketingHandler }          from "@/brain/marketing/marketing.handler"

import { VisitPipelineEngine }       from "@/brain/conversion/visit.pipeline"
import { VisitHandler }              from "@/brain/conversion/visit.handler"

import { SubscriptionRepository }    from "@/infrastructure/db/repositories/subscription.repository"
import { RevenueSnapshotRepository } from "@/infrastructure/db/repositories/revenue-snapshot.repository"
import { PlanPolicyService }         from "@/domain/services/plan-policy.service"

import { logger }                    from "@/infrastructure/logger/logger"

export interface AppContext {
  db:             PostgresAdapter
  eventStore:     EventStore
  eventBus:       EventBus
  revenueCore:    RevenueIntelligenceCore
  decisionEngine: DecisionEngine
}

export async function bootstrap(env: NodeJS.ProcessEnv): Promise<AppContext> {

  logger.info("🚀 Iniciando AIP Unified System...")

  // ─── 1. Database ─────────────────────────────────────────────────────────
  const connectionString = env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL não definida")

  const db = new PostgresAdapter(connectionString)

  // ─── 2. Event Store (Event Sourcing) ─────────────────────────────────────
  const eventStore = new EventStore(db)

  // ─── 3. Event Bus (Sistema Nervoso Central) ───────────────────────────────
  const eventBus = new EventBus(eventStore, 20)

  // ─── 4. Inteligência de Receita ───────────────────────────────────────────
  const revenueCore    = new RevenueIntelligenceCore()
  const decisionEngine = new DecisionEngine(revenueCore)

  // ─── 5. Repositórios e Governança ─────────────────────────────────────────
  const subscriptionRepo  = new SubscriptionRepository(db)
  const snapshotRepo      = new RevenueSnapshotRepository(db)
  const planPolicy        = new PlanPolicyService()

  // ─── 6. Cérebro Central ───────────────────────────────────────────────────
  const brain = new BrainOrchestrator(
    revenueCore,
    decisionEngine,
    eventBus,
    subscriptionRepo,
    planPolicy
  )

  eventBus.register(new BrainHandler(brain))

  // ─── 7. Snapshot (Read Model Builder) ────────────────────────────────────
  eventBus.register(new SnapshotHandler(snapshotRepo, revenueCore))

  // ─── 8. Engine de Marketing ───────────────────────────────────────────────
  const marketingEngine = new MarketingSuperEngine()
  eventBus.register(new MarketingHandler(marketingEngine))

  // ─── 9. Pipeline de Conversão / Visita ───────────────────────────────────
  const visitPipeline = new VisitPipelineEngine()
  eventBus.register(new VisitHandler(visitPipeline))

  logger.info("✅ Database (PostgreSQL) conectado")
  logger.info("✅ EventStore inicializado")
  logger.info("✅ EventBus ativo — concorrência: 20")
  logger.info("✅ RevenueCore inicializado")
  logger.info("✅ DecisionEngine inicializado")
  logger.info("✅ Governança por plano ativa")
  logger.info("🧠 BrainOrchestrator registrado")
  logger.info("📊 Sistema de Snapshots ativo")
  logger.info("📈 Marketing Engine ativo")
  logger.info("🎯 Pipeline de Visita ativo")
  logger.info("🚀 AIP totalmente operacional")

  return {
    db,
    eventStore,
    eventBus,
    revenueCore,
    decisionEngine
  }
}
