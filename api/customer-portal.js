const Stripe=require('stripe');
const {db,config,reply}=require('../lib/onboarding-server');
const SESSION=/^cs_(test|live)_[A-Za-z0-9]{15,200}$/;
module.exports=async function(req,res){
 if(req.method!=='POST')return reply(res,405,{error:'Method not allowed'});
 if(process.env.PULSE_SECURE_ONBOARDING_ENABLED!=='true')return reply(res,503,{error:'Unavailable'});
 try{
  const {stripeKey,mode,origin}=config();
  if(req.headers.origin!==origin)return reply(res,403,{error:'Invalid origin'});
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return reply(res,415,{error:'JSON required'});
  if(Number(req.headers['content-length']||0)>1024)return reply(res,413,{error:'Payload too large'});
  const id=req.body?.session_id;
  if(typeof id!=='string'||!SESSION.test(id)||!id.startsWith('cs_'+mode+'_'))return reply(res,400,{error:'Invalid session'});
  const [customer]=await db('pulse_coaching_customers','select=stripe_customer_id,stripe_checkout_session_id,status&stripe_checkout_session_id=eq.'+encodeURIComponent(id)+'&limit=1');
  if(!customer?.stripe_customer_id||customer.stripe_checkout_session_id!==id)return reply(res,404,{error:'Membership not found'});
  const stripe=new Stripe(stripeKey,{maxNetworkRetries:1,timeout:8000});
  const checkout=await stripe.checkout.sessions.retrieve(id);
  let verified=checkout.mode==='subscription'&&checkout.payment_status==='paid';
  if(checkout.mode==='setup'&&checkout.status==='complete'){
   const [trial]=await db('pulse_trials','select=customer_id&stripe_checkout_session_id=eq.'+encodeURIComponent(id)+'&mode=eq.'+mode+'&limit=1');
   verified=Boolean(trial?.customer_id);
  }
  if(checkout.livemode!==(mode==='live')||checkout.customer!==customer.stripe_customer_id||!verified)return reply(res,403,{error:'Membership not verified'});
  const portal=await stripe.billingPortal.sessions.create({customer:customer.stripe_customer_id,return_url:origin+'/abo-kuendigen.html'});
  if(!portal.url||new URL(portal.url).protocol!=='https:')throw new Error('Invalid portal URL');
  return reply(res,200,{url:portal.url});
 }catch(error){console.error('PULSE portal unavailable',error.type||error.name,error.statusCode||'');return reply(res,503,{error:'Portal unavailable; use email cancellation'});}
};
