const pool = require("../../config/db");
const repo = require("./ads.repository");

async function generateAd(data, user) {
  const vehicleResult = await pool.query(
    `SELECT * FROM vehicles
     WHERE id = $1 AND dealership_id = $2`,
    [data.vehicle_id, user.dealershipId]
  );

  const vehicle = vehicleResult.rows[0];
  if (!vehicle) throw new Error("Veículo não encontrado");

  const title = `${vehicle.brand} ${vehicle.model} ${vehicle.year}`;
  const description = `
${vehicle.brand} ${vehicle.model} ${vehicle.year}
Preço: R$ ${vehicle.price}

Veículo revisado e pronto para transferência.
Entre em contato para mais informações.
`.trim();

  const ad = await repo.create({
    dealership_id: user.dealershipId,
    vehicle_id: vehicle.id,
    title,
    description,
    platform: data.platform
  });

  return ad;
}

async function listAds(vehicleId, user) {
  return repo.findByVehicle(vehicleId, user.dealershipId);
}

module.exports = {
  generateAd,
  listAds
};
