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
test('mail attaches the rendered PDF instead of HTML and preserves media',async t=>{
  const {createApp}=require('../server/app');
  let sent, rendered;
  const pdf=Buffer.from('%PDF-1.7\nTest report');
  const app=createApp({renderPdf:async report=>{rendered=report;return pdf;},createTransport:()=>({sendMail:async message=>{sent=message;}})});
  const server=await new Promise(resolve=>{const listener=app.listen(0,'127.0.0.1',()=>resolve(listener));});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const endpoint='http://127.0.0.1:'+server.address().port+'/send';
  const d=template.createInitial();d.customer='Customer';d.recipient='recipient@example.com';
  const form=new FormData();form.append('report',JSON.stringify(d));form.append('files',new Blob(['image'],{type:'image/jpeg'}),'photo.jpg');
  const response=await fetch(endpoint,{method:'POST',body:form});
  assert.equal(response.status,200);assert.deepEqual(rendered,d);assert.equal(sent.html,undefined);assert.equal(sent.attachments[0].filename,'Kontrol-Raporu.pdf');assert.equal(sent.attachments[0].contentType,'application/pdf');assert.equal(sent.attachments[0].content,pdf);assert.equal(sent.attachments[1].filename,'photo.jpg');
  sent=null;d.recipient='recipient@example.com,invalid';const bad=new FormData();bad.append('report',JSON.stringify(d));
  assert.equal((await fetch(endpoint,{method:'POST',body:bad})).status,400);assert.equal(sent,null);
});

test('PDF rendering failure stops delivery instead of sending an incomplete report',async t=>{
 const {createApp}=require('../server/app');let sent=false;
 const app=createApp({renderPdf:async()=>{throw Error('Render failed');},createTransport:()=>({sendMail:async()=>{sent=true;}})});
 const server=await new Promise(resolve=>{const listener=app.listen(0,'127.0.0.1',()=>resolve(listener));});t.after(()=>new Promise(resolve=>server.close(resolve)));
 const form=new FormData();form.append('report',JSON.stringify({...template.createInitial(),recipient:'recipient@example.com'}));
 const response=await fetch('http://127.0.0.1:'+server.address().port+'/send',{method:'POST',body:form});assert.equal(response.status,500);assert.match((await response.json()).error,/PDF/);assert.equal(sent,false);
});
