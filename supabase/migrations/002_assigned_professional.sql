-- Track which professional is assigned to each service registration.
-- Used by service controllers to assign waiting patients to available professionals.
-- Applies to all services except cabeleireiro and bazar (self-managed flows).

ALTER TABLE service_registrations
  ADD COLUMN assigned_to uuid REFERENCES users(id);

CREATE INDEX sr_assigned_to
  ON service_registrations (assigned_to)
  WHERE assigned_to IS NOT NULL;
