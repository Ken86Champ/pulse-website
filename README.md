# PULSE Fitness website

Existing static PULSE website and Vercel API functions.

- Checks: `npm test`
- Public assets: `npm run build`
- Deployment: existing GitHub/Vercel project, no new services
- Operational and security notes: [SECURITY-ONBOARDING.md](SECURITY-ONBOARDING.md)

The public website and Stripe checkout are separate from the coaching dashboard. Passing website tests does not establish dashboard approval, tenant isolation in server code, plan quality, invitation delivery or downstream access revocation.
