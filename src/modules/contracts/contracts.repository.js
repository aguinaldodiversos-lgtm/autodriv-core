// src/modules/contracts/contracts.repository.js

const db = require("../../config/db");

async function findSaleById(saleId) {
  const query = `
    SELECT s.*, 
           c.name as client_name,
           c.document as client_document,
           c.rg as client_rg,
           c.address as client_address,
           d.name as dealership_name,
           d.cnpj as dealership_cnpj,
           d.address as dealership_address,
           d.city as dealership_city,
           d.state as dealership_state
    FROM sales s
    LEFT JOIN clients c ON c.id = s.client_id
    LEFT JOIN dealerships d ON d.id = s.dealership_id
    WHERE s.id = $1
  `;

  const { rows } = await db.query(query, [saleId]);
  return rows[0];
}

async function getNextVersion(saleId, client) {
  const query = `
    SELECT COALESCE(MAX(version), 0) + 1 as next_version
    FROM contracts
    WHERE sale_id = $1
    FOR UPDATE
  `;

  const { rows } = await client.query(query, [saleId]);
  return rows[0].next_version;
}

async function createContractRecord(data, client) {
  const query = `
    INSERT INTO contracts 
    (sale_id, version, file_path, hash, dealership_id, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING *
  `;

  const values = [
    data.sale_id,
    data.version,
    data.file_path,
    data.hash,
    data.dealership_id
  ];

  const { rows } = await client.query(query, values);
  return rows[0];
}

module.exports = {
  findSaleById,
  getNextVersion,
  createContractRecord
};
