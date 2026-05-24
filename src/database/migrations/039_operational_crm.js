module.exports = {
  name: "039_operational_crm",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lead_sources (
        id SERIAL PRIMARY KEY,
        dealership_id INT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        name TEXT NOT NULL,
        provider TEXT NOT NULL,
        channel TEXT NOT NULL DEFAULT 'portal',
        status TEXT NOT NULL DEFAULT 'active'
          CHECK (status IN ('active', 'paused', 'archived')),
        auth_token TEXT,
        config JSONB NOT NULL DEFAULT '{}'::jsonb,
        last_ingested_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (dealership_id, key)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_lead_sources_dealership_provider
      ON lead_sources (dealership_id, provider, status);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pipeline_stages (
        id SERIAL PRIMARY KEY,
        dealership_id INT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        name TEXT NOT NULL,
        position INT NOT NULL DEFAULT 0,
        color TEXT,
        is_won BOOLEAN NOT NULL DEFAULT FALSE,
        is_lost BOOLEAN NOT NULL DEFAULT FALSE,
        sla_hours INT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (dealership_id, key)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS lead_close_reasons (
        id SERIAL PRIMARY KEY,
        dealership_id INT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('won', 'lost')),
        name TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (dealership_id, type, name)
      );
    `);

    await pool.query(`
      INSERT INTO pipeline_stages
        (dealership_id, key, name, position, color, sla_hours, is_won, is_lost)
      SELECT d.id, stage.key, stage.name, stage.position, stage.color,
             stage.sla_hours, stage.is_won, stage.is_lost
      FROM dealerships d
      CROSS JOIN (
        VALUES
          ('new', 'Novo lead', 10, '#2563eb', 1, false, false),
          ('contacted', 'Contato iniciado', 20, '#0891b2', 4, false, false),
          ('qualifying', 'Qualificacao', 30, '#7c3aed', 12, false, false),
          ('proposal', 'Proposta', 40, '#ca8a04', 24, false, false),
          ('visit_scheduled', 'Visita agendada', 50, '#ea580c', 12, false, false),
          ('won', 'Ganho', 90, '#16a34a', null, true, false),
          ('lost', 'Perdido', 100, '#dc2626', null, false, true)
      ) AS stage(key, name, position, color, sla_hours, is_won, is_lost)
      ON CONFLICT (dealership_id, key) DO NOTHING;
    `);

    await pool.query(`
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS lead_source_id INT REFERENCES lead_sources(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS pipeline_stage_id INT REFERENCES pipeline_stages(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS close_reason_id INT REFERENCES lead_close_reasons(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS close_reason_note TEXT,
      ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_stage_changed_at TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ;
    `);

    await pool.query(`
      UPDATE leads l
      SET pipeline_stage_id = ps.id,
          last_stage_changed_at = COALESCE(l.last_stage_changed_at, l.created_at, NOW()),
          sla_due_at = COALESCE(
            l.sla_due_at,
            CASE
              WHEN ps.sla_hours IS NULL THEN NULL
              ELSE COALESCE(l.created_at, NOW()) + (ps.sla_hours || ' hours')::interval
            END
          )
      FROM pipeline_stages ps
      WHERE ps.dealership_id = l.dealership_id
        AND ps.key = COALESCE(NULLIF(l.status, ''), 'new')
        AND l.pipeline_stage_id IS NULL;
    `);

    await pool.query(`
      UPDATE leads l
      SET pipeline_stage_id = ps.id
      FROM pipeline_stages ps
      WHERE ps.dealership_id = l.dealership_id
        AND ps.key = 'new'
        AND l.pipeline_stage_id IS NULL;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage
      ON leads (dealership_id, pipeline_stage_id, last_stage_changed_at);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_sla
      ON leads (dealership_id, sla_due_at)
      WHERE closed_at IS NULL;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS inbox_threads (
        id SERIAL PRIMARY KEY,
        dealership_id INT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
        lead_id INT REFERENCES leads(id) ON DELETE SET NULL,
        lead_source_id INT REFERENCES lead_sources(id) ON DELETE SET NULL,
        channel TEXT NOT NULL,
        external_thread_id TEXT,
        subject TEXT,
        status TEXT NOT NULL DEFAULT 'open'
          CHECK (status IN ('open', 'waiting_customer', 'waiting_seller', 'closed', 'archived')),
        assigned_user_id INT REFERENCES users(id) ON DELETE SET NULL,
        claimed_by INT REFERENCES users(id) ON DELETE SET NULL,
        claimed_at TIMESTAMPTZ,
        sla_due_at TIMESTAMPTZ,
        last_message_at TIMESTAMPTZ,
        unread_count INT NOT NULL DEFAULT 0,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_inbox_threads_external
      ON inbox_threads (dealership_id, channel, external_thread_id)
      WHERE external_thread_id IS NOT NULL;
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_inbox_threads_status
      ON inbox_threads (dealership_id, status, last_message_at DESC);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_inbox_threads_lead
      ON inbox_threads (lead_id);
    `);

    await pool.query(`
      ALTER TABLE lead_conversations
      ADD COLUMN IF NOT EXISTS inbox_thread_id INT REFERENCES inbox_threads(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS channel TEXT,
      ADD COLUMN IF NOT EXISTS direction TEXT,
      ADD COLUMN IF NOT EXISTS external_message_id TEXT,
      ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_lead_conversations_thread
      ON lead_conversations (inbox_thread_id, created_at);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS message_templates (
        id SERIAL PRIMARY KEY,
        dealership_id INT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        channel TEXT NOT NULL DEFAULT 'whatsapp',
        category TEXT,
        body TEXT NOT NULL,
        variables JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (dealership_id, name)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS lead_ingestion_events (
        id SERIAL PRIMARY KEY,
        dealership_id INT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
        lead_source_id INT REFERENCES lead_sources(id) ON DELETE SET NULL,
        provider TEXT NOT NULL,
        external_id TEXT,
        dedupe_key TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        status TEXT NOT NULL DEFAULT 'received'
          CHECK (status IN ('received', 'processed', 'duplicate', 'failed')),
        lead_id INT REFERENCES leads(id) ON DELETE SET NULL,
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (dealership_id, dedupe_key)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pipeline_activities (
        id SERIAL PRIMARY KEY,
        dealership_id INT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
        lead_id INT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        from_stage_id INT REFERENCES pipeline_stages(id) ON DELETE SET NULL,
        to_stage_id INT REFERENCES pipeline_stages(id) ON DELETE SET NULL,
        type TEXT NOT NULL DEFAULT 'note',
        title TEXT,
        description TEXT,
        next_action_at TIMESTAMPTZ,
        created_by INT REFERENCES users(id) ON DELETE SET NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_pipeline_activities_lead
      ON pipeline_activities (lead_id, created_at DESC);
    `);

    await pool.query(`
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS birth_date DATE,
      ADD COLUMN IF NOT EXISTS preferred_contact_channel TEXT,
      ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_sale_opportunities (
        id SERIAL PRIMARY KEY,
        dealership_id INT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
        opportunity_key TEXT NOT NULL,
        client_id INT REFERENCES clients(id) ON DELETE SET NULL,
        lead_id INT REFERENCES leads(id) ON DELETE SET NULL,
        vehicle_id INT REFERENCES vehicles(id) ON DELETE SET NULL,
        sale_id INT REFERENCES sales(id) ON DELETE SET NULL,
        type TEXT NOT NULL,
        reason TEXT NOT NULL,
        suggested_action TEXT NOT NULL,
        due_at TIMESTAMPTZ,
        assigned_user_id INT REFERENCES users(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'done', 'dismissed')),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (dealership_id, opportunity_key)
      );
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_post_sale_due
      ON post_sale_opportunities (dealership_id, status, due_at);
    `);

    await pool.query(`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS purchase_price NUMERIC,
      ADD COLUMN IF NOT EXISTS acquisition_cost NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS acquisition_source TEXT,
      ADD COLUMN IF NOT EXISTS appraisal_status TEXT DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS appraised_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS preparation_status TEXT DEFAULT 'not_started',
      ADD COLUMN IF NOT EXISTS preparation_cost_estimate NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS preparation_cost_actual NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS market_price_low NUMERIC,
      ADD COLUMN IF NOT EXISTS market_price_avg NUMERIC,
      ADD COLUMN IF NOT EXISTS market_price_high NUMERIC,
      ADD COLUMN IF NOT EXISTS last_market_check_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS ad_quality_score INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS ad_status TEXT DEFAULT 'draft';
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicle_appraisals (
        id SERIAL PRIMARY KEY,
        dealership_id INT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
        vehicle_id INT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        appraised_by INT REFERENCES users(id) ON DELETE SET NULL,
        condition_score INT,
        checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
        estimated_repair_cost NUMERIC DEFAULT 0,
        suggested_purchase_price NUMERIC,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicle_preparation_tasks (
        id SERIAL PRIMARY KEY,
        dealership_id INT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
        vehicle_id INT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'doing', 'done', 'cancelled')),
        estimated_cost NUMERIC DEFAULT 0,
        actual_cost NUMERIC DEFAULT 0,
        supplier TEXT,
        due_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicle_preparation_tasks_vehicle
      ON vehicle_preparation_tasks (vehicle_id, status);
    `);
  }
};
