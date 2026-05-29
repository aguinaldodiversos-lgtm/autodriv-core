const axios = require("axios");

function assertConfig() {
  if (!process.env.CNC_API_URL || !process.env.CNC_API_TOKEN) {
    const err = new Error("Integracao Carros na Cidade nao configurada");
    err.statusCode = 503;
    throw err;
  }
}

async function publishVehicle(vehicle, images) {
  assertConfig();
  const response = await axios.post(
    process.env.CNC_API_URL + "/api/integrations/vehicle",
    {
      title: vehicle.title,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      price: vehicle.price,
      description: vehicle.seo_description,
      images: images.map(img => img.image_url)
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.CNC_API_TOKEN}`
      }
    }
  );

  return response.data;
}

async function publish(payload) {
  assertConfig();
  const response = await axios.post(
    process.env.CNC_API_URL + "/api/integrations/vehicle",
    {
      title: payload.title,
      brand: payload.vehicle.brand,
      model: payload.vehicle.model,
      year: payload.vehicle.year,
      price: payload.price,
      description: payload.description,
      images: payload.media.image_urls,
      payload
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.CNC_API_TOKEN}`
      },
      timeout: 20000
    }
  );

  return {
    id: response.data?.id || response.data?.external_id || null,
    status: "published",
    provider: "carros_na_cidade",
    raw: response.data
  };
}

module.exports = {
  publishVehicle,
  publish
};
