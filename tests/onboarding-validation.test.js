const assert=require('node:assert/strict');
const test=require('node:test');
const {validate}=require('../lib/onboarding-server');
function fixture(){
 const x={};for(const k of 'firstName lastName email phone street postal city country birthDate sex height job activity goal motivation challenge currentTraining plannedTraining days weeklyTime location duration experience diet dietStyle dietRules allergyTypes medicalTreatment medication heart musculoskeletal respiratory metabolic surgery otherHealth smoking source'.split(' '))x[k]='Test';
 return Object.assign(x,{email:'test@example.com',challenge:['Wenig Zeit'],days:['Montag'],location:['Fitnessstudio'],dietRules:['Keine besonderen Regeln'],allergyTypes:['Keine'],medicalTreatment:'Nein',medication:'Nein',heart:'Nein',musculoskeletal:'Nein',respiratory:'Nein',metabolic:'Nein',surgery:'Nein',otherHealth:'Nein',smoking:'Nein',gymMember:'Ja',confirmation:true,healthConsent:true});
}
test('accepts valid completed onboarding',()=>assert.equal(validate(fixture()).email,'test@example.com'));
test('rejects missing health consent',()=>assert.throws(()=>validate({...fixture(),healthConsent:false})));
test('rejects incomplete yes follow-up',()=>assert.throws(()=>validate({...fixture(),heart:'Ja'})));
test('rejects unknown fields',()=>assert.throws(()=>validate({...fixture(),isAdmin:true})));
test('requires home equipment',()=>assert.throws(()=>validate({...fixture(),location:['Zuhause']})));
test('rejects none plus other equipment',()=>assert.throws(()=>validate({...fixture(),location:['Zuhause'],equipment:['Keines','Laufband']})));
test('accepts home treadmill',()=>assert.deepEqual(validate({...fixture(),location:['Zuhause'],equipment:['Laufband']}).equipment,['Laufband']));
test('rejects oversized text',()=>assert.throws(()=>validate({...fixture(),job:'a'.repeat(1501)})));
