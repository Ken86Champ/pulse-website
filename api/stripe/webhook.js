
export const config = {
  api: {
    bodyParser: false
  }
};

import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secretKey = process.env.PULSE_STRIPE_SECRET_KEY;
  const webhookSecret = process.env.PULSE_STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return res.status(503).json({
      error: 'Webhook not configured'
    });
  }

  const stripe = new Stripe(secretKey);

  try {
    const chunks = [];

    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }

    const rawBody = Buffer.concat(chunks);

    const event = stripe.webhooks.constructEvent(
      rawBody,
      req.headers['stripe-signature'],
      webhookSecret
    );

    // Vorerst nur Signaturprüfung.
    // Keine Kundendaten speichern oder Abos verändern.
    console.log('Verified Stripe event:', event.id, event.type);

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook verification failed');
    return res.status(400).json({
      error: 'Invalid webhook signature'
    });
  }
}
