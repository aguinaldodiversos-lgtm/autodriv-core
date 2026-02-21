// src/sovereign/capital/capital.market.ts

export interface CapitalBid {
  agentId: string
  requested: number
  expectedROI: number
}

export class DistributedCapitalMarket {
  private bids: CapitalBid[] = []

  submitBid(bid: CapitalBid) {
    this.bids.push(bid)
  }

  allocate(totalCapital: number) {
    this.bids.sort(
      (a, b) => b.expectedROI - a.expectedROI
    )

    const allocations: Record<string, number> = {}

    for (const bid of this.bids) {
      if (totalCapital <= 0) break

      const amount = Math.min(
        bid.requested,
        totalCapital
      )

      allocations[bid.agentId] = amount
      totalCapital -= amount
    }

    this.bids = []
    return allocations
  }
}
