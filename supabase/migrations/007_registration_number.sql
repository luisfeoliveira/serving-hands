-- Add professional registration number (CRM, COREN, CRO, CRFa, CRP, etc.)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS registration_number TEXT;
