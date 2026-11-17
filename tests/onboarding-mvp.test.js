const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {validate}=require('../lib/onboarding-server');
const {encryptHealthData,decryptHealthData}=require('../lib/health-encryption');
const sample={
 firstName:'Test',lastName:'Customer',email:'test@example.org',phone:'+41790000000',street:'Teststrasse 1',postal:'9000',city:'St. Gallen',country:'CH',
 birthDate:'1990-01-01',sex:'Keine Angabe',height:'175',weight:'75',job:'Office',activity:'Überwiegend sitzend',goal:'Muskelaufbau',motivation:'Gesund bleiben',
 challenge:['Wenig Zeit'],currentTraining:'Noch gar nicht',plannedTraining:'3× pro Woche',days:['Montag'],weeklyTime:'2–3 Stunden',
 location:['Fitnessstudio'],gymMember:'Ja',equipment:[],duration:'30–45 Minuten',experience:'Einsteiger',diet:'Nein',
 dietStyle:'Allesesser / Mischkost',dietRules:['Keine besonderen Regeln'],allergyTypes:['Keine'],
 medicalTreatment:'Nein',medication:'Nein',heart:'Nein',musculoskeletal:'Nein',respiratory:'Nein',metabolic:'Nein',surgery:'Nein',otherHealth:'Nein',smoking:'Nein',
 source:'Google',confirmation:true,healthConsent:true
};
test('accepts a complete gym-only onboarding',()=>assert.equal(validate(sample).email,sample.email));
test('requires explicit health consent',()=>assert.throws(()=>validate({...sample,healthConsent:false})));
test('rejects unknown fields',()=>assert.throws(()=>validate({...sample,admin:true})));
test('rejects missing positive health details',()=>assert.throws(()=>validate({...sample,heart:'Ja'})));
test('accepts detailed positive health answer',()=>assert.equal(validate({...sample,heart:'Ja',heartDetails:'Test detail'}).heartDetails,'Test detail'));
test('requires equipment for home training',()=>assert.throws(()=>validate({...sample,location:['Zuhause'],gymMember:'',equipment:[]})));
test('rejects conflicting none and equipment',()=>assert.throws(()=>validate({...sample,location:['Zuhause'],gymMember:'',equipment:['Keines','Kurzhanteln']})));
test('rejects invalid email',()=>assert.throws(()=>validate({...sample,email:'not-email'})));
test('encrypted data roundtrip and context isolation',()=>{
 process.env.PULSE_HEALTH_DATA_KEY=crypto.randomBytes(32).toString('base64');
 const id=crypto.randomUUID(),other=crypto.randomUUID();
 const envelope=encryptHealthData({heart:'Ja',heartDetails:'Test'},id);
 assert.deepEqual(decryptHealthData(envelope,id),{heart:'Ja',heartDetails:'Test'});
 assert.throws(()=>decryptHealthData(envelope,other));
});
