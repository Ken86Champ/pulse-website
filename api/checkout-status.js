const {db,reply}=require('../lib/onboarding-server');
module.exports=async function(req,res){
 if(req.method!=='GET')return reply(res,405,{error:'Method not allowed'});
 if(process.env.PULSE_SECURE_ONBOARDING_ENABLED!=='true')return reply(res,503,{status:'unavailable'});
 const id=String(req.query?.session_id||'');
 if(!/^cs_(test_)?[A-Za-z0-9_]{15,200}$/.test(id))return reply(res,400,{status:'invalid'});
 try{
  const r=await db('pulse_checkout_pending','select=status&stripe_checkout_session_id=eq.'+encodeURIComponent(id)+'&limit=1');
  if(!r.length)return reply(res,404,{status:'not_found'});
  return reply(res,200,{status:r[0].status==='paid'?'coaching_setup_required':'awaiting_payment'});
 }catch(e){return reply(res,503,{status:'unavailable'})}
};
