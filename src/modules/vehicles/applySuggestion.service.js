const pool = require("../../config/db");
const axios = require("axios");

const {
  generateAdText
} = require("../ads/ads.service");

async function applySuggestion(vehicleId, dealershipId) {
  // busca veículo
  const vehicleResult = await pool.query(
    `SELECT * FROM vehicles
     WHERE id = $1
     AND dealership_id = $2`,
    [vehicleId, dealershipId]
  );

  const vehicle = vehicleResult.rows[0];

  if (!vehicle) {
    throw new Error("Veículo não encontrado");
  }

  /* =========================
     1) GERAR ANÚNCIO COM IA
  ========================== */
  const adText = await generateAdText(vehicle);

  /* =========================
     2) PUBLICAR NO CARROS NA CIDADE
  ========================== */
  let cncResponse = null;

  if (
    process.env.CNC_API_URL &&
    process.env.CNC_API_TOKEN
  ) {
    try {
      cncResponse = await axios.post(
        `${process.env.CNC_API_URL}/api/integrations/ads`,
        {
          vehicle_id: vehicle.id,
          title: `${vehicle.brand} ${vehicle.model}`,
          description: adText,
          price: vehicle.price
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.CNC_API_TOKEN}`
          }
        }
      );
    } catch (err) {
      console.error("Erro ao enviar para CNC:", err.message);
    }
  }

  /* =========================
     3) DESTACAR VEÍCULO
  ========================== */
  await pool.query(
    `UPDATE vehicles
     SET is_featured = true
     WHERE id = $1`,
    [vehicle.id]
  );

  return {
    success: true,
    ad_generated: true,
    cnc_posted: !!cncResponse,
    featured: true
  };
}

module.exports = {
  applySuggestion
};
