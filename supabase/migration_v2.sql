-- Migration v2: Update contract limits and pricing structure
-- Run this in Supabase SQL Editor to sync existing organizations with new tier limits.

-- 1. Update the default value for new organisations (in case the schema update wasn't applied manually)
ALTER TABLE public.organisations ALTER COLUMN contract_limit SET DEFAULT 2;

-- 2. Update existing organisations' limits based on their current plan
UPDATE public.organisations SET contract_limit = 2 WHERE plan = 'free';
UPDATE public.organisations SET contract_limit = 10 WHERE plan = 'starter';
UPDATE public.organisations SET contract_limit = 25 WHERE plan = 'pro';

-- Optional: Log the change
INSERT INTO public.activity_log (action, details)
VALUES ('System migration', '{"description": "Updated contract limits for all tiers: Free(2), Starter(10), Pro(25)"}');
