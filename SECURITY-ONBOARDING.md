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
Supabase has `pulse_onboarding_invites`, `pulse_onboarding_drafts`, `pulse_onboarding_submissions` with RLS enabled and no public policies. The existing schema stores JSONB answers and must be adapted to encrypted envelopes before any health data is accepted. Vercel already has Stripe and Supabase server-side environment variables. A separate health-data encryption key has **not been configured**. No live customer data was written as part of this branch.
