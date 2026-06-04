-- Evangelism records: spiritual interventions during the event
CREATE TABLE IF NOT EXISTS evangelism_records (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id       uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  person_id      uuid        REFERENCES people(id),
  person_name    text        NOT NULL,
  prayer         boolean     NOT NULL DEFAULT false,
  conversion     boolean     NOT NULL DEFAULT false,
  reconciliation boolean     NOT NULL DEFAULT false,
  recorded_by    uuid        REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS evangelism_unique_registered
  ON evangelism_records (event_id, person_id)
  WHERE person_id IS NOT NULL;

GRANT ALL ON evangelism_records TO service_role;
GRANT ALL ON evangelism_records TO authenticated;

ALTER TABLE evangelism_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evangelism team manages records" ON evangelism_records
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('evangelism', 'admin')
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('evangelism', 'admin')
  );
