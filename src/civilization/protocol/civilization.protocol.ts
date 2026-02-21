// src/civilization/protocol/civilization.protocol.ts

export interface CivilizationPrinciple {
  id: string
  rule: (context: any) => boolean
}

export class CivilizationProtocol {
  private principles: CivilizationPrinciple[] = []

  registerPrinciple(principle: CivilizationPrinciple) {
    this.principles.push(principle)
  }

  enforce(context: any) {
    for (const p of this.principles) {
      if (!p.rule(context)) {
        throw new Error(
          `Civilization protocol violation: ${p.id}`
        )
      }
    }
  }
}
