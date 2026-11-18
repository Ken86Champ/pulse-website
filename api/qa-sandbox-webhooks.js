const Stripe = require('stripe');
const ID='we_1UYUS5RmmPGdnm9MXNAVu1SO';
const PUBLIC='https://pulse-website-xi.vercel.app/api/stripe/webhook';
const EVENT='evt_1UdArLRmmPGdnm9M4FXSMyOi';
module.exports = async function(req,res){
  if(req.method!=='GET'||process.env.VERCEL_ENV!=='preview'||process.env.PULSE_STRIPE_MODE!=='test') return res.status(404).end();
  try {
    const stripe=new Stripe(process.env.PULSE_STRIPE_SECRET_KEY);
    const current=await stripe.webhookEndpoints.retrieve(ID);
    const origin=process.env.PULSE_PUBLIC_ORIGIN;
    const target=origin+'/api/stripe/webhook?x-vercel-protection-bypass='+process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    if(req.query.op==='point'){
      if(!process.env.VERCEL_AUTOMATION_BYPASS_SECRET||current.url!==PUBLIC) return res.status(409).json({error:'Unexpected webhook state'});
      await stripe.webhookEndpoints.update(ID,{url:target});
    } else if(req.query.op==='restore') {
      if(!current.url.startsWith(origin+'/api/stripe/webhook?x-vercel-protection-bypass=')) return res.status(409).json({error:'Unexpected webhook state'});
      await stripe.webhookEndpoints.update(ID,{url:PUBLIC});
    } else if(req.query.op==='replay') {
      if(!process.env.VERCEL_AUTOMATION_BYPASS_SECRET||!process.env.PULSE_STRIPE_WEBHOOK_SECRET||!current.url.startsWith(origin+'/api/stripe/webhook?')) return res.status(409).json({error:'Unexpected webhook state'});
      const event=await stripe.events.retrieve(EVENT);
      if(event.type!=='checkout.session.completed'||event.data.object.id!=='cs_test_a0y1bUvFSJ672o3rlNuFpSRSnozqbO1gvDVk1XjlrCAvwQQRsiXK4hppD4') return res.status(409).json({error:'Unexpected event'});
      const payload=JSON.stringify(event);
      const signature=Stripe.webhooks.generateTestHeaderString({payload,secret:process.env.PULSE_STRIPE_WEBHOOK_SECRET});
      const response=await fetch(target,{method:'POST',headers:{'stripe-signature':signature,'content-type':'application/json'},body:payload});
      return res.status(200).json({replayStatus:response.status,webhookResult:await response.json().catch(()=>({error:'non-json'}))});
    }
    let payment,events;
    const sessions=['cs_test_a04ZzEMEsPG8EGL7VbtjY0DJeG4WGkmTV4h1wQrLTWWNXm10H150E58VVd','cs_test_a0y1bUvFSJ672o3rlNuFpSRSnozqbO1gvDVk1XjlrCAvwQQRsiXK4hppD4'];
    if(sessions.includes(req.query.session)){
      const s=await stripe.checkout.sessions.retrieve(req.query.session);
      payment={status:s.status,payment_status:s.payment_status,mode:s.mode,livemode:s.livemode,has_subscription:Boolean(s.subscription)};
      const list=await stripe.events.list({types:['checkout.session.completed'],limit:20});
      events=list.data.filter(e=>e.data.object.id===s.id).map(e=>({id:e.id,type:e.type,pending_webhooks:e.pending_webhooks,created:e.created}));
    }
    return res.status(200).json({webhookUrl:(req.query.op==='point'?target:req.query.op==='restore'?PUBLIC:current.url).split('?')[0],status:current.status,payment,events,automationBypassConfigured:Boolean(process.env.VERCEL_AUTOMATION_BYPASS_SECRET)});
  }catch(e){console.error('QA webhook maintenance failed',e.type||e.name,e.statusCode||'');return res.status(503).json({error:'QA maintenance failed'});}
};
