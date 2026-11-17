// Stripe raw-body verified webhook. Never logs or sends health data to Stripe.
const {db,env,reply}=require('../lib/onboarding-server');
module.exports.config={api:{bodyParser:false}};
async function raw(req){const chunks=[];let total=0;for await(const chunk of req){total+=chunk.length;if(total>1048576)throw new Error('Oversized webhook');chunks.push(chunk)}return Buffer.concat(chunks)}
module.exports=async function(req,res){
 if(req.method!=='POST')return reply(res,405,{error:'Method not allowed'});
 if(process.env.PULSE_SECURE_ONBOARDING_ENABLED!=='true')return reply(res,503,{error:'Webhook not enabled'});
 let event;
 try{
  const Stripe=require('stripe');const stripe=new Stripe(env('PULSE_STRIPE_SECRET_KEY'));
  event=stripe.webhooks.constructEvent(await raw(req),req.headers['stripe-signature'],env('PULSE_SECURE_STRIPE_WEBHOOK_SECRET'));
  if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
   const s=event.data.object;
   if(s.mode!=='subscription'||s.payment_status!=='paid')return reply(res,200,{received:true});
   const pendingId=s.client_reference_id;
   if(!/^[0-9a-f-]{36}$/i.test(pendingId))throw new Error('Invalid checkout reference');
   const matches=await db('pulse_checkout_pending','select=*&id=eq.'+pendingId+'&stripe_checkout_session_id=eq.'+encodeURIComponent(s.id)+'&limit=1');
   const pending=matches[0];if(!pending)throw new Error('Unknown checkout session');
   if(pending.status==='paid')return reply(res,200,{received:true});
   if(pending.email!==s.customer_details?.email?.trim().toLowerCase())throw new Error('Checkout email mismatch');
   if(!s.subscription||!s.customer)throw new Error('Missing Stripe subscription');
   const existing=await db('pulse_coaching_customers','select=id&stripe_checkout_session_id=eq.'+encodeURIComponent(s.id)+'&limit=1');
   if(!existing.length){
    await db('pulse_coaching_customers','','POST',{
     tenant_id:pending.tenant_id,email:pending.email,stripe_checkout_session_id:s.id,encryption_context_id:pending.id,
     stripe_customer_id:s.customer,stripe_subscription_id:s.subscription,
     encrypted_answers:pending.encrypted_answers,consent_version:pending.consent_version,
     status:'coaching_setup_required'
    });
   }
   await db('pulse_checkout_pending','id=eq.'+pendingId,'PATCH',{status:'paid',encrypted_answers:null});
  }
  if(event.type==='customer.subscription.deleted'){
   const subscription=event.data.object;
   await db('pulse_coaching_customers','stripe_subscription_id=eq.'+encodeURIComponent(subscription.id),'PATCH',{status:'subscription_cancelled'});
  }
  return reply(res,200,{received:true});
 }catch(e){
  // Non-2xx makes Stripe retry transient provisioning errors. No PII in response.
  return reply(res,400,{error:'Webhook verification or provisioning failed'});
 }
};
