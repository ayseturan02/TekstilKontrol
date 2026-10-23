const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {buildPaperDocument} = require('../shared/paperLayout');
const {createInitial} = require('../shared/reportTemplate');
function setup(value = '', viewport) {
  class Element {
    constructor(tag = 'DIV') {this.className = ''; this.tagName = tag; this.style = {}; this.children = []; this.dataset = {}; this.listeners = {}; this.attributes = {}; this.value = ''; this._text = '';}
    set textContent(text) {this._text = text; this.children = [];} get textContent() {return this._text;}
    appendChild(item) {this.children.push(item); item.parent=this; return item;}
    remove(){this.parent.children=this.parent.children.filter(item=>item!==this);}
    querySelector(selector){return flatten(this).find(item=>item.className===selector.slice(1))||null;}
    setAttribute(key, val) {this.attributes[key] = val;} addEventListener(type, fn) {this.listeners[type] = fn;} focus() {this.focused = true;}
  }
  const nodes = Object.fromEntries(['paper','paper-frame','zoom-back','recipient-choice','recipient-custom','recipient-status','recipient-reload'].map(id => [id, new Element()]));
  const input = new Element('INPUT'); input.dataset.field = 'recipient'; input.value = value;
  const send = new Element('BUTTON'); send.dataset.action = 'send';
  nodes['recipient-reload'].dataset.action = 'reload-recipients';
  const messages = [];
  const body=new Element();
  const document = {body,getElementById: id => nodes[id], documentElement: {clientWidth: 400}, createElement: tag => new Element(tag), querySelector: selector => selector === '[data-field="recipient"]' ? input : null, querySelectorAll: selector => selector === '[data-field]' ? [input] : selector === '[data-action]' ? [send, nodes['recipient-reload']] : [], addEventListener(){}};
  const window = {visualViewport:viewport,addEventListener(){}, ReactNativeWebView: {postMessage: value => messages.push(JSON.parse(value))}};
  vm.runInNewContext('(' + require('../shared/paperScript') + ')(' + JSON.stringify({data: {...createInitial(), recipient: value}, height: 1430, editable: false}) + ')', {window, document});
  return {window, nodes, input, send, messages,body,choice:value=>flatten(body).find(item=>item.dataset.recipientChoice===value),close:()=>flatten(body).find(item=>item.attributes['aria-label']==='Kapat')};
}
function flatten(node){return node.children.flatMap(child=>[child,...flatten(child)]);}
const saved = [
 {id:'one',name:'Kalite Ekibi',email:'kalite@example.com',isExample:true},
 {id:'two',name:'Üretim Ekibi',email:'uretim@example.com',isExample:true},
];
const find=(app,cls)=>flatten(app.body).find(item=>item.className===cls);
const apply=app=>find(app,'recipient-apply').onclick();

test('multiple saved recipients stay selected until Apply and are submitted together',()=>{
 const app=setup();app.window.updateReportRecipients(saved,'',false);app.nodes['recipient-choice'].onclick();
 app.choice('kalite@example.com').onclick();app.choice('uretim@example.com').onclick();
 assert.equal(app.body.children.length,1);assert.equal(app.input.value,'');
 assert.equal(app.choice('kalite@example.com').attributes.role,'checkbox');
 assert.equal(app.choice('kalite@example.com').attributes['aria-checked'],'true');
 assert.equal(find(app,'recipient-dialog-summary').textContent,'2 alıcı seçildi');
 apply(app);assert.equal(app.body.children.length,0);
 assert.deepEqual(app.messages.at(-1),{type:'field',path:'recipient',value:'kalite@example.com, uretim@example.com'});
 app.send.onclick();assert.equal(app.messages.at(-1).recipient,'kalite@example.com, uretim@example.com');
 assert.ok(flatten(app.nodes['recipient-choice']).some(item=>item.textContent==='2 alıcı seçildi'));
});

test('saved and custom addresses can be combined, validated and deduplicated',()=>{
 const app=setup('kalite@example.com');app.window.updateReportRecipients(saved,'',false);app.nodes['recipient-choice'].onclick();
 assert.equal(app.choice('__other__'),undefined);const input=find(app,'recipient-dialog-custom-input');
 input.value='invalid';input.oninput();apply(app);assert.equal(app.body.children.length,1);assert.ok(find(app,'recipient-dialog-error').textContent);
 input.value='custom@firma.com, KALITE@example.com';find(app,'recipient-add').onclick();
 assert.equal(app.choice('custom@firma.com').attributes['aria-checked'],'true');
 app.choice('custom@firma.com').onclick();assert.equal(app.choice('custom@firma.com').attributes['aria-checked'],'false');
 input.value='custom@firma.com, other@firma.com';input.onkeydown({key:'Enter',preventDefault(){}});
 assert.equal(app.choice('custom@firma.com').attributes['aria-checked'],'true');
 assert.equal(flatten(app.body).filter(item=>item.dataset.recipientChoice==='custom@firma.com').length,1);
 assert.equal(input.value,'');apply(app);
 assert.equal(app.input.value,'kalite@example.com, custom@firma.com, other@firma.com');
});

test('cancel preserves the original recipients after toggling several choices',()=>{
 const app=setup('kalite@example.com');app.window.updateReportRecipients(saved,'',false);app.nodes['recipient-choice'].onclick();
 app.choice('kalite@example.com').onclick();app.choice('uretim@example.com').onclick();app.close().onclick();
 assert.equal(app.input.value,'kalite@example.com');assert.equal(app.body.children.length,0);
 assert.equal(app.messages.filter(item=>item.type==='field').length,0);
});

test('refresh or unavailable directory preserves a previous address and supports retry',()=>{
 const app=setup('kalite@example.com');app.window.updateReportRecipients([],'Liste yüklenemedi',false);
 assert.equal(app.input.value,'kalite@example.com');assert.equal(app.nodes['recipient-status'].textContent,'Liste yüklenemedi');
 app.nodes['recipient-reload'].onclick();assert.equal(app.messages.at(-1).action,'reload-recipients');
 app.nodes['recipient-choice'].onclick();assert.equal(app.choice('kalite@example.com').attributes['aria-checked'],'true');
 assert.equal(find(app,'recipient-dialog-custom-input').value,'');
});

test('responsive recipient dialog tracks the visible viewport during resize and cleans listeners',()=>{
 const listeners={};const viewport={width:320,height:568,offsetLeft:160,offsetTop:350,addEventListener:(type,fn)=>{listeners[type]=fn;},removeEventListener:type=>{delete listeners[type];}};
 const app=setup('kalite@example.com',viewport);app.window.updateReportRecipients(saved,'',false);app.nodes['recipient-choice'].onclick();
 const overlay=app.body.children[0];assert.equal(overlay.style.left,'160px');assert.equal(overlay.style.width,'320px');assert.equal(overlay.style.height,'568px');
 viewport.height=320;viewport.width=568;listeners.resize();assert.equal(overlay.style.width,'568px');assert.equal(overlay.style.height,'320px');
 app.close().onclick();assert.deepEqual(Object.keys(listeners),[]);
});

test('clearing is provisional and only removes recipients after Apply',()=>{
 const app=setup('kalite@example.com, uretim@example.com');app.window.updateReportRecipients(saved,'',false);app.nodes['recipient-choice'].onclick();
 find(app,'recipient-clear').onclick();assert.equal(app.input.value,'kalite@example.com, uretim@example.com');
 apply(app);assert.equal(app.input.value,'');assert.equal(app.nodes['recipient-choice'].value,'');
});

test('directory refresh while the dialog is open preserves the pending selections',()=>{
 const app=setup();app.window.updateReportRecipients(saved,'',false);app.nodes['recipient-choice'].onclick();app.choice('kalite@example.com').onclick();
 app.window.updateReportRecipients([...saved,{id:'three',name:'Yeni',email:'yeni@example.com'}],'',false);
 assert.equal(app.choice('kalite@example.com').attributes['aria-checked'],'true');assert.ok(app.choice('yeni@example.com'));apply(app);assert.equal(app.input.value,'kalite@example.com');
});

test('recipient selector exists only in the sending screen and never in printable output',()=>{
 assert.ok(buildPaperDocument(createInitial(),{showSend:true}).includes('id="recipient-choice"'));
 assert.ok(!buildPaperDocument(createInitial()).includes('id="recipient-choice"'));
 assert.ok(!buildPaperDocument(createInitial(),{showSend:true}).includes('<select'));
});

test('new recipient cards are provisional and restored from applied selections',()=>{
 const app=setup();app.window.updateReportRecipients(saved,'',false);app.nodes['recipient-choice'].onclick();
 find(app,'recipient-dialog-custom-input').value='new@firma.com';find(app,'recipient-add').onclick();
 app.close().onclick();assert.equal(app.input.value,'');app.nodes['recipient-choice'].onclick();assert.equal(app.choice('new@firma.com'),undefined);
 find(app,'recipient-dialog-custom-input').value='new@firma.com';find(app,'recipient-add').onclick();apply(app);
 app.nodes['recipient-choice'].onclick();assert.equal(app.choice('new@firma.com').attributes['aria-checked'],'true');
});
