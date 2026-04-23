// src/brain/brain.orchestrator.ts

import { randomUUID } from "crypto"
import { RevenueIntelligenceCore } from "@/brain/revenue-intelligence.core"
import { DecisionEngine } from "@/brain/decision.engine"
import { EventBus } from "@/infrastructure/event-bus/event.bus"
import { DomainEvent } from "@/infrastructure/event-bus/event.types"
import { DomainEvents } from "@/domain/events/domain-events"
import { SubscriptionRepository } from "@/infrastructure/db/repositories/subscription.repository"
import { PlanPolicyService } from "@/domain/services/plan-policy.service"
import { logger } from "@/infrastructure/logger/logger"

export class BrainOrchestrator {

  constructor(
    private revenueCore: RevenueIntelligenceCore,
    private decisionEngine: DecisionEngine,
    private eventBus: EventBus,
    private subscriptionRepo: SubscriptionRepository,
    private planPolicy: PlanPolicyService
  ) {}

  /**
   * 🧠 Processa qualquer evento do sistema
   * e orquestra decisões com base no plano ativo
   */
  async process(event: DomainEvent): Promise<void> {

    try {

      logger.info(
        `🧠 Brain processing event: ${event.name} | Tenant: ${event.tenantId}`
      )

      /**
       * 1️⃣ Buscar plano ativo do tenant
       */
      const plan =
        await this.subscriptionRepo.getActivePlan(event.tenantId)

      if (!plan) {
        logger.warn(
          `⚠️ No active subscription for tenant ${event.tenantId}`
        )
        return
      }

      const capabilities =
        this.planPolicy.getCapabilities(plan)

      /**
       * 2️⃣ Executar inteligência base (sempre permitido)
       */
      const intelligence =
        this.revenueCore.evaluateSystem(event.payload)

      /**
       * 3️⃣ Decisão estratégica
       */
      const decisions =
        await this.decisionEngine.evaluate(intelligence)

      /**
       * 🔒 Governança por plano
       */

      // 🔹 Auto ajuste de orçamento
      if (decisions.adjustBudget && capabilities.autoBudget) {

        await this.eventBus.publish({
          id: randomUUID(),
          name: DomainEvents.CampaignUpdated,
          tenantId: event.tenantId,
          payload: {
            reason: "auto_budget_optimization"
          },
          occurredAt: new Date()
        })

        logger.info(
          `💰 Auto budget adjustment triggered`
        )
      }

      // 🔹 Otimização de preço
      if (decisions.reducePrice && capabilities.predictiveEngine) {

        await this.eventBus.publish({
          id: randomUUID(),
          name: DomainEvents.VehicleUpdated,
          tenantId: event.tenantId,
          payload: {
            reason: "price_optimization"
          },
          occurredAt: new Date()
        })

        logger.info(
          `📉 Price optimization triggered`
        )
      }

      // 🔹 Priorização de leads
      if (decisions.prioritizeLeads) {

        await this.eventBus.publish({
          id: randomUUID(),
          name: DomainEvents.LeadUpdated,
          tenantId: event.tenantId,
          payload: {
            reason: "lead_priority_adjustment"
          },
          occurredAt: new Date()
        })

        logger.info(
          `🎯 Lead prioritization triggered`
        )
      }

      // 🔹 IA Premium (somente se permitido)
      if (decisions.usePremiumAI && capabilities.premiumAI) {

        await this.eventBus.publish({
          id: randomUUID(),
          name: DomainEvents.PremiumAIRequested,
          tenantId: event.tenantId,
          payload: {
            context: event.payload
          },
          occurredAt: new Date()
        })

        logger.info(
          `🤖 Premium AI triggered`
        )
      }

    } catch (error) {

      logger.error(
        { err: error },
        `❌ Brain processing failed`
      )
    }
  }
}
