const axios = require("axios");

async function publishVehicle(vehicle, images) {
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

module.exports = {
  publishVehicle
};
