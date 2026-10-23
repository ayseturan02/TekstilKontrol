const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const template=require('../shared/reportTemplate');
test('fresh forms have unselected boxes and independent nested values',()=>{
  const a=template.createInitial(),b=template.createInitial();
  for(const value of Object.values(a))if(typeof value==='string')assert.equal(value,'');
  for(const key of ['reason','scope','documents','body','laboratory','result'])assert.equal(a[key],'');
  for(const category of template.categories)assert.equal(a.checks[category].status,'');
  a.checks[template.categories[0]].note='changed';a.quantities.shipment[0]='12';
  assert.equal(b.checks[template.categories[0]].note,'');assert.equal(b.quantities.shipment[0],'');
});
test('old drafts migrate without losing notes or media',()=>{
  const category=template.categories[1],agreement=template.agreements[0][1];
  const d=template.normalizeReport({customer:'Saved',agreement,checks:{[category]:{status:'Hata',note:'Keep this'}},media:[{uri:'file://photo.jpg'}]});
  assert.equal(d.customer,'Saved');assert.deepEqual(d.agreement,[agreement]);assert.equal(d.checks[category].note,'Keep this');assert.equal(d.checks[category].code,'');
  assert.equal(d.sizes.length,5);assert.equal(d.quantities.sample.length,5);assert.equal(d.media.length,1);
});
test('portrait output preserves all eight categories, marks choices and escapes user text',()=>{
  const d=template.createInitial();d.customer='<script>unsafe</script>';d.notes='Line one\nLine two';d.result=template.results[0][1];d.agreement=template.agreements.map(([,text])=>text);
  const html=template.htmlFor(d);
  assert.match(html,/A4 portrait/);assert.ok(!html.includes('<script>unsafe'));assert.ok(html.includes('&lt;script&gt;unsafe&lt;/script&gt;'));
  for(const c of template.categories)assert.ok(html.includes(c));
  assert.equal((html.match(/&#10003;/g)||[]).length,4);assert.ok(html.includes('Line one\nLine two'));
  assert.ok(!html.includes('[object Object]'));assert.ok(!html.includes('undefined'));
});
test('mail body and printable HTML attachment use the same report and preserve media',async t=>{
  const {createApp}=require('../server/app');
  const serverRequire=require('node:module').createRequire(require.resolve('../server/app'));
  const secret='mail-test-secret-at-least-32-characters';
  const token=serverRequire('jsonwebtoken').sign({version:0},secret,{subject:'test-user',expiresIn:'1h'});
  let sent;
  const app=createApp({secret,store:{findById:id=>id==='test-user'?{id,role:'user',authVersion:0}:null},createTransport:()=>({sendMail:async message=>{sent=message;}})});
  const server=await new Promise(resolve=>{const listener=app.listen(0,'127.0.0.1',()=>resolve(listener));});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const endpoint='http://127.0.0.1:'+server.address().port+'/send';
  const d=template.createInitial();d.customer='Customer';d.recipient='recipient@example.com';
  const form=new FormData();form.append('report',JSON.stringify(d));form.append('files',new Blob(['image'],{type:'image/jpeg'}),'photo.jpg');
  const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+token},body:form});
  assert.equal(response.status,200);assert.equal(sent.html,template.htmlFor(d));assert.equal(sent.attachments[0].content,sent.html);assert.equal(sent.attachments[1].filename,'photo.jpg');
  sent=null;d.recipient='recipient@example.com,invalid';const bad=new FormData();bad.append('report',JSON.stringify(d));
  assert.equal((await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+token},body:bad})).status,400);assert.equal(sent,null);
});
