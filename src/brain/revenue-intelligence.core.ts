export interface RevenueInput {
  vehicleScore: number
  leadScore: number
  channelScore: number
}

export interface RevenueOutput extends RevenueInput {
  globalHealth: number
}

export class RevenueIntelligenceCore {

  evaluateSystem(
    input: RevenueInput
  ): RevenueOutput {

    const globalHealth =
      (input.vehicleScore * 0.4) +
      (input.leadScore * 0.3) +
      (input.channelScore * 0.3)

    return {
      ...input,
      globalHealth
    }
  }
}
