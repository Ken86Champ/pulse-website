const assert=require('node:assert/strict');
const test=require('node:test');
const {validate}=require('../lib/onboarding-server');
function fixture(){ return {...require('./fixtures/onboarding'),email:'test@example.com'}; }
test('accepts valid completed onboarding',()=>assert.equal(validate(fixture()).email,'test@example.com'));
test('rejects missing health consent',()=>assert.throws(()=>validate({...fixture(),healthConsent:false})));
test('rejects incomplete yes follow-up',()=>assert.throws(()=>validate({...fixture(),heart:'Ja'})));
test('rejects unknown fields',()=>assert.throws(()=>validate({...fixture(),isAdmin:true})));
test('requires home equipment',()=>assert.throws(()=>validate({...fixture(),location:['Zuhause']})));
test('rejects none plus other equipment',()=>assert.throws(()=>validate({...fixture(),location:['Zuhause'],equipment:['Keines','Laufband']})));
test('accepts home treadmill',()=>assert.deepEqual(validate({...fixture(),location:['Zuhause'],equipment:['Laufband']}).equipment,['Laufband']));
test('rejects oversized text',()=>assert.throws(()=>validate({...fixture(),job:'a'.repeat(1501)})));
test('rejects invalid numeric values, impossible dates and unsupported country codes',()=>{
 for(const fields of [{weight:'900'},{birthDate:'2001-02-29'},{country:'ZZ'},{height:'1e2'},{phone:'-------'}]){
  assert.throws(()=>validate({...fixture(),...fields}));
 }
});
test('requires the selected nutrition and allergy follow-ups',()=>{
 assert.throws(()=>validate({...fixture(),dietStyle:'Andere Ernährungsform'}));
 assert.throws(()=>validate({...fixture(),dietRules:['Andere']}));
 assert.throws(()=>validate({...fixture(),allergyTypes:['Eigene ergänzen']}));
 assert.throws(()=>validate({...fixture(),allergyTypes:['Keine','Soja']}));
 assert.equal(validate({...fixture(),allergyTypes:['Eigene ergänzen','Soja'],allergies:'Test'}).allergies,'Test');
});
