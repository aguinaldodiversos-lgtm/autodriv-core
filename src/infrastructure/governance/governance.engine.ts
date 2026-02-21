import { DatabaseClient } from "@/infrastructure/db/client"
import { randomUUID } from "crypto"

export class GovernanceEngine {
  constructor(private db: DatabaseClient) {}

  async evaluate(decision: string, context: any) {
    const approved = context.riskScore < 0.7

    await this.db.query({
      text: `
        INSERT INTO governance_decisions
        (id, decision, approved, reason, created_at)
        VALUES ($1,$2,$3,$4,NOW())
      `,
      params: [
        randomUUID(),
        decision,
        approved,
        approved ? "auto-approved" : "risk threshold exceeded"
      ]
    })

    if (!approved) {
      throw new Error("Decision blocked by governance")
    }
  }
}
