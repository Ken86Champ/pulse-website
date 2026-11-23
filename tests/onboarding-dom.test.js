'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const schema=require('../onboarding-schema');
const fixture=require('./fixtures/onboarding');
const root=join(__dirname,'..');
async function page(locale='en'){
 let html=readFileSync(join(root,'onboarding.html'),'utf8');
 for(const name of ['onboarding-schema.js','checkout-availability.js'])html=html.replace(`<script src="/${name}"></script>`,`<script>${readFileSync(join(root,name),'utf8')}</script>`);
 const errors=[],requests=[];
 const console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url:'https://audit.example/onboarding.html?lang='+locale,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console,beforeParse(w){w.scrollTo=()=>{};w.fetch=async(url,options)=>{requests.push({url,options});if(options?.method==='POST')return {ok:false,json:async()=>({error:'simulated failure'})};return {ok:true,json:async()=>({available:true})}}}});
 await new Promise(setImmediate);
 return {dom,w:dom.window,d:dom.window.document,errors,requests};
}
const flush=()=>new Promise(setImmediate);
function change(p,id,value){const input=p.d.querySelector(`[data-key="${id}"]`);assert.ok(input,`missing control ${id}`);if(input.type==='checkbox')input.checked=value;else input.value=value;input.dispatchEvent(new p.w.Event('change',{bubbles:true}));}
async function complete(p,g,overrides={}){
 const values={...fixture,...overrides};
 for(const [id,,type] of g.fields){
  if(values[id]===undefined)continue;
  const control=p.d.querySelector(`[data-key="${id}"]`);assert.ok(control,`missing ${id}`);
  if(type==='multi'||type==='equipment'){for(const c of control.querySelectorAll('input')){c.checked=values[id].includes(c.value);c.dispatchEvent(new p.w.Event('change',{bubbles:true}));}}
  else change(p,id,values[id]);
 }
 await flush();p.d.querySelector('#chat form').dispatchEvent(new p.w.Event('submit',{bubbles:true,cancelable:true}));await flush();
}
async function healthPage(){const p=await page();for(const g of schema.groups.slice(0,5))await complete(p,g);assert.match(p.d.querySelector('#chat h2').textContent,/Health/);return p;}
test('native changes reveal and clear health follow-ups; required errors remain in English and have an accessible description',async()=>{
 const p=await healthPage();try{
  for(const id of ['medicalTreatment','medication','heart','musculoskeletal','respiratory','metabolic','surgery','otherHealth','smoking'])change(p,id,'Nein');
  change(p,'heart','Ja');await flush();
  const details=p.d.querySelector('[data-key="heartDetails"]');assert.equal(details.closest('[data-followup]').hidden,false);
  p.d.querySelector('#chat form').dispatchEvent(new p.w.Event('submit',{cancelable:true,bubbles:true}));await flush();
  assert.match(p.d.querySelector('#chat h2').textContent,/Health/);assert.equal(details.getAttribute('aria-invalid'),'true');
  assert.match(p.d.getElementById(details.getAttribute('aria-describedby')).textContent,/Required field:/);assert.doesNotMatch(p.d.querySelector('#chat').textContent,/Pflichtfeld/);
  change(p,'heart','Nein');await flush();assert.equal(details.closest('[data-followup]').hidden,true);
  p.d.querySelector('#chat form').dispatchEvent(new p.w.Event('submit',{cancelable:true,bubbles:true}));await flush();assert.match(p.d.querySelector('#chat h2').textContent,/Final/);assert.deepEqual(p.errors,[]);
 }finally{p.dom.window.close()}
});
test('all seven steps preserve synthetic answers and reach an editable review; failed checkout remains retryable without live requests',async()=>{
 const p=await page();try{
  for(const g of schema.groups)await complete(p,g);
  assert.match(p.d.querySelector('#chat h2').textContent,/coaching profile/);assert.equal(p.d.querySelectorAll('#chat details').length,7);
  const button=[...p.d.querySelectorAll('button')].find(b=>b.textContent==='Continue to secure checkout');assert.ok(button);assert.equal(button.hidden,false);button.click();await flush();
  assert.equal(button.disabled,false);assert.match(p.d.querySelector('[role="alert"]').textContent,/not available/);
  assert.equal(p.requests.filter(r=>r.options?.method==='POST').length,1);assert.equal(p.requests.at(-1).url,'/api/secure-checkout');assert.equal(p.w.localStorage.length,0);assert.equal(p.w.sessionStorage.length,0);assert.deepEqual(p.errors,[]);
 }finally{p.dom.window.close()}
});
test('language changes retain contact draft and URL, group inputs have an accessible name, and current health consent is translated',async()=>{
 const p=await page('de');try{
  change(p,'firstName','Synthetic');p.d.querySelector('select[aria-label="Language"]').value='en';p.d.querySelector('select[aria-label="Language"]').dispatchEvent(new p.w.Event('change',{bubbles:true}));await flush();
  assert.equal(p.d.querySelector('[data-key="firstName"]').value,'Synthetic');assert.equal(new URL(p.w.location.href).searchParams.get('lang'),'en');
  for(const [i,g] of schema.groups.slice(0,6).entries()){if(i===2){const group=p.d.querySelector('[data-key="challenge"]');assert.equal(group.getAttribute('role'),'group');assert.match(p.d.getElementById(group.getAttribute('aria-labelledby')).textContent,/Biggest challenges/)}await complete(p,g);}
  const consent=p.d.querySelector('[data-key="healthConsent"]').closest('label').textContent;assert.match(consent,/I expressly consent/);assert.match(consent,/USA/);assert.doesNotMatch(consent,/Ich willige/);
  const before=new p.w.Event('beforeunload',{cancelable:true});p.w.dispatchEvent(before);assert.equal(before.defaultPrevented,true);assert.deepEqual(p.errors,[]);
 }finally{p.dom.window.close()}
});
