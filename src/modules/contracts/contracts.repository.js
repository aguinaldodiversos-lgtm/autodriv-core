const pool = require("../../config/db");

async function findById(contractId, dealershipId) {
  const { rows } = await pool.query(
    `SELECT * FROM contracts
     WHERE id = $1 AND dealership_id = $2`,
    [contractId, dealershipId]
  );
  return rows[0] || null;
}

async function update(contractId, dealershipId, data) {
  const { rows } = await pool.query(
    `
    UPDATE contracts
    SET
      observations = COALESCE($1, observations),
      updated_at = NOW()
    WHERE id = $2
      AND dealership_id = $3
      AND status = 'draft'
    RETURNING *
    `,
    [data.observations || null, contractId, dealershipId]
  );

  if (!rows[0]) {
    throw new Error(
      "Contrato não pode ser editado. Apenas contratos em rascunho podem ser alterados."
    );
  }

  return rows[0];
}

async function updateStatus(contractId, dealershipId, status, userId, reason) {
  if (status === "pending_approval") {
    const { rows } = await pool.query(
      `
      UPDATE contracts
      SET status = $1,
          approved_by = NULL,
          approved_at = NULL,
          rejection_reason = NULL,
          updated_at = NOW()
      WHERE id = $2 AND dealership_id = $3
      RETURNING *
      `,
      [status, contractId, dealershipId]
    );
    if (!rows[0]) throw new Error("Contrato não encontrado");
    return rows[0];
  }

  if (status === "approved") {
    const { rows } = await pool.query(
      `
      UPDATE contracts
      SET status = $1,
          approved_by = $2,
          approved_at = NOW(),
          rejection_reason = NULL,
          updated_at = NOW()
      WHERE id = $3 AND dealership_id = $4
      RETURNING *
      `,
      [status, userId, contractId, dealershipId]
    );
    if (!rows[0]) throw new Error("Contrato não encontrado");
    return rows[0];
  }

  if (status === "rejected") {
    const { rows } = await pool.query(
      `
      UPDATE contracts
      SET status = $1,
          approved_by = $2,
          approved_at = NOW(),
          rejection_reason = $3,
          updated_at = NOW()
      WHERE id = $4 AND dealership_id = $5
      RETURNING *
      `,
      [status, userId, reason, contractId, dealershipId]
    );
    if (!rows[0]) throw new Error("Contrato não encontrado");
    return rows[0];
  }

  throw new Error(`Status de contrato não suportado: ${status}`);
}

async function findSaleById(saleId, dealershipId) {
  const { rows } = await pool.query(
    `SELECT s.*, v.brand AS trade_brand
     FROM sales s
     LEFT JOIN vehicles v
       ON v.id = s.vehicle_id
      AND v.dealership_id = s.dealership_id
     WHERE s.id = $1 AND s.dealership_id = $2`,
    [saleId, dealershipId]
  );
  return rows[0] || null;
}

async function getNextVersion(saleId, client) {
  const run = client.query.bind(client);
  const { rows } = await run(
    `SELECT COALESCE(MAX(version), 0) + 1 AS next
     FROM contracts WHERE sale_id = $1`,
    [saleId]
  );
  return parseInt(rows[0].next, 10);
}

async function createContractRecord(data, client) {
  const run = client.query.bind(client);
  const { rows } = await run(
    `
    INSERT INTO contracts
      (sale_id, dealership_id, version, file_path, hash, status)
    VALUES ($1, $2, $3, $4, $5, 'approved')
    RETURNING *
    `,
    [
      data.sale_id,
      data.dealership_id,
      data.version,
      data.file_path,
      data.hash
    ]
  );
  return rows[0];
}

async function createDraftFromPrevious(prev, newVersion, client) {
  const run = client.query.bind(client);
  const { rows } = await run(
    `
    INSERT INTO contracts
      (sale_id, dealership_id, version, file_path, hash, status, observations)
    VALUES ($1, $2, $3, 'draft://pending', 'pending', 'draft', $4)
    RETURNING *
    `,
    [
      prev.sale_id,
      prev.dealership_id,
      newVersion,
      prev.observations || null
    ]
  );
  return rows[0];
}

module.exports = {
  findById,
  update,
  updateStatus,
  findSaleById,
  getNextVersion,
  createContractRecord,
  createDraftFromPrevious
};
