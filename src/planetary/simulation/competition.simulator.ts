// src/planetary/simulation/competition.simulator.ts

export interface CivilizationState {
  id: string
  capital: number
  influence: number
  aggression: number
}

export class CompetitionSimulator {
  simulateRound(states: CivilizationState[]) {
    for (const civ of states) {
      const gain =
        civ.capital *
        (0.5 + Math.random() * 0.5) *
        (1 - civ.aggression * 0.2)

      civ.capital += gain
      civ.influence += gain * 0.05

      if (civ.aggression > 0.7) {
        civ.capital *= 0.95
      }
    }

    return states
  }
}
