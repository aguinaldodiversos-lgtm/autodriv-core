const CreativeAIEngine = require("./creative-ai.engine")

class CampaignGeneratorEngine {

  constructor() {
    this.creative = new CreativeAIEngine()
  }

  async generate(vehicle, budget) {

    const creative = await this.creative.generate(vehicle)

    return {
      campaignName: `AUTO_${vehicle.model}_${Date.now()}`,
      objective: "LEAD_GENERATION",
      audience: {
        idade: [25, 55],
        interesses: ["carros", vehicle.segment]
      },
      dailyBudget: budget,
      creative,
      bidStrategy: "LOWEST_COST"
    }
  }
}

module.exports = CampaignGeneratorEngine
