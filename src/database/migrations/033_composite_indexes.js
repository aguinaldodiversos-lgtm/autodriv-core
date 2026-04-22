// Índices compostos para as listagens quentes. Substituem cenários em que
// o planner usava só idx_*_dealership + filter + sort sequencial.
module.exports = {
  name: "033_composite_indexes",

  async up(client) {
    const statements = [
      // leads
      `CREATE INDEX IF NOT EXISTS idx_leads_dealership_status
         ON leads(dealership_id, status);`,
      `CREATE INDEX IF NOT EXISTS idx_leads_dealership_created
         ON leads(dealership_id, created_at DESC);`,

      // vehicles
      `CREATE INDEX IF NOT EXISTS idx_vehicles_dealership_status
         ON vehicles(dealership_id, status);`,
      `CREATE INDEX IF NOT EXISTS idx_vehicles_dealership_created
         ON vehicles(dealership_id, created_at DESC);`,

      // sales
      `CREATE INDEX IF NOT EXISTS idx_sales_dealership_created
         ON sales(dealership_id, created_at DESC);`,

      // lead_conversations
      `CREATE INDEX IF NOT EXISTS idx_lead_conversations_dealership_lead_created
         ON lead_conversations(dealership_id, lead_id, created_at DESC);`
    ];

    for (const sql of statements) {
      await client.query(sql);
    }
  }
};
