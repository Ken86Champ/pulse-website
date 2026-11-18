const Stripe = require('stripe');
module.exports = async function(req,res){
  if(req.method!=='GET'||process.env.VERCEL_ENV!=='preview'||process.env.PULSE_STRIPE_MODE!=='test') return res.status(404).end();
  try {
    const stripe=new Stripe(process.env.PULSE_STRIPE_SECRET_KEY);
    const endpoints=await stripe.webhookEndpoints.list({limit:100});
    const pulse=endpoints.data.filter(x=>x.url.includes('pulse-website')&&x.url.includes('/api/stripe/webhook'));
    return res.status(200).json({endpoints:pulse.map(x=>({id:x.id,url:x.url.split('?')[0],status:x.status,events:x.enabled_events})),automationBypassConfigured:Boolean(process.env.VERCEL_AUTOMATION_BYPASS_SECRET)});
  }catch(e){console.error('QA webhook inspection failed',e.type||e.name,e.statusCode||'');return res.status(503).json({error:'QA inspection failed'});}
};
