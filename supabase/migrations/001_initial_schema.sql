-- ─────────────────────────────────────────────────────────────────────────────
-- Ação Social — Initial Schema
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension (already available in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Events ──────────────────────────────────────────────────────────────────

CREATE TABLE events (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       text NOT NULL,
  date       date NOT NULL,
  location   text NOT NULL,
  active     boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Only one event active at a time
CREATE UNIQUE INDEX events_single_active ON events (active) WHERE active = true;

-- ─── Medical Specialties ─────────────────────────────────────────────────────

CREATE TABLE medical_specialties (
  id       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name     text NOT NULL,
  active   boolean NOT NULL DEFAULT true,
  UNIQUE(event_id, name)
);

-- ─── Users (volunteer profiles) ──────────────────────────────────────────────

CREATE TABLE users (
  id            uuid PRIMARY KEY,  -- matches auth.users.id
  name          text NOT NULL,
  role          text NOT NULL CHECK (role IN (
                  'recepcao','controlador','enfermagem','medico',
                  'odontologo','fonoaudiologo','psicologo','assistente_social',
                  'consultor_juridico','consultor_financeiro',
                  'beleza','bazar_controlador','bazar_caixa','admin'
                )),
  service_types text[],  -- for controlador: ['psicologia','servico_social'] etc
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Link users table to Supabase Auth
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ─── People (event attendees) ─────────────────────────────────────────────────

CREATE TABLE people (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id      uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  cpf           text NOT NULL,
  name          text NOT NULL,
  age           integer NOT NULL CHECK (age >= 0 AND age <= 150),
  registered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, cpf)
);

CREATE INDEX people_cpf_event ON people (event_id, cpf);

-- ─── Service Registrations (queue entries) ───────────────────────────────────

CREATE TABLE service_registrations (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id             uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  person_id            uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  service_type         text NOT NULL CHECK (service_type IN (
                         'medicina','odontologia','fonoaudiologia','psicologia',
                         'servico_social','consultoria_juridica','consultoria_financeira',
                         'cabelereiro','sobrancelha','estetica','bazar'
                       )),
  medical_specialty    text,       -- medicina only; set by enfermagem
  chief_complaint      text,       -- medicina only; set at recepcao
  priority             boolean NOT NULL DEFAULT false,
  status               text NOT NULL DEFAULT 'waiting' CHECK (status IN (
                         'waiting','waiting_nursing','nursing_in_progress',
                         'waiting_medico','in_progress','completed','dispensed','abandoned'
                       )),
  position             integer NOT NULL,
  enqueued_at          timestamptz NOT NULL DEFAULT now(),
  nursing_completed_at timestamptz,
  started_at           timestamptz,
  completed_at         timestamptz,
  started_by           uuid REFERENCES users(id),
  completed_by         uuid REFERENCES users(id)
);

-- Initial status for medicina is waiting_nursing; all others start as waiting
-- (enforced at application layer in Server Action)

CREATE INDEX sr_event_service_status ON service_registrations (event_id, service_type, status);
CREATE INDEX sr_person ON service_registrations (person_id);
CREATE INDEX sr_position ON service_registrations (event_id, service_type, position);

-- ─── Health Vitals ────────────────────────────────────────────────────────────

CREATE TABLE health_vitals (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_registration_id uuid NOT NULL REFERENCES service_registrations(id) ON DELETE CASCADE,
  bp_systolic             integer,
  bp_diastolic            integer,
  blood_glucose           numeric(6,1),
  weight                  numeric(5,1),
  temperature             numeric(4,1),
  recorded_by             uuid NOT NULL REFERENCES users(id),
  recorded_at             timestamptz NOT NULL DEFAULT now()
);

-- ─── Appointments (clinical notes) ───────────────────────────────────────────

CREATE TABLE appointments (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_registration_id uuid NOT NULL UNIQUE REFERENCES service_registrations(id) ON DELETE CASCADE,
  data                    jsonb NOT NULL DEFAULT '{}',
  created_by              uuid NOT NULL REFERENCES users(id),
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- ─── Bazar Transactions ───────────────────────────────────────────────────────

CREATE TABLE bazar_transactions (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id       uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  person_id      uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  item_count     integer NOT NULL CHECK (item_count BETWEEN 1 AND 10),
  amount         numeric(8,2) NOT NULL,  -- item_count * 2.00
  payment_method text NOT NULL CHECK (payment_method IN ('cash','pix','card')),
  processed_by   uuid NOT NULL REFERENCES users(id),
  processed_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, person_id)  -- one transaction per person per event
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE people              ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_vitals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazar_transactions  ENABLE ROW LEVEL SECURITY;

-- Helper: is caller an authenticated volunteer?
CREATE OR REPLACE FUNCTION is_volunteer()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND active = true
  );
$$;

-- Helper: get caller role
CREATE OR REPLACE FUNCTION caller_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- Helper: is caller admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT caller_role() = 'admin';
$$;

-- events: all volunteers can read; only admin writes
CREATE POLICY "volunteers read events" ON events
  FOR SELECT USING (is_volunteer());
CREATE POLICY "admin manages events" ON events
  FOR ALL USING (is_admin());

-- medical_specialties: all volunteers read; admin writes
CREATE POLICY "volunteers read specialties" ON medical_specialties
  FOR SELECT USING (is_volunteer());
CREATE POLICY "admin manages specialties" ON medical_specialties
  FOR ALL USING (is_admin());

-- users: volunteers read all (needed to show who processed things); admin writes
CREATE POLICY "volunteers read users" ON users
  FOR SELECT USING (is_volunteer());
CREATE POLICY "admin manages users" ON users
  FOR ALL USING (is_admin());
-- NOTE: no self-insert policy — row is created by trigger on auth.users insert
-- Role assignment is admin-only via service role Server Action

-- people: all volunteers read/write (recepcao registers, others look up)
CREATE POLICY "volunteers manage people" ON people
  FOR ALL USING (is_volunteer());

-- service_registrations: all volunteers read/write
CREATE POLICY "volunteers manage registrations" ON service_registrations
  FOR ALL USING (is_volunteer());

-- health_vitals: all volunteers read; enfermagem/admin write
CREATE POLICY "volunteers read vitals" ON health_vitals
  FOR SELECT USING (is_volunteer());
CREATE POLICY "enfermagem or admin write vitals" ON health_vitals
  FOR INSERT WITH CHECK (
    caller_role() IN ('enfermagem','admin')
  );

-- appointments: all volunteers read; relevant professionals write
CREATE POLICY "volunteers read appointments" ON appointments
  FOR SELECT USING (is_volunteer());
CREATE POLICY "professionals write appointments" ON appointments
  FOR INSERT WITH CHECK (
    caller_role() IN (
      'medico','odontologo','fonoaudiologo','psicologo','assistente_social',
      'consultor_juridico','consultor_financeiro','admin'
    )
  );

-- bazar_transactions: bazar roles + admin
CREATE POLICY "bazar read" ON bazar_transactions
  FOR SELECT USING (is_volunteer());
CREATE POLICY "bazar_caixa or admin write" ON bazar_transactions
  FOR INSERT WITH CHECK (
    caller_role() IN ('bazar_caixa','admin')
  );

-- ─── Auth trigger: auto-create user row on signup ────────────────────────────
--
-- When admin creates a volunteer account in Supabase Auth, this trigger inserts
-- a row in public.users with:
--   role = 'recepcao'   (safe default — admin must change it)
--   active = false      (must be activated by admin before login works)
--
-- This means volunteers can never self-assign roles or activate themselves.
-- All role/activation changes go through admin Server Actions (service role).

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, role, active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'recepcao',
    false
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

-- ─── Grants (required when creating tables via raw SQL, not the dashboard) ───

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Allow users to always read their own row (needed for post-login profile fetch)
CREATE POLICY "user reads own row" ON users
  FOR SELECT USING (id = auth.uid());

-- ─── Seed: Create the IV Edition event ───────────────────────────────────────

INSERT INTO events (name, date, location, active)
VALUES (
  'Ação Social IV Edição',
  '2026-06-06',
  'Escola Municipal Paulo Leivas Macalão',
  true
);
