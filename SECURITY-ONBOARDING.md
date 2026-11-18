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
| `PULSE_NOTIFY_RESEND_API_KEY` | Optional Resend send-only key when email delivery is ready |
| `PULSE_NOTIFY_FROM` | Required verified sender when the Resend key is present |
| `PULSE_NOTIFY_TO` | Required operations mailbox when the Resend key is present; in test, both emails go here |

Keep the existing sandbox destination and use the same path `/api/stripe/webhook` for the live-mode destination. Keep their signing secrets separate. Subscribe both to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, and `customer.subscription.deleted`. Use a dedicated Stripe staging destination with public delivery to that path and keep the other preview routes protected. Use separate staging credentials and data, and require test mode before entering a test card.

On an existing project apply `sql/pulse-checkout-atomic.sql`. For a clean database run `sql/pulse-secure-checkout.sql` first. Successful payment creates one coaching customer in a single database transaction. Successful, failed and expired attempts have their encrypted drafts and draft email cleared. Monitor Stripe for missing deliveries and agree on a backstop retention period for unanswered attempts and paid coaching profiles.

Stripe receives the billing email and a random reference. The complete questionnaire is encrypted using AES-256-GCM before it is written to Supabase. Browser users have no database grants or RLS policies. The Vercel function is configured for Frankfurt and the existing Supabase database is in Zurich. The final onboarding step records separate health consent and acceptance of the membership terms under a versioned policy. Verify the configured subprocessors and live merchant identity before enabling production. Keep health data out of analytics, email, and logs. Without Resend, the paid status page supplies the order confirmation; the operator must check the `pulse_coaching_customers` table for `coaching_setup_required` at least daily and contact the buyer manually. The email timestamps remain null until actual mail delivery is enabled.

Publish the terms and privacy pages in Stripe’s Public details for the correct merchant account. This flow records acceptance in onboarding before starting the payment. An independently shared Payment Link bypasses the onboarding flow and should be retired if it is replaced by this checkout.

## Manual coaching setup

Use the internal notification's customer UUID. An authorized operator with the secured Supabase and data-key variables can use `node scripts/read-coaching-customer.js <uuid>` in a private terminal. This prints decrypted answers for coaching setup, so do not redirect it into shared logs. The record starts in `coaching_setup_required` and changes to `subscription_cancelled` when the Stripe subscription is cancelled.

In the Stripe Sandbox verify successful payment, a declined card, cancelled checkout, and repeated delivery. Check the customer row, return page and a mobile flow; check both notifications when Resend is configured. Run `node --test tests/*.test.js` for the server regressions.
