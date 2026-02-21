const axios = require("axios")

class MetaAudienceAdjuster {

  constructor({ accessToken }) {
    this.token = accessToken
  }

  async updateAdSetAudience(adSetId, newAudience) {

    const url = `https://graph.facebook.com/v19.0/${adSetId}`

    return axios.post(url, {
      targeting: newAudience,
      access_token: this.token
    })
  }
}

module.exports = MetaAudienceAdjuster
