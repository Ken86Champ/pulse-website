// Self-service access to the Stripe Customer Portal without the confirmation page.
//
// The confirmation page opens the portal with the checkout session id. A member
// who wants to cancel a month later no longer has that page. Stripe offers a
// hosted "login link" for exactly this: the member enters the email address of
// the subscription and receives a one-time code. No account system needed here.
//
// The link is configured in Stripe (Settings -> Billing -> Customer portal ->
// Login link) and stored in STRIPE_PORTAL_LOGIN_URL. Only Stripe billing hosts
// are accepted, so a misconfigured value can never send members elsewhere.
// Without a valid value the member lands on the cancellation request form.
const ALLOWED_HOSTS = new Set(['billing.stripe.com']);

function portalLoginUrl() {
  const raw = (process.env.STRIPE_PORTAL_LOGIN_URL || '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && ALLOWED_HOSTS.has(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

module.exports = function (req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end('Method not allowed');
  }
  const target = portalLoginUrl();
  if (req.query?.check === '1') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = 200;
    return res.end(JSON.stringify({ available: Boolean(target) }));
  }
  if (!target) console.error('PULSE portal login link missing or invalid');
  res.statusCode = 302;
  res.setHeader('Location', target || '/abo-kuendigen.html#anfrage');
  return res.end();
};

module.exports.portalLoginUrl = portalLoginUrl;
