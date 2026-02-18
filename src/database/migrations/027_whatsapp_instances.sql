CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id SERIAL PRIMARY KEY,
  dealership_id INTEGER NOT NULL,
  name TEXT,
  phone TEXT,
  status TEXT DEFAULT 'disconnected',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_whatsapp_dealership
    FOREIGN KEY (dealership_id)
    REFERENCES dealerships(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_whatsapp_instances_dealership
ON whatsapp_instances(dealership_id);
