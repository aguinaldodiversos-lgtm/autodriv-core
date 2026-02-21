const axios = require("axios")

class GoogleAdsClient {
  constructor({ developerToken, accessToken, customerId }) {
    this.baseUrl = `https://googleads.googleapis.com/v15/customers/${customerId}`
    this.devToken = developerToken
    this.token = accessToken
  }

  async getCampaignMetrics() {
    return axios.post(
      `${this.baseUrl}/googleAds:search`,
      {
        query: `
          SELECT campaign.name,
                 metrics.clicks,
                 metrics.cost_micros,
                 metrics.conversions
          FROM campaign
        `
      },
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          "developer-token": this.devToken
        }
      }
    )
  }

  async updateCampaignBudget(campaignResource, newBudget) {
    return axios.post(
      `${this.baseUrl}/campaignBudgets:mutate`,
      {
        operations: [{
          update: {
            resource_name: campaignResource,
            amount_micros: newBudget * 1000000
          },
          update_mask: "amount_micros"
        }]
      },
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          "developer-token": this.devToken
        }
      }
    )
  }
}

module.exports = GoogleAdsClient
