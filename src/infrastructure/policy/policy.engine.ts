// src/infrastructure/policy/policy.engine.ts

import { DatabaseClient } from "@/infrastructure/db/client"

export class PolicyEngine {
  constructor(private db: DatabaseClient) {}

  async evaluate(tenantId: string, context: any) {
    const rules = await this.db.query({
      text: `
        SELECT rule
        FROM policy_rules
        WHERE tenant_id = $1 AND active = true
      `,
      params: [tenantId]
    })

    for (const r of rules) {
      const rule = r.rule
      if (this.matches(rule, context)) {
        return rule.action
      }
    }

    return null
  }

  private matches(rule: any, context: any) {
    return Object.keys(rule.conditions).every(
      key => context[key] === rule.conditions[key]
    )
  }
}
