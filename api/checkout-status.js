const { db, reply } = require('../lib/onboarding-server');

module.exports = async function (req, res) {
  if (req.method !== 'GET') return reply(res, 405, { status: 'invalid' });
  if (process.env.PULSE_SECURE_ONBOARDING_ENABLED !== 'true') return reply(res, 503, { status: 'unavailable' });
  const id = req.query?.session_id;
  if (typeof id !== 'string' || !/^cs_(test|live)_[A-Za-z0-9]{15,200}$/.test(id)) return reply(res, 400, { status: 'invalid' });
  if (!id.startsWith(`cs_${process.env.PULSE_STRIPE_MODE}_`)) return reply(res, 404, { status: 'not_found' });

  try {
    const [row] = await db('pulse_checkout_pending', `select=status&stripe_checkout_session_id=eq.${id}`);
    const status = row?.status === 'paid' ? 'coaching_setup_required' : row?.status ?? 'not_found';
    return reply(res, row ? 200 : 404, { status });
  } catch {
    return reply(res, 503, { status: 'unavailable' });
  }
};
