// src/infrastructure/db/repositories/subscription.repository.ts

import { DatabaseClient } from "@/infrastructure/db/client"

export class SubscriptionRepository {

  constructor(private db: DatabaseClient) {}

  async getActivePlan(dealershipId: string): Promise<string | null> {

    const rows = await this.db.query<{ plan: string }>({
      text: `
        SELECT plan
        FROM subscriptions
        WHERE dealership_id = $1
          AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `,
      params: [dealershipId]
    })

    return rows[0]?.plan ?? null
  }

  async getSubscription(dealershipId: string): Promise<any | null> {

    const rows = await this.db.query<any>({
      text: `
        SELECT *
        FROM subscriptions
        WHERE dealership_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      params: [dealershipId]
    })

    return rows[0] ?? null
  }

  async isActive(dealershipId: string): Promise<boolean> {

    const plan = await this.getActivePlan(dealershipId)
    return plan !== null
  }
}
