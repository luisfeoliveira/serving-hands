-- Collaborators: external contributors registered by admin (no system login)
CREATE TABLE IF NOT EXISTS collaborators (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id   uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  role       text        NOT NULL,
  created_by uuid        REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON collaborators TO service_role;
GRANT ALL ON collaborators TO authenticated;

ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manages collaborators" ON collaborators
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Event expenses tracked by admin
CREATE TABLE IF NOT EXISTS event_expenses (
  id         uuid           DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id   uuid           NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category   text           NOT NULL,
  item       text           NOT NULL,
  unit_value numeric(10, 2) NOT NULL,
  quantity   integer        NOT NULL DEFAULT 1,
  created_by uuid           REFERENCES auth.users(id),
  created_at timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT event_expenses_category_check CHECK (
    category IN (
      'Papelaria', 'Materiais Clínicos', 'Doação',
      'Cedidos', 'Cantina', 'Higiene', 'Sinalização'
    )
  )
);

GRANT ALL ON event_expenses TO service_role;
GRANT ALL ON event_expenses TO authenticated;

ALTER TABLE event_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manages event_expenses" ON event_expenses
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
