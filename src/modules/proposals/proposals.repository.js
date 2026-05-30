const pool = require("../../config/db");

async function create(data) {
  const result = await pool.query(
    `INSERT INTO proposals
     (dealership_id, lead_id, client_id, vehicle_id, created_by, price, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      data.dealership_id,
      data.lead_id,
      data.client_id,
      data.vehicle_id,
      data.created_by,
      data.price,
      data.status,
      data.notes
    ]
  );

  return result.rows[0];
}

async function findAll(dealershipId) {
  const result = await pool.query(
    `SELECT
       p.*,
       cl.name AS client_name,
       cl.phone AS client_phone,
       v.title AS vehicle_title,
       v.brand AS vehicle_brand,
       v.model AS vehicle_model,
       v.year AS vehicle_year,
       u.name AS created_by_name,
       c.status AS contract_status
     FROM proposals p
     LEFT JOIN clients cl
       ON cl.id = p.client_id
      AND cl.dealership_id = p.dealership_id
     LEFT JOIN vehicles v
       ON v.id = p.vehicle_id
      AND v.dealership_id = p.dealership_id
     LEFT JOIN users u
       ON u.id = p.created_by
     LEFT JOIN contracts c
       ON c.id = p.contract_id
      AND c.dealership_id = p.dealership_id
     WHERE p.dealership_id = $1
     ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC`,
    [dealershipId]
  );

  return result.rows;
}

async function update(id, dealershipId, data) {
  const result = await pool.query(
    `UPDATE proposals
     SET price=$1,
         status=$2,
         notes=$3,
         updated_at=NOW()
     WHERE id=$4 AND dealership_id=$5
     RETURNING *`,
    [
      data.price,
      data.status,
      data.notes,
      id,
      dealershipId
    ]
  );

  return result.rows[0];
}

async function remove(id, dealershipId) {
  await pool.query(
    `DELETE FROM proposals
     WHERE id=$1 AND dealership_id=$2`,
    [id, dealershipId]
  );
}

async function acceptAndCreateContract(id, dealershipId, data) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const proposalResult = await client.query(
      `SELECT
         p.*,
         v.status AS vehicle_status,
         v.sold_at AS vehicle_sold_at
       FROM proposals p
       LEFT JOIN vehicles v
         ON v.id = p.vehicle_id
        AND v.dealership_id = p.dealership_id
       WHERE p.id = $1
         AND p.dealership_id = $2
       FOR UPDATE OF p`,
      [id, dealershipId]
    );

    const proposal = proposalResult.rows[0];
    if (!proposal) {
      const err = new Error("Proposta nao encontrada");
      err.statusCode = 404;
      throw err;
    }

    if (proposal.sale_id || proposal.contract_id || proposal.status === "accepted") {
      const err = new Error("Proposta ja foi aceita");
      err.statusCode = 409;
      err.payload = {
        error: "PROPOSAL_ALREADY_ACCEPTED",
        message: "Esta proposta ja gerou uma venda/contrato."
      };
      throw err;
    }

    if (["rejected", "lost", "canceled", "cancelled"].includes(proposal.status)) {
      const err = new Error("Proposta encerrada nao pode ser aceita");
      err.statusCode = 409;
      err.payload = {
        error: "PROPOSAL_CLOSED",
        message: "Reabra ou crie uma nova proposta antes de gerar venda/contrato."
      };
      throw err;
    }

    if (proposal.vehicle_status === "sold" || proposal.vehicle_sold_at) {
      const err = new Error("Veiculo ja vendido");
      err.statusCode = 409;
      err.payload = {
        error: "VEHICLE_ALREADY_SOLD",
        message: "Nao e possivel aceitar proposta de um veiculo ja vendido."
      };
      throw err;
    }

    const acceptedPrice = data.price ?? proposal.price;
    if (acceptedPrice === undefined || acceptedPrice === null || Number(acceptedPrice) <= 0) {
      const err = new Error("Preco da proposta e obrigatorio para gerar venda.");
      err.statusCode = 400;
      throw err;
    }

    const saleResult = await client.query(
      `INSERT INTO sales
       (dealership_id, vehicle_id, client_id, proposal_id, user_id, price,
        payment_method, notes, approval_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft')
       RETURNING *`,
      [
        dealershipId,
        proposal.vehicle_id,
        proposal.client_id,
        proposal.id,
        data.accepted_by,
        acceptedPrice,
        data.payment_method || null,
        data.notes || proposal.notes || "Venda criada a partir de proposta aceita"
      ]
    );
    const sale = saleResult.rows[0];

    const contractResult = await client.query(
      `INSERT INTO contracts
       (sale_id, dealership_id, version, file_path, hash, status, observations)
       VALUES ($1,$2,1,'draft://proposal-accepted','pending','draft',$3)
       RETURNING *`,
      [
        sale.id,
        dealershipId,
        data.notes || "Contrato rascunho gerado ao aceitar proposta"
      ]
    );
    const contract = contractResult.rows[0];

    const updatedResult = await client.query(
      `UPDATE proposals
       SET status = 'accepted',
           price = $1,
           payment_method = $2,
           accepted_by = $3,
           accepted_at = NOW(),
           sale_id = $4,
           contract_id = $5,
           notes = COALESCE($6, notes),
           updated_at = NOW()
       WHERE id = $7
         AND dealership_id = $8
       RETURNING *`,
      [
        acceptedPrice,
        data.payment_method || null,
        data.accepted_by,
        sale.id,
        contract.id,
        data.notes || null,
        id,
        dealershipId
      ]
    );

    await client.query(
      `INSERT INTO sales_approval_history
       (sale_id, action, performed_by, notes)
       VALUES ($1,'proposal_accepted',$2,$3)`,
      [
        sale.id,
        data.accepted_by,
        data.notes || "Proposta aceita e contrato rascunho criado"
      ]
    );

    await client.query("COMMIT");

    return {
      proposal: updatedResult.rows[0],
      sale,
      contract
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  create,
  findAll,
  update,
  remove,
  acceptAndCreateContract
};
