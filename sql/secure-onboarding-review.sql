-- REVIEW BEFORE APPLYING. No production schema has been changed.
-- Protect encrypted health payloads separately from non-health onboarding answers.
alter table public.pulse_onboarding_submissions
  add column if not exists health_encrypted jsonb;
create unique index if not exists pulse_onboarding_submissions_invite_id_unique
  on public.pulse_onboarding_submissions(invite_id);
alter table public.pulse_onboarding_submissions enable row level security;
-- No anon/authenticated policies: server-only access with appropriately protected credentials.
comment on column public.pulse_onboarding_submissions.health_encrypted
  is 'AES-256-GCM authenticated ciphertext envelope; plaintext health fields must never be stored in answers';
