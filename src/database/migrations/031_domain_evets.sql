CREATE TABLE IF NOT EXISTS domain_events (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  occurred_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_domain_events_tenant
  ON domain_events (tenant_id);

CREATE INDEX IF NOT EXISTS idx_domain_events_name
  ON domain_events (name);
