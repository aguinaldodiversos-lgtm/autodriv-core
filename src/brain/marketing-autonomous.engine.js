const CampaignGeneratorEngine = require("./campaign-generator.engine")
const ReinforcementBudgetEngine = require("./reinforcement-budget.engine")
const MultiStoreCompareEngine = require("./multi-store-compare.engine")
const RegionalOptimizerEngine = require("./regional-optimizer.engine")

class MarketingAutonomousEngine {

  constructor() {
    this.generator = new CampaignGeneratorEngine()
    this.reinforcement = new ReinforcementBudgetEngine()
    this.multiStore = new MultiStoreCompareEngine()
    this.regional = new RegionalOptimizerEngine()
  }

  async execute(tenantId, vehicle, budget, roi) {

    const campanha = await this.generator.generate(vehicle, budget)

    const novoBudget = this.reinforcement.adjust({
      roi,
      currentBudget: budget
    })

    const rankingLojas = await this.multiStore.compare()

    const regional = await this.regional.optimize(tenantId)

    return {
      campanha,
      novoBudget,
      rankingLojas,
      regional
    }
  }
}

module.exports = MarketingAutonomousEngine
