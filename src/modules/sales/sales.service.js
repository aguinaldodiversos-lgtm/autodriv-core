const pool = require("../../config/db");
const repo = require("./sales.repository");

async function createSale(data, user) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const sale = await client.query(
      `INSERT INTO sales
       (dealership_id, proposal_id, client_id, vehicle_id, sold_by, final_price, payment_method, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'completed')
       RETURNING *`,
      [
        user.dealershipId,
        data.proposal_id,
        data.client_id,
        data.vehicle_id,
        user.userId,
        data.final_price,
        data.payment_method
      ]
    );

    // Atualiza status do veículo para vendido
    await client.query(
      `UPDATE vehicles
       SET status = 'sold'
       WHERE id = $1 AND dealership_id = $2`,
      [data.vehicle_id, user.dealershipId]
    );

    // Atualiza proposta para aprovada
    if (data.proposal_id) {
      await client.query(
        `UPDATE proposals
         SET status = 'approved', updated_at = NOW()
         WHERE id = $1 AND dealership_id = $2`,
        [data.proposal_id, user.dealershipId]
      );
    }

    await client.query("COMMIT");

    return sale.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function listSales(user) {
  return repo.findAll(user.dealershipId);
}

module.exports = {
  createSale,
  listSales
};
