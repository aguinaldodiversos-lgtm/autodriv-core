// src/autonomous/negotiation/negotiator.ts

export interface Offer {
  from: string
  to: string
  value: number
  demand: number
}

export class AINegotiator {
  negotiate(a: Offer, b: Offer) {
    if (a.value >= b.demand) {
      return {
        agreement: true,
        transfer: b.demand
      }
    }

    return { agreement: false }
  }
}
