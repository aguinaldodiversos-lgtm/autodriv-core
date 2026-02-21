const axios = require("axios")

class CarrosNaCidadeClient {

  constructor({ apiKey }) {
    this.apiKey = apiKey
  }

  async publish(vehicle) {

    return axios.post(
      "https://api.carrosnacidade.com/vehicles",
      vehicle,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        }
      }
    )
  }
}

module.exports = CarrosNaCidadeClient
