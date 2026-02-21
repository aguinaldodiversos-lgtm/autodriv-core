// src/regulatory/compliance.engine.ts

import { DatabaseClient } from "@/infrastructure/db/client"

export class ComplianceEngine {
  constructor(private db: DatabaseClient) {}

  async validate(country: string, context: any) {
    const rules = await this.db.query({
      text: `
        SELECT rule
        FROM regulatory_rules
        WHERE country = $1 AND active = true
      `,
      params: [country]
    })

    for (const r of rules) {
      if (!this.evaluate(r.rule, context)) {
        throw new Error(
          `Compliance violation in ${country}`
        )
      }
    }
  }

  private evaluate(rule: any, context: any) {
    return Object.keys(rule.conditions).every(
      key => context[key] === rule.conditions[key]
    )
  }
}
