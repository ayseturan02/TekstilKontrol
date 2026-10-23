const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {createInitial,normalizeReport,htmlFor}=require('../shared/reportTemplate');
const {layoutForReport,buildPaperDocument}=require('../shared/paperLayout');
const png='data:image/png;base64,iVBORw0KGgo=';

test('signatures survive saving and normalization; unsafe values are rejected',()=>{
 const data={...createInitial(),manufacturerSignature:png,controllerSignature:png};
 assert.equal(normalizeReport(JSON.parse(JSON.stringify(data))).manufacturerSignature,png);
 assert.equal(normalizeReport(data).controllerSignature,png);
 for(const value of ['https://example.com/sign.png','data:image/svg+xml;base64,AAAA','data:image/png;base64,'+'A'.repeat(300001)])assert.equal(normalizeReport({manufacturerSignature:value}).manufacturerSignature,'');
 assert.equal(normalizeReport({manufacturer:'Old draft'}).manufacturerSignature,'');
});

test('signatures print beneath the correct names and fit on the original sheet',()=>{
 const d={...createInitial(),manufacturer:'Factory',controller:'Inspector',manufacturerSignature:png,controllerSignature:png};
 const html=htmlFor(d),geometry=layoutForReport(d);
 assert.equal((html.match(/<img alt="(İmalatçı|Kontrolcü) imzası"/g)||[]).length,2);
 assert.ok(!html.includes('>İmza ekle</button>'));
 for(const role of ['manufacturer','controller']){
  const field=geometry.fields.find(f=>f.path===role);
  assert.ok(field.y+field.h+8+48<=geometry.height);
  assert.ok(html.includes('top:'+(field.y+field.h+8)+'px'));
 }
 assert.equal(geometry.height,1430);
 assert.equal((buildPaperDocument(d,{editable:true}).match(/data-signature="(manufacturer|controller)"/g)||[]).length,2);
});

function setup(viewport){
 const messages=[],slots={},nodes={},ctx={beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},stroke(){},clearRect(){},drawImage(){}};
 class Element{
  constructor(tag='div'){this.tagName=tag;this.style={};this.dataset={};this.children=[];this.attributes={};this._text='';}
  appendChild(el){this.children.push(el);el.parent=this;return el;}
  setAttribute(k,v){this.attributes[k]=v;}
  set textContent(v){this._text=v;this.children=[];}
  get textContent(){return this._text;}
  set innerHTML(value){this.html=value;this.parts={};for(const key of ['canvas','.signature-error','[data-signature-command="clear"]','[data-signature-command="cancel"]','[data-signature-command="save"]'])this.parts[key]=new Element();const pad=this.parts.canvas;pad.width=1000;pad.height=420;pad.getContext=()=>ctx;pad.getBoundingClientRect=()=>({left:0,top:0,width:500,height:210});pad.setPointerCapture=()=>{};pad.toDataURL=()=>png;}
  querySelector(selector){return this.parts?.[selector]||null;}
  querySelectorAll(){return [];}
  focus(){} remove(){this.parent.children=this.parent.children.filter(el=>el!==this);}
 }
 for(const id of ['paper','paper-frame','zoom-back','media-list','media-count'])nodes[id]=new Element();
 for(const role of ['manufacturer','controller']){slots[role]=new Element();slots[role].dataset.signature=role;}
 const document={body:new Element(),documentElement:{clientWidth:400},getElementById:id=>nodes[id],createElement:tag=>new Element(tag),querySelectorAll:selector=>selector==='[data-signature]'?Object.values(slots):[],querySelector:selector=>Object.values(slots).find(el=>selector==='[data-signature="'+el.dataset.signature+'"]')||null,addEventListener(){}};
 const window={visualViewport:viewport,addEventListener(){},ReactNativeWebView:{postMessage:v=>messages.push(JSON.parse(v))}};
 vm.runInNewContext('('+require('../shared/paperScript')+')('+JSON.stringify({data:createInitial(),height:1430,editable:true})+')',{window,document,Image:class{set src(value){this.onload();}}});
 const panel=()=>document.body.children.at(-1).children[0];
 const command=name=>panel().querySelector('[data-signature-command="'+name+'"]');
 const draw=()=>{const pad=panel().querySelector('canvas');const e={pointerId:1,clientX:20,clientY:20,preventDefault(){}};pad.onpointerdown(e);pad.onpointermove({...e,clientX:100,clientY:80});pad.onpointerup(e);};
 return {document,slots,messages,panel,command,draw,window};
}

test('drawing saves to the right signer, cancel preserves data and clear removes saved ink',()=>{
 const app=setup();app.slots.manufacturer.onclick();app.command('save').onclick();
 assert.ok(app.panel().querySelector('.signature-error').textContent);
 app.draw();app.command('save').onclick();
 assert.deepEqual(app.messages.at(-1),{type:'signature',path:'manufacturerSignature',value:png});
 assert.equal(app.slots.manufacturer.children[0].src,png);
 assert.equal(app.slots.controller.children.length,0);
 const count=app.messages.length;app.slots.controller.onclick();app.draw();app.command('cancel').onclick();assert.equal(app.messages.length,count);
 app.slots.controller.onclick();app.draw();app.command('save').onclick();assert.equal(app.messages.at(-1).path,'controllerSignature');
 app.slots.manufacturer.onclick();app.command('clear').onclick();app.command('cancel').onclick();assert.equal(app.slots.manufacturer.children[0].src,png);
 app.slots.manufacturer.onclick();app.command('clear').onclick();app.command('save').onclick();assert.deepEqual(app.messages.at(-1),{type:'signature',path:'manufacturerSignature',value:''});
 assert.equal(app.slots.manufacturer.textContent,'İmza ekle');assert.equal(app.slots.controller.children[0].src,png);
});

test('signature modal follows the visible viewport after zoom and scrolling on Android',()=>{
 const listeners={};
 const viewport={width:420,height:700,offsetLeft:180,offsetTop:364,addEventListener:(type,fn)=>{listeners[type]=fn;},removeEventListener:type=>{delete listeners[type];}};
 const app=setup(viewport);app.slots.manufacturer.onclick();
 const overlay=app.document.body.children.at(-1);
 assert.equal(overlay.style.top,'364px');assert.equal(overlay.style.left,'180px');
 assert.equal(overlay.style.width,'420px');assert.equal(overlay.style.height,'700px');
 viewport.height=480;viewport.offsetTop=120;listeners.resize();
 assert.equal(overlay.style.height,'480px');assert.equal(overlay.style.top,'120px');
 app.command('cancel').onclick();assert.deepEqual(Object.keys(listeners),[]);
 assert.match(buildPaperDocument(createInitial(),{editable:true}),/\.signature-overlay\{position:fixed;top:0;right:0;bottom:0;left:0;/);
});
