export class SubscriptionRepository {

  constructor(private db: DatabaseClient) {}

  async getActivePlan(dealershipId: string): Promise<string | null> {

    const rows = await this.db.query<{
      plan: string
    }>({
      text: `
        SELECT plan
        FROM subscriptions
        WHERE dealership_id = $1
        AND status = 'active'
        LIMIT 1
      `,
      params: [dealershipId]
    })

    return rows[0]?.plan ?? null
  }
}
