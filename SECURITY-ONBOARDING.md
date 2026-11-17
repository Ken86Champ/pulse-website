# PULSE secure onboarding — implementation gate

Status: **staging branch only**. Do not merge or enable checkout until the gates below pass.

## Data protection
- Browser -> Vercel API: TLS; never send health fields to Stripe or analytics.
- API -> Supabase: TLS and server-side credentials only; no service-role key in HTML.
- Health answers: authenticated AES-256-GCM with unique random 96-bit nonce per record, authenticated with the immutable record UUID as additional data. The secret `PULSE_HEALTH_DATA_KEY` is 32 cryptographically random bytes encoded as base64, configured only in Vercel server environment.
- This is **server-side encryption, not end-to-end encryption**. Authorized PULSE backend services can decrypt. Database at-rest encryption and RLS are separate layers.
- Limit key access, log only non-sensitive event IDs, define key rotation and data deletion procedures. Do not reuse the same key for other products.

## Before enabling any live submission
1. Create server-side authenticated onboarding session with expiring one-time token; never trust tenant/customer IDs from the browser.
2. Validate and normalize all 57 fields server-side; reject unexpected keys and oversized requests. Separate health fields before persistence.
3. Store only encrypted health answers; never persist a plaintext duplicate in `answers`, logs, error traces or emails.
4. Verify consent/version and document health-data processing purpose, retention, deletion and access rights.
5. Enforce rate limits, CSRF/origin protections, token expiry and idempotent finalization.
6. Create Stripe Checkout sessions server-side, with trusted price ID and signed session association. Verify Stripe webhook signature against the raw body; provision only after confirmed paid subscription, not a redirect. Handle retries, duplicate events, failed payments, cancellation and refunds.
7. Verify RLS/role privileges, tenant isolation, restore/backup access, and key separation in production.
8. Run Node test `node --test tests/health-encryption.test.js` plus browser/mobile E2E, webhook replay tests and security review on preview environment.
9. Only after passing checks: merge to main, activate production webhook and payment flow.

## Existing architecture findings
Supabase has `pulse_onboarding_invites`, `pulse_onboarding_drafts`, `pulse_onboarding_submissions` with RLS enabled and no public policies. The existing schema stores JSONB answers and must be adapted to encrypted envelopes before any health data is accepted. Vercel already has Stripe and Supabase server-side environment variables. A dedicated server-side health-data encryption key is now configured for Vercel production, but the feature flag is still disabled. No live customer data was written as part of this branch.

## Implemented in staging branch (2026-11-17)
- `api/secure-checkout.js`: validates completed answers and explicit health consent, encrypts all answers, creates a Stripe subscription Checkout session with fixed server-side price and tenant, and persists encrypted pending state before returning the payment URL.
- `api/pulse-stripe-webhook.js`: verifies Stripe signature on the raw request body using a **separate** webhook signing secret, checks the checkout association and provisions an encrypted customer record idempotently after payment confirmation.
- `api/checkout-status.js` and `onboarding-success.html`: non-sensitive payment status page.
- `pulse_checkout_pending` and `pulse_coaching_customers` created in Supabase with RLS enabled and zero anon/authenticated grants. No customers or payment sessions were created during setup.
- Browser onboarding connects to the gated endpoint only on the staging branch; main/production onboarding unchanged.
- Draft pull request: https://github.com/Ken86Champ/pulse-website/pull/3

## Remaining hard launch gates
- Configure and verify `PULSE_B2C_TENANT_ID` and `PULSE_STRIPE_PRICE_ID` (not yet established). Ensure correct CHF 98 recurring Stripe price.
- Configure `PULSE_PUBLIC_ORIGIN`, dedicated `PULSE_SECURE_STRIPE_WEBHOOK_SECRET`, and test-mode Stripe credentials in an isolated preview environment. Register exact webhook URL in Stripe.
- Obtain final legal/privacy consent text and retention schedule; current `pulse-privacy-v1` is a technical placeholder and not a legal approval.
- Add server-side request throttling and automatic cleanup of abandoned encrypted pending records.
- Configure operational email/notification for manual coaching setup; success page must not promise unimplemented delivery.
- Run end-to-end test-mode checkout and webhook retries/replay, encrypted storage/decryption, payment failure/cancellation, mobile browser, and security review before enabling flag.
- Do not merge or enable `PULSE_SECURE_ONBOARDING_ENABLED` until these gates pass.
