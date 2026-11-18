const { test } = require('node:test');
const assert = require('node:assert/strict');
const checkout = require('../api/secure-checkout');

test('public checkout needs matching Stripe configuration and supports optional mail delivery', async () => {
  const settings = {
    PULSE_SECURE_ONBOARDING_ENABLED: 'false',
    VERCEL_ENV: 'production',
    PULSE_STRIPE_MODE: 'test',
    PULSE_STRIPE_SECRET_KEY: 'sk_test_fixture',
    PULSE_STRIPE_PRICE_ID: 'price_fixture',
    PULSE_STRIPE_WEBHOOK_SECRET: 'whsec_sandbox',
    PULSE_PUBLIC_ORIGIN: 'https://pulse.example.com',
    PULSE_B2C_TENANT_ID: '5edb34fd-9ac6-4b07-9f6d-3139b8d346ad',
    PULSE_HEALTH_DATA_KEY: Buffer.alloc(32, 1).toString('base64'),
    PULSE_ONBOARDING_SUPABASE_URL: 'https://db.example.com',
    PULSE_ONBOARDING_SUPABASE_SECRET_KEY: 'sb_secret_fixture',
    PULSE_STRIPE_LIVE_WEBHOOK_SECRET: '',
    PULSE_NOTIFY_RESEND_API_KEY: '',
    PULSE_NOTIFY_FROM: '',
    PULSE_NOTIFY_TO: ''
  };
  const before = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]));
  Object.assign(process.env, settings);

  async function availability() {
    const response = {
      setHeader(name, value) { assert.deepEqual([name, value], ['Cache-Control', 'no-store']); },
      status(code) { assert.equal(code, 200); return this; },
      json(result) { assert.deepEqual(Object.keys(result), ['available']); return result.available; }
    };
    return checkout({ method: 'GET' }, response);
  }

  try {
    assert.equal(await availability(), false);
    process.env.PULSE_SECURE_ONBOARDING_ENABLED = 'true';
    assert.equal(await availability(), false);
    process.env.VERCEL_ENV = 'preview';
    assert.equal(await availability(), true);

    Object.assign(process.env, {
      VERCEL_ENV: 'production',
      PULSE_STRIPE_MODE: 'live',
      PULSE_STRIPE_SECRET_KEY: 'sk_live_fixture',
      PULSE_STRIPE_LIVE_WEBHOOK_SECRET: 'whsec_live'
    });
    assert.equal(await availability(), true);
    process.env.PULSE_NOTIFY_RESEND_API_KEY = 're_fixture';
    assert.equal(await availability(), false);
    Object.assign(process.env, {
      PULSE_NOTIFY_RESEND_API_KEY: 're_fixture',
      PULSE_NOTIFY_FROM: 'PULSE <sender@example.com>',
      PULSE_NOTIFY_TO: 'operator@example.com'
    });
    assert.equal(await availability(), true);
    process.env.PULSE_STRIPE_LIVE_WEBHOOK_SECRET = process.env.PULSE_STRIPE_WEBHOOK_SECRET;
    assert.equal(await availability(), false);
  } finally {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
