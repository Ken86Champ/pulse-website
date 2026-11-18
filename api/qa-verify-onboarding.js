const {db}=require('../lib/onboarding-server');
const {decryptHealthData}=require('../lib/health-encryption');
module.exports=async function(req,res){
 if(req.method!=='GET'||process.env.VERCEL_ENV!=='preview'||process.env.PULSE_STRIPE_MODE!=='test') return res.status(404).end();
 try{
  const rows=await db('pulse_coaching_customers','select=encryption_context_id,encrypted_answers,consent_version,status&stripe_checkout_session_id=eq.cs_test_a0y1bUvFSJ672o3rlNuFpSRSnozqbO1gvDVk1XjlrCAvwQQRsiXK4hppD4');
  if(rows.length!==1) return res.status(409).json({customerRows:rows.length});
  const row=rows[0],a=decryptHealthData(row.encrypted_answers,row.encryption_context_id);
  return res.status(200).json({customerRows:1,fieldCount:Object.keys(a).length,completeSyntheticData:a.firstName==='Test'&&a.lastName==='Customer'&&a.heart==='Ja'&&a.heartDetails==='Synthetischer Testeintrag, keine echte Erkrankung.'&&a.days.length===2&&a.termsAccepted===true&&a.healthConsent===true,consentVersionMatches:row.consent_version==='pulse-privacy-terms-v3',status:row.status});
 }catch(e){console.error('QA decryption failed',e.name);return res.status(503).json({error:'QA verification failed'});}
};
