const MarketingIntelligenceEngine = require("./marketing-intelligence.engine")
const BudgetAllocationEngine = require("./budget-allocation.engine")
const ROIForecastEngine = require("./roi-forecast.engine")
const CampaignOptimizerEngine = require("./campaign-optimizer.engine")
const CACForecastEngine = require("./cac-forecast.engine")
const LTVEngine = require("./ltv.engine")
const DailyBudgetAdjustmentEngine = require("./daily-budget-adjustment.engine")

class MarketingSuperEngine {

  constructor() {
    this.intel = new MarketingIntelligenceEngine()
    this.budget = new BudgetAllocationEngine()
    this.roiForecast = new ROIForecastEngine()
    this.optimizer = new CampaignOptimizerEngine()
    this.cacForecast = new CACForecastEngine()
    this.ltv = new LTVEngine()
    this.dailyAdjust = new DailyBudgetAdjustmentEngine()
  }

  async execute(tenantId, totalBudget) {

    const campaigns = await this.intel.analyze(tenantId)

    return {
      campaigns,
      allocation: this.budget.allocate(campaigns, totalBudget),
      roiForecast: this.roiForecast.forecast(campaigns),
      optimization: this.optimizer.optimize(campaigns),
      cacForecast: this.cacForecast.predict(campaigns),
      ltv: this.ltv.calculate(campaigns),
      dailyAdjustments: this.dailyAdjust.adjust(campaigns)
    }
  }
}

module.exports = MarketingSuperEngine
