// src/infrastructure/governance/ai-oversight.board.ts

export interface DecisionRecord {
  decision: string
  confidence: number
  risk: number
}

export class AIOversightBoard {
  private history: DecisionRecord[] = []

  review(decision: DecisionRecord) {
    this.history.push(decision)

    if (decision.risk > 0.8) {
      throw new Error("Decision blocked: high systemic risk")
    }

    if (decision.confidence < 0.4) {
      throw new Error("Decision blocked: low confidence")
    }

    return true
  }

  getAuditLog() {
    return this.history
  }
}
