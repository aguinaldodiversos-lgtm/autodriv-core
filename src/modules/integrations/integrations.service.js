const pool = require("../../config/db");
const repo = require("./integrations.repository");
const cncAdapter = require("./adapters/carrosNaCidade.adapter");
const adPreparation = require("../ad_preparation/adPreparation.service");

async function publishToCarrosNaCidade(vehicleId, user) {
  await adPreparation.assertCanPublish(vehicleId, user);

  const vehicleResult = await pool.query(
    `SELECT * FROM vehicles
     WHERE id = $1 AND dealership_id = $2`,
    [vehicleId, user.dealership_id]
  );

  const vehicle = vehicleResult.rows[0];
  if (!vehicle) throw new Error("Veículo não encontrado");

  const imagesResult = await pool.query(
    `SELECT * FROM vehicle_images
     WHERE vehicle_id = $1`,
    [vehicleId]
  );

  const images = imagesResult.rows;

  const external = await cncAdapter.publishVehicle(vehicle, images);

  const integration = await repo.create({
    dealership_id: user.dealership_id,
    vehicle_id: vehicleId,
    platform: "carros_na_cidade",
    external_id: external.id,
    status: "published"
  });

  return integration;
}

module.exports = {
  publishToCarrosNaCidade
};
