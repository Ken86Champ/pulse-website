// Shared server-only database and onboarding validation utilities.
const crypto = require('node:crypto');
const {encryptHealthData} = require('./health-encryption');
const ALLOWED = new Set('firstName lastName email phone street postal city country birthDate sex height weight job activity goal targetWeight motivation challenge challengeOther currentTraining plannedTraining days weeklyTime location gymMember equipment equipmentOther duration experience diet dietStyle dietStyleOther dietRules dietRulesOther allergyTypes allergies foodDislikes medicalTreatment medicalTreatmentDetails medication medicationDetails heart heartDetails musculoskeletal musculoskeletalDetails respiratory respiratoryDetails metabolic metabolicDetails surgery surgeryDetails otherHealth otherHealthDetails smoking source sourceDetails confirmation'.split(' '));
const ARRAYS = new Set('challenge days location equipment dietRules allergyTypes'.split(' '));
const HEALTH = new Set('medicalTreatment medicalTreatmentDetails medication medicationDetails heart heartDetails musculoskeletal musculoskeletalDetails respiratory respiratoryDetails metabolic metabolicDetails surgery surgeryDetails otherHealth otherHealthDetails smoking'.split(' '));
const required = 'firstName lastName email phone street postal city country birthDate sex height job activity goal motivation challenge currentTraining plannedTraining days weeklyTime location duration experience diet dietStyle dietRules allergyTypes medicalTreatment medication heart musculoskeletal respiratory metabolic surgery otherHealth smoking source confirmation'.split(' ');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validate(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid answers');
 if(Object.keys(raw).length>70)throw new Error('Too many fields');
 const clean={};
 for(const [k,v] of Object.entries(raw)){
  if(!ALLOWED.has(k))throw new Error('Unknown field');
  if(ARRAYS.has(k)){
   if(!Array.isArray(v)||v.length>25||v.some(x=>typeof x!=='string'||x.length>160))throw new Error('Invalid selection');
  }else if(k==='confirmation'){if(v!==true)throw new Error('Confirmation required')}
  else if(typeof v!=='string'||v.length>1500)throw new Error('Invalid value');
  clean[k]=v;
 }
 for(const k of required){if(clean[k]===undefined||clean[k]===''||(Array.isArray(clean[k])&&!clean[k].length))throw new Error('Required field missing: '+k)}
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)||clean.email.length>254)throw new Error('Invalid email');
 for(const k of ['medicalTreatment','medication','heart','musculoskeletal','respiratory','metabolic','surgery','otherHealth']){
  if(!['Ja','Nein'].includes(clean[k]))throw new Error('Invalid health answer');
  if(clean[k]==='Ja'&&!String(clean[k+'Details']||'').trim())throw new Error('Health details required');
  if(clean[k]==='Nein')clean[k+'Details']='';
 }
 if(!['Ja','Nein','Keine Angabe'].includes(clean.smoking))throw new Error('Invalid smoking answer');
 if(!Array.isArray(clean.location)||!clean.location.every(x=>['Fitnessstudio','Zuhause','Draussen'].includes(x)))throw new Error('Invalid location');
 if(clean.location.includes('Fitnessstudio')&&!['Ja','Nein'].includes(clean.gymMember))throw new Error('Gym membership required');
 if(!clean.location.includes('Fitnessstudio'))clean.gymMember='';
 if(clean.location.some(x=>x!=='Fitnessstudio')&&!clean.equipment?.length)throw new Error('Equipment required');
 if(clean.location.length===1&&clean.location[0]==='Fitnessstudio')clean.equipment=[];
 if(clean.equipment?.includes('Keines')&&clean.equipment.length>1)throw new Error('Conflicting equipment');
 if(clean.challenge?.includes('Anderes')&&!String(clean.challengeOther||'').trim())throw new Error('Other challenge required');
 if(clean.equipment?.includes('Anderes')&&!String(clean.equipmentOther||'').trim())throw new Error('Other equipment required');
 return clean;
}
function env(name){const v=process.env[name];if(!v)throw new Error('Missing configuration '+name);return v}
async function db(table,params='',method='GET',body){
 const url=env('PULSE_ONBOARDING_SUPABASE_URL').replace(/\/$/,'');
 if(!/^https:\/\//.test(url))throw new Error('Invalid database URL');
 const secret=env('PULSE_ONBOARDING_SUPABASE_SECRET_KEY');
 const r=await fetch(url+'/rest/v1/'+table+(params?'?'+params:''),{method,headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json',Prefer:'return=representation'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 if(!r.ok)throw new Error('Database operation failed: '+r.status);
 return r.json();
}
function originOk(req){const expected=env('PULSE_PUBLIC_ORIGIN');return req.headers.origin===expected}
function reply(res,status,data){res.setHeader('Cache-Control','no-store');return res.status(status).json(data)}
function encrypted(answers,id){if(!UUID.test(id))throw new Error('Invalid record ID');return encryptHealthData(answers,id)}
module.exports={validate,db,env,originOk,reply,encrypted,HEALTH};
