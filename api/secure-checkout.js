// Secure checkout: no health data is sent to Stripe; all answers encrypted before persistence.
// Intentionally disabled until required secrets, price, tenant and tests are configured.
const crypto=require('node:crypto');
const {validate,db,env,originOk,reply,encrypted}=require('../lib/onboarding-server');
module.exports=async function(req,res){
 if(req.method!=='POST')return reply(res,405,{error:'Method not allowed'});
 if(process.env.PULSE_SECURE_ONBOARDING_ENABLED!=='true')return reply(res,503,{error:'Checkout not enabled'});
 try{
  if(!originOk(req))return reply(res,403,{error:'Invalid origin'});
  if(Number(req.headers['content-length']||0)>32768)return reply(res,413,{error:'Payload too large'});
  const answers=validate(req.body?.answers);
  if(req.body?.consentVersion!=='pulse-privacy-v1')return reply(res,400,{error:'Privacy consent required'});
  const tenantId=env('PULSE_B2C_TENANT_ID'),priceId=env('PULSE_STRIPE_PRICE_ID');
  if(!/^[0-9a-f-]{36}$/i.test(tenantId)||!/^price_/.test(priceId))throw new Error('Invalid tenant/price configuration');
  const id=crypto.randomUUID();
  const cipher=encrypted(answers,id);
  const Stripe=require('stripe');
  const stripe=new Stripe(env('PULSE_STRIPE_SECRET_KEY'));
  const origin=env('PULSE_PUBLIC_ORIGIN');
  const session=await stripe.checkout.sessions.create({
   mode:'subscription',line_items:[{price:priceId,quantity:1}],
   customer_email:answers.email.trim().toLowerCase(),
   client_reference_id:id,
   metadata:{pulse_pending_id:id,pulse_tenant_id:tenantId},
   subscription_data:{metadata:{pulse_pending_id:id,pulse_tenant_id:tenantId}},
   success_url:origin+'/onboarding-success.html?session_id={CHECKOUT_SESSION_ID}',
   cancel_url:origin+'/onboarding.html?checkout=cancelled'
  },{idempotencyKey:'pulse_checkout_'+id});
  try{
   await db('pulse_checkout_pending','','POST',{
    id,tenant_id:tenantId,email:answers.email.trim().toLowerCase(),
    stripe_checkout_session_id:session.id,encrypted_answers:cipher,
    consent_version:'pulse-privacy-v1',status:'awaiting_payment'
   });
  }catch(e){await stripe.checkout.sessions.expire(session.id).catch(()=>{});throw e}
  return reply(res,200,{checkoutUrl:session.url});
 }catch(e){
  if(/Invalid|Required|missing|Conflicting|Too many|Unknown|Health details|Equipment required|Gym membership|Other challenge|Other equipment|Confirmation/.test(e.message))return reply(res,400,{error:e.message});
  return reply(res,503,{error:'Checkout temporarily unavailable'});
 }
};
