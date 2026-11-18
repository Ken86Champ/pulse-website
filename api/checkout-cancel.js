const Stripe = require('stripe');
const { db, config, reply, UUID } = require('../lib/onboarding-server');

module.exports = async function (req, res) {
  if (req.method !== 'POST') return reply(res, 405, { status: 'invalid' });
  if (process.env.PULSE_SECURE_ONBOARDING_ENABLED !== 'true') return reply(res, 503, { status: 'unavailable' });
  const id = req.body?.attemptId;
  if (typeof id !== 'string' || !UUID.test(id)) return reply(res, 400, { status: 'invalid' });

  try {
    const { stripeKey, origin, mode } = config();
    if (req.headers.origin !== origin) return reply(res, 403, { status: 'invalid' });
    const [pending] = await db('pulse_checkout_pending', `select=status,stripe_checkout_session_id&id=eq.${id}`);
    if (!pending || !pending.stripe_checkout_session_id.startsWith(`cs_${mode}_`)) {
      return reply(res, 404, { status: 'not_found' });
    }
    if (pending.status !== 'awaiting_payment') return reply(res, 200, { status: pending.status });

    const stripe = new Stripe(stripeKey, { timeout: 8000 });
    const sessionId = pending.stripe_checkout_session_id;
    let session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status === 'open') {
      try {
        session = await stripe.checkout.sessions.expire(sessionId);
      } catch (error) {
        // A concurrent payment can complete the session while cancellation is in flight.
        session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.status === 'open') throw error;
      }
    }
    if (session.status !== 'expired') return reply(res, 409, { status: 'payment_processing' });
    await db('rpc/pulse_finalize_checkout', '', 'POST', {
      p_id: id, p_session: sessionId, p_customer: null, p_subscription: null, p_terminal_status: 'cancelled'
    });
    return reply(res, 200, { status: 'cancelled' });
  } catch {
    return reply(res, 503, { status: 'unavailable' });
  }
};
