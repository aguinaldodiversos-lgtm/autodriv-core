// src/brain/brain.orchestrator.ts

import { randomUUID }              from "crypto"
import { RevenueIntelligenceCore } from "@/brain/revenue/revenue.core"
import { DecisionEngine }          from "@/brain/revenue/decision.engine"
import { EventBus }                from "@/infrastructure/event-bus/event.bus"
import { DomainEvent }             from "@/infrastructure/event-bus/event.types"
import { DomainEvents }            from "@/domain/events/domain-events"
import { SubscriptionRepository }  from "@/infrastructure/db/repositories/subscription.repository"
import { PlanPolicyService }       from "@/domain/services/plan-policy.service"
import { logger }                  from "@/infrastructure/logger/logger"

export class BrainOrchestrator {

  constructor(
    private revenueCore:      RevenueIntelligenceCore,
    private decisionEngine:   DecisionEngine,
    private eventBus:         EventBus,
    private subscriptionRepo: SubscriptionRepository,
    private planPolicy:       PlanPolicyService
  ) {}

  /**
   * 🧠 Processa qualquer evento do sistema
   * e orquestra decisões com base no plano ativo do tenant
   */
  async process(event: DomainEvent): Promise<void> {

    try {

      logger.info(
        `🧠 Brain | Evento: ${event.name} | Tenant: ${event.tenantId}`
      )

      // 1. Buscar plano ativo do tenant
      const plan = await this.subscriptionRepo.getActivePlan(event.tenantId)

      if (!plan) {
        logger.warn(`⚠️ Sem assinatura ativa para tenant ${event.tenantId}`)
        return
      }

      const capabilities = this.planPolicy.getCapabilities(plan)

      // 2. Avaliação de receita (sempre executada)
      const intelligence = this.revenueCore.evaluateSystem(event.payload ?? {})

      // 3. Decisões estratégicas
      const decisions = await this.decisionEngine.evaluate(event.payload ?? {})

      // 4. Governança por plano — ações condicionais

      if (decisions.adjustBudget && capabilities.autoBudget) {
        await this.eventBus.publish({
          id:         randomUUID(),
          name:       DomainEvents.CampaignUpdated,
          tenantId:   event.tenantId,
          payload:    { reason: "auto_budget_optimization", health: intelligence.globalHealth },
          occurredAt: new Date()
        })
        logger.info(`💰 Ajuste automático de orçamento disparado`)
      }

      if (decisions.reducePrice && capabilities.predictiveEngine) {
        await this.eventBus.publish({
          id:         randomUUID(),
          name:       DomainEvents.VehicleUpdated,
          tenantId:   event.tenantId,
          payload:    { reason: "price_optimization", vehicleScore: intelligence.vehicleScore },
          occurredAt: new Date()
        })
        logger.info(`📉 Otimização de preço disparada`)
      }

      if (decisions.prioritizeLeads) {
        await this.eventBus.publish({
          id:         randomUUID(),
          name:       DomainEvents.LeadUpdated,
          tenantId:   event.tenantId,
          payload:    { reason: "lead_priority_adjustment", leadScore: intelligence.leadScore },
          occurredAt: new Date()
        })
        logger.info(`🎯 Priorização de leads disparada`)
      }

      if (decisions.usePremiumAI && capabilities.premiumAI) {
        await this.eventBus.publish({
          id:         randomUUID(),
          name:       DomainEvents.PremiumAIRequested,
          tenantId:   event.tenantId,
          payload:    { context: event.payload },
          occurredAt: new Date()
        })
        logger.info(`🤖 IA Premium ativada`)
      }

    } catch (error) {
      logger.error({ err: error }, "❌ Brain falhou ao processar evento")
    }
  }
}
