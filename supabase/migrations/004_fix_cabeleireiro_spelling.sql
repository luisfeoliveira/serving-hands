-- Fix typo: cabelereiro → cabeleireiro in service_type check constraint
-- and update any existing rows with the old spelling.

-- 1. Drop constraint first so UPDATE isn't blocked
ALTER TABLE service_registrations
  DROP CONSTRAINT service_registrations_service_type_check;

-- 2. Backfill rows with old spelling
UPDATE service_registrations
SET service_type = 'cabeleireiro'
WHERE service_type = 'cabelereiro';

-- 3. Re-add constraint with corrected spelling
ALTER TABLE service_registrations
  ADD CONSTRAINT service_registrations_service_type_check
  CHECK (service_type IN (
    'medicina','odontologia','fonoaudiologia','psicologia',
    'servico_social','consultoria_juridica','consultoria_financeira',
    'cabeleireiro','sobrancelha','estetica','bazar'
  ));
