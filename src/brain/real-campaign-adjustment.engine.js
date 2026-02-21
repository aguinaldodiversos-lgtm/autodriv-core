class RealCampaignAdjustmentEngine {

  async execute(client, campaigns) {

    for (const c of campaigns) {

      if (c.roi < 0) {
        await client.pauseCampaign(c.id)
        continue
      }

      if (c.roi > 1.5) {
        const novoBudget = c.currentBudget * 2
        await client.updateCampaignBudget(c.id, novoBudget)
      }
    }

    return { status: "Campaigns adjusted" }
  }
}

module.exports = RealCampaignAdjustmentEngine
