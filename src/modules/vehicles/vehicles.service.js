const repo = require("./vehicles.repository");

async function createVehicle(data, user) {
  return repo.create({
    dealership_id: user.dealershipId,
    title: data.title,
    brand: data.brand,
    model: data.model,
    year: data.year,
    price: data.price
  });
}

async function listVehicles(user) {
  return repo.findAll(user.dealershipId);
}

module.exports = {
  createVehicle,
  listVehicles
};
