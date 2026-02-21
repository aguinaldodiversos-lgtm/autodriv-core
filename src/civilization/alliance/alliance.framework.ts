// src/civilization/alliance/alliance.framework.ts

export interface Alliance {
  id: string
  members: string[]
  sharedResources: number
  strategicObjective: string
}

export class GlobalAllianceFramework {
  private alliances: Alliance[] = []

  createAlliance(
    members: string[],
    objective: string
  ) {
    const alliance: Alliance = {
      id: crypto.randomUUID(),
      members,
      sharedResources: 0,
      strategicObjective: objective
    }

    this.alliances.push(alliance)
    return alliance
  }

  allocateResources(allianceId: string, amount: number) {
    const alliance = this.alliances.find(a => a.id === allianceId)
    if (!alliance) return

    alliance.sharedResources += amount
  }

  listAlliances() {
    return this.alliances
  }
}
