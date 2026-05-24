const pool = require("../../config/db");
const repo = require("./images.repository");

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Só após o multer ter gravado o ficheiro: valida posse, insere com INSERT escopado.
 * Se o INSERT não afetar linhas, distingue 404 (veículo inexistente) e 403 (outra loja).
 */
async function uploadVehicleImage(vehicleIdParam, file, user) {
  if (!user || user.dealership_id == null) {
    throw httpError("Loja não associada ao utilizador", 403);
  }
  if (!file) {
    throw httpError("Imagem não enviada", 400);
  }

  const id = parseInt(vehicleIdParam, 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw httpError("vehicleId inválido", 400);
  }

  const imageUrl = file.path;
  if (!imageUrl) {
    throw httpError("Falha no armazenamento do ficheiro", 500);
  }

  const dealershipId = user.dealership_id;
  const row = await repo.insertForVehicleInDealership(
    id,
    imageUrl,
    false,
    dealershipId
  );

  if (row) {
    return row;
  }

  const v = await pool.query(
    `SELECT id, dealership_id FROM vehicles WHERE id = $1`,
    [id]
  );
  if (!v.rows.length) {
    throw httpError("Veículo não encontrado", 404);
  }
  if (Number(v.rows[0].dealership_id) !== Number(dealershipId)) {
    throw httpError("Acesso negado: veículo de outra loja", 403);
  }
  throw httpError("Falha ao gravar metadados da imagem", 500);
}

async function listVehicleImages(vehicleIdParam, user) {
  if (!user || user.dealership_id == null) {
    throw httpError("Loja não associada ao utilizador", 403);
  }
  const id = parseInt(vehicleIdParam, 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw httpError("vehicleId inválido", 400);
  }

  const v = await pool.query(
    `SELECT id, dealership_id FROM vehicles WHERE id = $1`,
    [id]
  );
  if (!v.rows.length) {
    throw httpError("Veículo não encontrado", 404);
  }
  if (Number(v.rows[0].dealership_id) !== Number(user.dealership_id)) {
    throw httpError("Acesso negado: veículo de outra loja", 403);
  }

  return repo.listByVehicleInDealership(id, user.dealership_id);
}

module.exports = {
  uploadVehicleImage,
  listVehicleImages
};
