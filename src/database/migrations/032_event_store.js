// Migration 032 — Event Store + Processed Events + Revenue Snapshots
// Tabelas necessárias para o EventBus com Event Sourcing

module.exports = {
  name: "032_event_store",

  async up(client) {

    // ─── Event Store — todos os eventos do domínio ───────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_store (
        id           TEXT         PRIMARY KEY,
        tenant_id    TEXT         NOT NULL,
        event_name   VARCHAR(200) NOT NULL,
        payload      JSONB        NOT NULL DEFAULT '{}',
        occurred_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_event_store_tenant
        ON event_store (tenant_id, occurred_at ASC)
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_event_store_name
        ON event_store (event_name)
    `)

    // ─── Processed Events — controle de idempotência ─────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS processed_events (
        event_id     TEXT        PRIMARY KEY,
        processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    // ─── Revenue Snapshots — read model de saúde financeira ──────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS revenue_snapshots (
        id             TEXT         DEFAULT gen_random_uuid()::text PRIMARY KEY,
        tenant_id      TEXT         NOT NULL,
        vehicle_score  NUMERIC(5,2) NOT NULL DEFAULT 0,
        lead_score     NUMERIC(5,2) NOT NULL DEFAULT 0,
        channel_score  NUMERIC(5,2) NOT NULL DEFAULT 0,
        global_health  NUMERIC(5,2) NOT NULL DEFAULT 0,
        created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_revenue_snapshots_tenant
        ON revenue_snapshots (tenant_id, created_at DESC)
    `)
  }
}
