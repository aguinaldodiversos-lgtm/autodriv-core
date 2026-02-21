const axios = require("axios")

class MetaAdsClient {
  constructor({ accessToken, adAccountId }) {
    this.baseUrl = `https://graph.facebook.com/v19.0/${adAccountId}`
    this.token = accessToken
  }

  async getCampaignInsights() {
    const url = `${this.baseUrl}/insights`
    const response = await axios.get(url, {
      params: {
        access_token: this.token,
        fields: "campaign_name,spend,impressions,clicks,actions"
      }
    })
    return response.data.data
  }

  async updateCampaignBudget(campaignId, newBudget) {
    const url = `https://graph.facebook.com/v19.0/${campaignId}`
    return axios.post(url, {
      daily_budget: newBudget,
      access_token: this.token
    })
  }

  async pauseCampaign(campaignId) {
    const url = `https://graph.facebook.com/v19.0/${campaignId}`
    return axios.post(url, {
      status: "PAUSED",
      access_token: this.token
    })
  }
}

module.exports = MetaAdsClient
