ALTER TABLE lead_ai_state
ADD COLUMN IF NOT EXISTS lead_score TEXT DEFAULT 'cold';
