const Stripe = require('stripe');
const { db, reply } = require('../lib/onboarding-server');
const { fulfill } = require('../lib/pulse-fulfillment');

async function reconcilePaidSession(id, mode, stripe) {
  const session = await stripe.checkout.sessions.retrieve(id);
  if (session.livemode !== (mode === 'live') || session.payment_status !== 'paid') return false;
  await fulfill({ type: 'checkout.session.completed', data: { object: session } }, mode, stripe);
  return true;
}

module.exports = async function (req, res) {
  if (req.method !== 'GET') return reply(res, 405, { status: 'invalid' });
  if (process.env.PULSE_SECURE_ONBOARDING_ENABLED !== 'true') return reply(res, 503, { status: 'unavailable' });
  const id = req.query?.session_id;
  if (typeof id !== 'string' || !/^cs_(test|live)_[A-Za-z0-9]{15,200}$/.test(id)) return reply(res, 400, { status: 'invalid' });
  if (!id.startsWith(`cs_${process.env.PULSE_STRIPE_MODE}_`)) return reply(res, 404, { status: 'not_found' });

  try {
    if (req.query?.flow === 'trial') {
      const { registerSession } = require('../lib/pulse-trial');
      const filter = `select=id,status,trial_end,stripe_subscription_id,stripe_checkout_session_id&stripe_checkout_session_id=eq.${id}&mode=eq.${process.env.PULSE_STRIPE_MODE}`;
      let [trial] = await db('pulse_trials', filter);
      if (trial?.status === 'awaiting_setup') {
        const stripe = new Stripe(process.env.PULSE_STRIPE_SECRET_KEY, { maxNetworkRetries: 1, timeout: 8000 });
        await registerSession(await stripe.checkout.sessions.retrieve(id), process.env.PULSE_STRIPE_MODE, stripe);
        [trial] = await db('pulse_trials', filter);
      }
      return reply(res, trial ? 200 : 404, { status: trial?.status ?? 'not_found', trialEnd: trial?.trial_end ?? null });
    }
    const filter = `select=status&stripe_checkout_session_id=eq.${id}`;
    let [row] = await db('pulse_checkout_pending', filter);
    // A return from Stripe can arrive before its webhook. Verify payment with
    // Stripe and use the same atomic, idempotent fulfillment as the webhook.
    if (row?.status === 'awaiting_payment') {
      const stripe = new Stripe(process.env.PULSE_STRIPE_SECRET_KEY, { maxNetworkRetries: 1, timeout: 8000 });
      if (await reconcilePaidSession(id, process.env.PULSE_STRIPE_MODE, stripe)) {
        [row] = await db('pulse_checkout_pending', filter);
      }
    }
    const status = row?.status === 'paid' ? 'coaching_setup_required' : row?.status ?? 'not_found';
    return reply(res, row ? 200 : 404, { status });
  } catch {
    return reply(res, 503, { status: 'unavailable' });
  }
};

module.exports.reconcilePaidSession = reconcilePaidSession;
