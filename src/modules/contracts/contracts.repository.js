/*
=====================================================
UPDATE CONTRATO (SOMENTE SE DRAFT)
=====================================================
*/

async function update(contractId, data) {
  const query = `
    UPDATE contracts
    SET
      observations = COALESCE($1, observations),
      updated_at = NOW()
    WHERE id = $2
      AND status = 'draft'
    RETURNING *
  `;

  const values = [
    data.observations || null,
    contractId
  ];


  const { rows } = await db.query(query, values);

  if (!rows[0]) {
    throw new Error(
      "Contrato não pode ser editado. Apenas contratos em rascunho podem ser alterados."
    );
  }

  return rows[0];
}
