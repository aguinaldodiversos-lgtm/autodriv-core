const pool = require("../../config/db");
const {
  applySuggestion
} = require("./applySuggestion.service");
const { parsePagination } = require("../../utils/pagination");
const logger = require("../../infrastructure/logger/logger");

/* =========================
   LISTAR VEÍCULOS (paginado)
========================= */
async function getVehicles(req, res) {
  try {
    const dealershipId = req.user.dealership_id;
    const { limit, offset } = parsePagination(req);

    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT * FROM vehicles
         WHERE dealership_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [dealershipId, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM vehicles
         WHERE dealership_id = $1`,
        [dealershipId]
      )
    ]);

    res.json({
      items: rows.rows,
      limit,
      offset,
      total: count.rows[0].total
    });
  } catch (err) {
    logger.error({ err, dealership_id: req.user?.dealership_id }, "listar veículos falhou");
    res.status(500).json({ error: "Erro ao listar veículos" });
  }
}

/* =========================
   BUSCAR VEÍCULO POR ID
========================= */
async function getVehicleById(req, res) {
  try {
    const dealershipId = req.user.dealership_id;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM vehicles
       WHERE id = $1
       AND dealership_id = $2`,
      [id, dealershipId]
    );

    const vehicle = result.rows[0];

    if (!vehicle) {
      return res.status(404).json({
        error: "Veículo não encontrado"
      });
    }

    res.json(vehicle);
  } catch (err) {
    console.error("Erro ao buscar veículo:", err);
    res.status(500).json({ error: "Erro ao buscar veículo" });
  }
}

/* =========================
   CRIAR VEÍCULO
========================= */
async function createVehicle(req, res) {
  try {
    const dealershipId = req.user.dealership_id;
    const {
      brand,
      model,
      year,
      price,
      fipe_price,
      status
    } = req.body;

    const result = await pool.query(
      `INSERT INTO vehicles
       (dealership_id, brand, model, year, price, fipe_price, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        dealershipId,
        brand,
        model,
        year,
        price || 0,
        fipe_price || null,
        status || "available"
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao criar veículo:", err);
    res.status(500).json({ error: "Erro ao criar veículo" });
  }
}

/* =========================
   ATUALIZAR VEÍCULO
========================= */
async function updateVehicle(req, res) {
  try {
    const dealershipId = req.user.dealership_id;
    const { id } = req.params;

    const {
      brand,
      model,
      year,
      price,
      fipe_price,
      status,
      is_featured
    } = req.body;

    const result = await pool.query(
      `UPDATE vehicles
       SET brand = $1,
           model = $2,
           year = $3,
           price = $4,
           fipe_price = $5,
           status = $6,
           is_featured = $7
       WHERE id = $8
       AND dealership_id = $9
       RETURNING *`,
      [
        brand,
        model,
        year,
        price,
        fipe_price,
        status,
        is_featured,
        id,
        dealershipId
      ]
    );

    const vehicle = result.rows[0];

    if (!vehicle) {
      return res.status(404).json({
        error: "Veículo não encontrado"
      });
    }

    res.json(vehicle);
  } catch (err) {
    console.error("Erro ao atualizar veículo:", err);
    res.status(500).json({ error: "Erro ao atualizar veículo" });
  }
}

/* =========================
   EXCLUIR VEÍCULO
========================= */
async function deleteVehicle(req, res) {
  try {
    const dealershipId = req.user.dealership_id;
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM vehicles
       WHERE id = $1
       AND dealership_id = $2
       RETURNING id`,
      [id, dealershipId]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: "Veículo não encontrado"
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao excluir veículo:", err);
    res.status(500).json({ error: "Erro ao excluir veículo" });
  }
}

/* =========================
   APLICAR SUGESTÃO AUTOMÁTICA
   - gera anúncio com IA
   - envia para Carros na Cidade
   - destaca veículo
========================= */
async function applyVehicleSuggestion(req, res) {
  try {
    const dealershipId = req.user.dealership_id;
    const { id } = req.params;

    const result = await applySuggestion(id, dealershipId);

    res.json(result);
  } catch (err) {
    console.error("Erro ao aplicar sugestão:", err);
    res.status(500).json({
      error: err.message
    });
  }
}

module.exports = {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  applyVehicleSuggestion
};
