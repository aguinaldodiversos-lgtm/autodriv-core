import { BaseSaga } from "./base.saga"

export class SaleSaga extends BaseSaga {
  constructor(
    private generateContract: () => Promise<void>,
    private markVehicleSold: () => Promise<void>,
    private revertVehicle: () => Promise<void>
  ) {
    super()
  }

  steps() {
    return [
      {
        action: this.generateContract,
        compensate: async () => {}
      },
      {
        action: this.markVehicleSold,
        compensate: this.revertVehicle
      }
    ]
  }
}
