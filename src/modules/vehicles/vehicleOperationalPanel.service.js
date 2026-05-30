const repository = require("./vehicleOperationalPanel.repository");
const { buildPanel, parseQuery } = require("./vehicleOperationalPanel.logic");

function httpError(message, statusCode, payload) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.payload = payload;
  return err;
}

function dealershipId(user) {
  if (!user?.dealership_id) {
    throw httpError("Usuario sem dealership_id", 403, {
      error: "DEALERSHIP_REQUIRED",
      message: "Usuario nao esta associado a uma loja."
    });
  }
  return user.dealership_id;
}

async function listVehiclesByOperationalView(user, query = {}) {
  parseQuery(query);
  const rows = await repository.listOperationalRows(dealershipId(user));
  return buildPanel(rows, query);
}

module.exports = {
  listVehiclesByOperationalView
};
