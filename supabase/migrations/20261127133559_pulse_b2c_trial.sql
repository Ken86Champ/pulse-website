-- Der Gratis-Test beginnt erst nach bereitgestelltem Zugang. Bestehende Käufe bleiben unverändert.
alter table public.pulse_coaching_customers alter column stripe_subscription_id drop not null;

create table if not exists public.pulse_trials (
 id uuid primary key,
 tenant_id uuid not null,
 email text,
 stripe_checkout_session_id text not null unique,
 stripe_customer_id text unique,
 stripe_payment_method_id text,
 stripe_subscription_id text unique,
 customer_id uuid unique references public.pulse_coaching_customers(id),
 app_customer_id uuid unique,
 mode text not null check (mode in ('test','live')),
 price_id text not null,
 locale text not null,
 encrypted_answers jsonb,
 consent_version text not null,
 attempt_fingerprint text,
 status text not null default 'awaiting_setup'
  check (status in ('awaiting_setup','awaiting_access','activating','trialing','active','cancelled')),
 cancel_requested boolean not null default false,
 ready_at timestamptz,
 trial_end timestamptz,
 lease_until timestamptz,
 created_at timestamptz not null default now()
);
alter table public.pulse_trials enable row level security;
revoke all on public.pulse_trials from public, anon, authenticated;
grant select, insert, update, delete on public.pulse_trials to service_role;
create unique index if not exists pulse_trial_email_once on public.pulse_trials(tenant_id, mode, lower(email))
 where customer_id is not null;

create or replace function public.pulse_register_trial(p_id uuid, p_session text, p_customer text, p_payment_method text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare t public.pulse_trials%rowtype; kunde uuid;
begin
 select * into t from public.pulse_trials where id=p_id and stripe_checkout_session_id=p_session for update;
 if not found then raise exception 'Testanmeldung fehlt'; end if;
 if t.status='cancelled' then return null; end if;
 if t.customer_id is not null then
  if t.stripe_customer_id<>p_customer or t.stripe_payment_method_id<>p_payment_method then raise exception 'Zuordnung stimmt nicht'; end if;
  return t.customer_id;
 end if;
 if t.status<>'awaiting_setup' or t.encrypted_answers is null then raise exception 'Testanmeldung nicht offen'; end if;
 -- Serialisiert auch zwei gleichzeitig abgeschlossene Checkout-Sitzungen derselben Person.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(t.tenant_id::text||t.mode||lower(t.email),0));
 if exists(select 1 from public.pulse_trials where tenant_id=t.tenant_id and mode=t.mode and lower(email)=lower(t.email) and customer_id is not null) then
  raise exception 'Gratis-Test bereits registriert';
 end if;
 insert into public.pulse_coaching_customers
 (tenant_id,email,stripe_checkout_session_id,stripe_customer_id,stripe_subscription_id,encryption_context_id,encrypted_answers,consent_version)
 values(t.tenant_id,t.email,p_session,p_customer,null,t.id,t.encrypted_answers,t.consent_version)
 returning id into kunde;
 update public.pulse_trials set customer_id=kunde,stripe_customer_id=p_customer,stripe_payment_method_id=p_payment_method,
  status='awaiting_access',encrypted_answers=null,attempt_fingerprint=null where id=p_id;
 return kunde;
end; $$;

create or replace function public.pulse_claim_trial(p_id uuid,p_tenant uuid,p_app_customer uuid)
returns setof public.pulse_trials language plpgsql security invoker set search_path = '' as $$
declare t public.pulse_trials%rowtype;
begin
 select * into t from public.pulse_trials where id=p_id and tenant_id=p_tenant for update;
 if not found or t.customer_id is null or t.cancel_requested or t.status in ('cancelled','awaiting_setup') then return; end if;
 if t.app_customer_id is not null and t.app_customer_id<>p_app_customer then raise exception 'Kundenzuordnung stimmt nicht'; end if;
 if t.stripe_subscription_id is not null then return next t; return; end if;
 if t.lease_until>now() then return; end if;
 -- Bei unklarem Netzfehler niemals nach Ablauf der Stripe-Idempotenz ein zweites Abo erzeugen.
 if t.ready_at is not null and t.ready_at<now()-interval '20 hours' then raise exception 'Teststart manuell abgleichen'; end if;
 update public.pulse_trials set status='activating',app_customer_id=p_app_customer,
  ready_at=coalesce(ready_at,date_trunc('second',now())),
  trial_end=coalesce(trial_end,date_trunc('second',now())+interval '7 days'),lease_until=now()+interval '2 minutes'
 where id=p_id returning * into t;
 return next t;
end; $$;

create or replace function public.pulse_finish_trial(p_id uuid,p_subscription text,p_end timestamptz)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare t public.pulse_trials%rowtype;
begin
 select * into t from public.pulse_trials where id=p_id for update;
 if not found or t.customer_id is null or t.trial_end is distinct from p_end
  or (t.stripe_subscription_id is not null and t.stripe_subscription_id<>p_subscription) then raise exception 'Testabo stimmt nicht'; end if;
 update public.pulse_trials set stripe_subscription_id=p_subscription,
  status=case when cancel_requested then 'cancelled' else 'trialing' end,lease_until=null where id=p_id;
 update public.pulse_coaching_customers set stripe_subscription_id=p_subscription,stripe_subscription_status='trialing'
 where id=t.customer_id;
 return t.cancel_requested;
end; $$;

create or replace function public.pulse_cancel_trial(p_id uuid,p_session text)
returns setof public.pulse_trials language plpgsql security invoker set search_path = '' as $$
declare t public.pulse_trials%rowtype;
begin
 select * into t from public.pulse_trials where id=p_id and stripe_checkout_session_id=p_session for update;
 if not found then return; end if;
 if t.status='active' then raise exception 'Bezahlte Mitgliedschaft im Kundenportal verwalten'; end if;
 update public.pulse_trials set cancel_requested=true,status='cancelled',encrypted_answers=null,attempt_fingerprint=null
 where id=p_id returning * into t;
 if t.customer_id is not null then
  update public.pulse_coaching_customers set status='subscription_cancelled' where id=t.customer_id;
 end if;
 return next t;
end; $$;

revoke all on function public.pulse_register_trial(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.pulse_claim_trial(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.pulse_finish_trial(uuid,text,timestamptz) from public,anon,authenticated;
revoke all on function public.pulse_cancel_trial(uuid,text) from public,anon,authenticated;
grant execute on function public.pulse_register_trial(uuid,text,text,text) to service_role;
grant execute on function public.pulse_claim_trial(uuid,uuid,uuid) to service_role;
grant execute on function public.pulse_finish_trial(uuid,text,timestamptz) to service_role;
grant execute on function public.pulse_cancel_trial(uuid,text) to service_role;
