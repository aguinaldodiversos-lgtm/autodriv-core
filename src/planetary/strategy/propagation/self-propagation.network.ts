// src/planetary/propagation/self-propagation.network.ts

export interface RegionSignal {
  opportunityIndex: number
  infrastructureReadiness: number
}

export class SelfPropagationNetwork {
  evaluate(region: RegionSignal) {
    const propagationScore =
      region.opportunityIndex *
      region.infrastructureReadiness

    return propagationScore > 0.6
  }

  createNode(region: string) {
    return {
      nodeId: crypto.randomUUID(),
      region,
      createdAt: new Date()
    }
  }
}
