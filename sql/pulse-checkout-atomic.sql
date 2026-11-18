-- Extends the existing server-only checkout tables. Apply after pulse-secure-checkout.sql.
alter table public.pulse_checkout_pending add column if not exists attempt_fingerprint text;
alter table public.pulse_checkout_pending alter column email drop not null;
alter table public.pulse_checkout_pending drop constraint if exists pulse_checkout_pending_status_check;
alter table public.pulse_checkout_pending add constraint pulse_checkout_pending_status_check
  check (status in ('awaiting_payment', 'paid', 'cancelled', 'payment_failed'));

alter table public.pulse_coaching_customers add column if not exists notified_at timestamptz,
  add column if not exists confirmed_at timestamptz;

create table if not exists public.pulse_checkout_throttle (
  bucket text not null,
  window_started_at timestamptz not null,
  attempts integer not null,
  primary key (bucket, window_started_at)
);
alter table public.pulse_checkout_throttle enable row level security;
revoke all on public.pulse_checkout_throttle from public, anon, authenticated;
grant select, insert, update, delete on public.pulse_checkout_throttle to service_role;

create or replace function public.pulse_allow_checkout(p_bucket text)
returns boolean
language plpgsql security invoker set search_path = ''
as $$
declare v_attempts integer;
begin
  delete from public.pulse_checkout_throttle where window_started_at < now() - interval '1 hour';
  insert into public.pulse_checkout_throttle as throttle (bucket, window_started_at, attempts)
  values (p_bucket, date_bin(interval '10 minutes', now(), timestamptz '2020-01-01'), 1)
  on conflict (bucket, window_started_at) do update set attempts = throttle.attempts + 1
    where throttle.attempts < 20
  returning attempts into v_attempts;
  return v_attempts is not null;
end;
$$;

create or replace function public.pulse_save_checkout(
  p_id uuid, p_tenant uuid, p_email text, p_session text, p_answers jsonb, p_consent text, p_fingerprint text
)
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  insert into public.pulse_checkout_pending
    (id, tenant_id, email, stripe_checkout_session_id, encrypted_answers, consent_version, attempt_fingerprint)
  values (p_id, p_tenant, p_email, p_session, p_answers, p_consent, p_fingerprint)
  on conflict (id) do nothing;
  if not exists (
    select 1 from public.pulse_checkout_pending
    where id = p_id and stripe_checkout_session_id = p_session
      and attempt_fingerprint = p_fingerprint and status = 'awaiting_payment'
  ) then raise exception 'Checkout attempt already used'; end if;
end;
$$;

create or replace function public.pulse_finalize_checkout(
  p_id uuid, p_session text, p_customer text, p_subscription text, p_terminal_status text default null
)
returns table (customer_id uuid, notified_at timestamptz, confirmed_at timestamptz)
language plpgsql security invoker set search_path = ''
as $$
declare v_draft public.pulse_checkout_pending%rowtype;
begin
  select * into v_draft
  from public.pulse_checkout_pending
  where id = p_id and stripe_checkout_session_id = p_session
  for update;

  if not found then raise exception 'Checkout attempt missing'; end if;

  if p_terminal_status is not null then
    if p_terminal_status not in ('cancelled', 'payment_failed') then raise exception 'Invalid checkout status'; end if;
    update public.pulse_checkout_pending
    set status = p_terminal_status, encrypted_answers = null, email = null, attempt_fingerprint = null
    where id = p_id and status = 'awaiting_payment';
    return;
  end if;

  if v_draft.status = 'awaiting_payment' then
    insert into public.pulse_coaching_customers
      (tenant_id, email, stripe_checkout_session_id, stripe_customer_id, stripe_subscription_id,
       encryption_context_id, encrypted_answers, consent_version)
    values (v_draft.tenant_id, v_draft.email, p_session, p_customer, p_subscription,
      p_id, v_draft.encrypted_answers, v_draft.consent_version)
    on conflict (stripe_checkout_session_id) do nothing;
    update public.pulse_checkout_pending
    set status = 'paid', encrypted_answers = null, email = null, attempt_fingerprint = null
    where id = p_id;
  elsif v_draft.status <> 'paid' then
    raise exception 'Paid checkout already terminated';
  end if;

  return query
    select customer.id, customer.notified_at, customer.confirmed_at
    from public.pulse_coaching_customers customer
    where customer.stripe_checkout_session_id = p_session
      and customer.stripe_subscription_id = p_subscription and customer.stripe_customer_id = p_customer;
  if not found then raise exception 'Checkout customer does not match'; end if;
end;
$$;

revoke all on function public.pulse_allow_checkout(text) from public, anon, authenticated;
revoke all on function public.pulse_save_checkout(uuid, uuid, text, text, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.pulse_finalize_checkout(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.pulse_allow_checkout(text) to service_role;
grant execute on function public.pulse_save_checkout(uuid, uuid, text, text, jsonb, text, text) to service_role;
grant execute on function public.pulse_finalize_checkout(uuid, text, text, text, text) to service_role;
