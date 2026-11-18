-- Additive, non-destructive tables for the PULSE B2C secure checkout flow.
-- Encrypted answers contain ALL onboarding data, including health information.
create table if not exists public.pulse_checkout_pending (
 id uuid primary key,
 tenant_id uuid not null,
 email text not null,
 stripe_checkout_session_id text not null unique,
 encrypted_answers jsonb,
 consent_version text not null,
 status text not null default 'awaiting_payment' check(status in ('awaiting_payment','paid')),
 created_at timestamptz not null default now()
);
create table if not exists public.pulse_coaching_customers (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null,
 email text not null,
 stripe_checkout_session_id text not null unique,
 stripe_customer_id text not null,
 stripe_subscription_id text not null unique,
 encryption_context_id uuid not null,
 encrypted_answers jsonb not null,
 consent_version text not null,
 status text not null default 'coaching_setup_required',
 created_at timestamptz not null default now()
);
alter table public.pulse_checkout_pending enable row level security;
alter table public.pulse_coaching_customers enable row level security;
revoke all on public.pulse_checkout_pending from anon, authenticated;
revoke all on public.pulse_coaching_customers from anon, authenticated;
create index if not exists pulse_checkout_pending_created_at_idx on public.pulse_checkout_pending(created_at);
create index if not exists pulse_coaching_customers_tenant_idx on public.pulse_coaching_customers(tenant_id);
-- Pending abandoned records must be deleted by a scheduled retention job after 24 hours.
-- Only server-held credentials may access these tables. No public RLS policies.
