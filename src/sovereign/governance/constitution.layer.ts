// src/sovereign/governance/constitution.layer.ts

export interface ConstitutionalRule {
  id: string
  description: string
  validator: (context: any) => boolean
}

export class AIConstitution {
  private rules: ConstitutionalRule[] = []

  registerRule(rule: ConstitutionalRule) {
    this.rules.push(rule)
  }

  validate(context: any) {
    for (const rule of this.rules) {
      if (!rule.validator(context)) {
        throw new Error(
          `Constitutional violation: ${rule.description}`
        )
      }
    }
  }

  listRules() {
    return this.rules.map(r => r.description)
  }
}
