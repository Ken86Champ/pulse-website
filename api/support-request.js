const {db,reply}=require('../lib/onboarding-server');
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return reply(res,405,{error:'Method not allowed'});
 try{
  const expected=process.env.PULSE_PUBLIC_ORIGIN;
  if(!expected||req.headers.origin!==expected)return reply(res,403,{error:'Invalid origin'});
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return reply(res,415,{error:'JSON required'});
  if(Number(req.headers['content-length']||0)>4096)return reply(res,413,{error:'Too large'});
  const input=req.body||{};
  const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
  const type=input.type;
  const message=typeof input.message==='string'?input.message.trim():'';
  if(!EMAIL.test(email)||email.length>254||!['cancellation','billing','other'].includes(type)||message.length<10||message.length>1500)return reply(res,400,{error:'Please check your details'});
  if(input.website)return reply(res,200,{ok:true});
  const since=encodeURIComponent(new Date(Date.now()-86400000).toISOString());
  const existing=await db('pulse_support_requests','select=id&email=eq.'+encodeURIComponent(email)+'&created_at=gte.'+since+'&limit=4');
  if(existing.length>=3)return reply(res,429,{error:'Too many requests; contact support'});
  const inserted=await db('pulse_support_requests','', 'POST',{email,request_type:type,message,status:'open',source:'website'});
  if(!inserted)return reply(res,503,{error:'Could not save request'});
  // A ticket is stored first; notification is best-effort, never a precondition for receipt.
  if(process.env.PULSE_NOTIFY_RESEND_API_KEY?.trim()&&process.env.PULSE_NOTIFY_FROM?.trim()&&process.env.PULSE_NOTIFY_TO?.trim()){
   try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.PULSE_NOTIFY_RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.PULSE_NOTIFY_FROM,to:[process.env.PULSE_NOTIFY_TO],subject:'PULSE Support: '+type,text:'Anfrage: '+type+'\nE-Mail: '+email+'\n\n'+message}),signal:AbortSignal.timeout(7000)});
    if(!response.ok)console.error('PULSE support notification failed',response.status);
   }catch(e){console.error('PULSE support notification failed',e.name);}
  }
  return reply(res,201,{ok:true});
 }catch(e){console.error('PULSE support request error',e.name);return reply(res,503,{error:'Request could not be sent'});}
};
