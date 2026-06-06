-- ─────────────────────────────────────────────────────────────────────────────
-- Support CPF, RG and SUS card as identification documents
-- ─────────────────────────────────────────────────────────────────────────────

-- Rename cpf → doc_number
ALTER TABLE people RENAME COLUMN cpf TO doc_number;

-- Add doc_type with safe default for existing rows
ALTER TABLE people
  ADD COLUMN doc_type text NOT NULL DEFAULT 'cpf'
  CHECK (doc_type IN ('cpf', 'rg', 'sus'));

-- Drop old unique constraint and index
ALTER TABLE people DROP CONSTRAINT people_event_id_cpf_key;
DROP INDEX people_cpf_event;

-- New unique constraint and index on (event_id, doc_type, doc_number)
ALTER TABLE people
  ADD CONSTRAINT people_event_doc_unique UNIQUE (event_id, doc_type, doc_number);

CREATE INDEX people_doc_event ON people (event_id, doc_type, doc_number);
