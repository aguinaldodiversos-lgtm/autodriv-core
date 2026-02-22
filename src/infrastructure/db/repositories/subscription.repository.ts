export class SubscriptionRepository {

  constructor(private db: DatabaseClient) {}

  async getActivePlan(dealershipId: string): Promise<string | null> {

    const result = await this.db.query({
      text: `
        SELECT plan
        FROM subscriptions
        WHERE dealership_id = $1
        AND status = 'active'
        LIMIT 1
      `,
      params: [dealershipId]
    })

    return result.rows[0]?.plan ?? null
  }
}
