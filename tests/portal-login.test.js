const test=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/portal-login');
function call(method,env){
 const old=process.env.STRIPE_PORTAL_LOGIN_URL;
 if(env===undefined)delete process.env.STRIPE_PORTAL_LOGIN_URL;else process.env.STRIPE_PORTAL_LOGIN_URL=env;
 const headers={};const res={statusCode:200,setHeader:(k,v)=>{headers[k.toLowerCase()]=v},end:()=>{}};
 const origError=console.error;console.error=()=>{};
 try{handler({method},res);}finally{console.error=origError;if(old===undefined)delete process.env.STRIPE_PORTAL_LOGIN_URL;else process.env.STRIPE_PORTAL_LOGIN_URL=old;}
 return {status:res.statusCode,location:headers.location};
}
test('redirects to the configured Stripe portal login link',()=>{
 assert.deepEqual(call('GET','https://billing.stripe.com/p/login/abc123'),{status:302,location:'https://billing.stripe.com/p/login/abc123'});
});
test('falls back to the request form without a link',()=>{
 assert.deepEqual(call('GET',undefined),{status:302,location:'/abo-kuendigen.html#anfrage'});
});
test('never redirects to a foreign host',()=>{
 assert.equal(call('GET','https://evil.example/p/login/abc').location,'/abo-kuendigen.html#anfrage');
 assert.equal(call('GET','http://billing.stripe.com/p/login/abc').location,'/abo-kuendigen.html#anfrage');
 assert.equal(call('GET','not a url').location,'/abo-kuendigen.html#anfrage');
});
test('rejects other methods',()=>assert.equal(call('POST','https://billing.stripe.com/p/login/abc').status,405));
