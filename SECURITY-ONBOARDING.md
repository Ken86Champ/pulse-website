# PULSE B2C onboarding and checkout

Production stays behind `PULSE_SECURE_ONBOARDING_ENABLED`. The landing-page CTAs link to membership details and then to the seven-step form. There is no customer creation until a signed Stripe event confirms the specific subscription was paid.

## Vercel settings

| Variable | Value |
| --- | --- |
| `PULSE_SECURE_ONBOARDING_ENABLED` | `true` only for a configured environment |
| `PULSE_STRIPE_MODE` | `test` in staging, `live` in production |
| `PULSE_STRIPE_SECRET_KEY` | Secret or restricted key of the same mode |
| `PULSE_STRIPE_WEBHOOK_SECRET` | Signing secret for the existing sandbox destination |
| `PULSE_STRIPE_LIVE_WEBHOOK_SECRET` | Separate signing secret for the live Stripe destination |
| `PULSE_STRIPE_PRICE_ID` | Active monthly CHF 98 recurring price for that mode |
| `PULSE_PUBLIC_ORIGIN` | HTTPS origin for that environment with no trailing slash |
| `PULSE_B2C_TENANT_ID` | UUID of the tenant or namespace for this flow |
| `PULSE_ONBOARDING_SUPABASE_URL` | Supabase API URL |
| `PULSE_ONBOARDING_SUPABASE_SECRET_KEY` | Server-only Supabase secret or legacy service-role key |
| `PULSE_HEALTH_DATA_KEY` | 32 random bytes in base64, unique to the environment. Keep an operator-controlled backup |

Keep the existing sandbox destination and use the same path `/api/stripe/webhook` for the live-mode destination. Keep their signing secrets separate. Subscribe both to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `customer.subscription.deleted`, `customer.subscription.updated`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`, `charge.refunded`, `charge.dispute.created`, `radar.early_fraud_warning.created`, and `customer.updated`. Use a dedicated Stripe staging destination with public delivery to that path and keep the other preview routes protected. Use separate staging credentials and data, and require test mode before entering a test card.

On an existing project apply `sql/pulse-checkout-atomic.sql`. For a clean database run `sql/pulse-secure-checkout.sql` first. Successful payment creates one coaching customer in a single database transaction. Successful, failed and expired attempts have their encrypted drafts and draft email cleared. Monitor Stripe for missing deliveries and agree on a backstop retention period for unanswered attempts and paid coaching profiles.

Stripe receives the billing email and a random reference. The complete questionnaire is encrypted using AES-256-GCM before it is written to Supabase. Browser users have no database grants or RLS policies. The Vercel function is configured for Frankfurt and the existing Supabase database is in Zurich. The final onboarding step records separate health consent and acceptance of the membership terms under a versioned policy. Verify the configured subprocessors and live merchant identity before enabling production. Keep health data out of analytics, email, and logs. The verified return page offers an immutable HTML contract receipt for supported policy versions. No additional email provider is called, even if retired notification variables remain configured. Historical unknown policy versions require operator confirmation; current terms are never substituted for the agreed historical terms.

Publish the terms and privacy pages in Stripe’s Public details for the correct merchant account. This flow records acceptance in onboarding before starting the payment. An independently shared Payment Link bypasses the onboarding flow and should be retired if it is replaced by this checkout.

## Manual coaching setup

Use the internal notification's customer UUID. An authorized operator with the secured Supabase and data-key variables can use `node scripts/read-coaching-customer.js <uuid>` in a private terminal. This prints decrypted answers for coaching setup, so do not redirect it into shared logs. The record starts in `coaching_setup_required` and changes to `subscription_cancelled` when the Stripe subscription is cancelled.

In the Stripe Sandbox verify successful payment, a declined card, cancelled checkout, and repeated delivery. Check the customer row, return page and a mobile flow; check downloadable confirmations and the existing dashboard queue. Run `node --test tests/*.test.js` for the server regressions.


## DACH release changes (2026-11-21)

- `node scripts/build-public.js` builds an explicit public asset allowlist. Internal `lib`, `sql`, `scripts`, tests and documentation are not public assets. Server imports remain available to Vercel function tracing.
- `api/support-request.js` stores declarations with an idempotent UUID and returns a persistent receipt (reference, body, timestamp). Legal declarations have dedicated fields and are not blocked by the email-address daily cap for ordinary support questions. IP buckets use the existing HMAC-based throttle.
- `/widerruf.html` and `/abo-kuendigen.html#anfrage` work without account login. Downloaded text receipts do not certify a Stripe mutation or exact contract end. A coach must verify the claimant and resolve the contract, refund or deletion. No automatic financial action occurs.
- Lifecycle reconciliation reads current Stripe state to resist delayed event replays, scopes every lookup to B2C tenant and Stripe mode, and never treats payment as coach approval. Dispute/refund/fraud and failed-payment alerts enter the existing support table; they do not perform refunds or cancellations.
- The added invoice/risk/customer events must be enabled on the existing live webhook destination. Read access alone does not prove these events are configured.
- The dashboard integration, downstream access revocation, plan review and manual approval must be tested against its source and a synthetic customer before claiming end-to-end readiness.
- Legal review is required for durable-medium delivery without email, German and Austrian consumer-law requirements, EU representative, subprocessors/transfer safeguards, health-data DPIA and VAT classification/registration. No production launch certification follows merely from passing unit tests.
