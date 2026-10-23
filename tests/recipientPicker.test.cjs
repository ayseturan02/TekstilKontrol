const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {buildPaperDocument} = require('../shared/paperLayout');
const {createInitial} = require('../shared/reportTemplate');
const {parseSavedEmails, mergeEmails, mailSubject, mailBody} = require('../shared/recipients');
function setup(value = '', viewport) {
  class Element {
    constructor(tag = 'DIV') {this.className = ''; this.tagName = tag; this.style = {}; this.children = []; this.dataset = {}; this.listeners = {}; this.attributes = {}; this.value = ''; this._text = '';}
    set textContent(text) {this._text = text; this.children = [];} get textContent() {return this._text;}
    appendChild(item) {this.children.push(item); item.parent=this; return item;}
    remove(){this.parent.children=this.parent.children.filter(item=>item!==this);}
    querySelector(selector){return flatten(this).find(item=>item.className===selector.slice(1))||null;}
    setAttribute(key, val) {this.attributes[key] = val;} addEventListener(type, fn) {this.listeners[type] = fn;} focus() {this.focused = true;}
  }
  const nodes = Object.fromEntries(['paper','paper-frame','zoom-back','recipient-choice','recipient-status'].map(id => [id, new Element()]));
  const input = new Element('INPUT'); input.dataset.field = 'recipient'; input.value = value;
  const messages = [];
  const body=new Element();
  const document = {body,getElementById: id => nodes[id], documentElement: {clientWidth: 400}, createElement: tag => new Element(tag), querySelector: selector => selector === '[data-field="recipient"]' ? input : null, querySelectorAll: selector => selector === '[data-field]' ? [input] : [], addEventListener(){}};
  const window = {visualViewport:viewport,addEventListener(){}, ReactNativeWebView: {postMessage: value => messages.push(JSON.parse(value))}};
  vm.runInNewContext('(' + require('../shared/paperScript') + ')(' + JSON.stringify({data: {...createInitial(), recipient: value}, height: 1430, editable: false}) + ')', {window, document});
  return {window, nodes, input, messages,body,choice:value=>flatten(body).find(item=>item.dataset.recipientChoice===value),forget:value=>flatten(body).find(item=>item.dataset.recipientForget===value),close:()=>flatten(body).find(item=>item.attributes['aria-label']==='Kapat')};
}
function flatten(node){return node.children.flatMap(child=>[child,...flatten(child)]);}
const saved = ['kalite@example.com','uretim@example.com'];
const find=(app,cls)=>flatten(app.body).find(item=>item.className===cls);
const apply=app=>find(app,'recipient-apply').onclick();

test('pressing e-mail opens the picker; selected addresses open the mail draft together',()=>{
 const app=setup();app.window.updateReportRecipients(saved);app.nodes['recipient-choice'].onclick();
 assert.equal(app.body.children.length,1);
 app.choice('kalite@example.com').onclick();app.choice('uretim@example.com').onclick();
 assert.equal(app.choice('kalite@example.com').attributes['aria-checked'],'true');
 assert.equal(find(app,'recipient-dialog-summary').textContent,'2 alıcı seçildi');
 apply(app);assert.equal(app.body.children.length,0);
 assert.deepEqual(app.messages.at(-2),{type:'field',path:'recipient',value:'kalite@example.com, uretim@example.com'});
 assert.deepEqual(app.messages.at(-1),{type:'action',action:'send',recipient:'kalite@example.com, uretim@example.com'});
});

test('new addresses can be typed, validated, deduplicated and sent',()=>{
 const app=setup('kalite@example.com');app.window.updateReportRecipients(saved);app.nodes['recipient-choice'].onclick();
 const input=find(app,'recipient-dialog-custom-input');
 input.value='invalid';input.oninput();apply(app);assert.equal(app.body.children.length,1);assert.ok(find(app,'recipient-dialog-error').textContent);
 input.value='custom@firma.com, KALITE@example.com';find(app,'recipient-add').onclick();
 assert.equal(app.choice('custom@firma.com').attributes['aria-checked'],'true');
 assert.equal(flatten(app.body).filter(item=>item.dataset.recipientChoice==='kalite@example.com').length,1);
 input.value='other@firma.com';apply(app);
 assert.equal(app.messages.at(-1).recipient,'kalite@example.com, custom@firma.com, other@firma.com');
});

test('nothing is sent without a recipient and cancel sends nothing',()=>{
 const app=setup();app.window.updateReportRecipients(saved);app.nodes['recipient-choice'].onclick();
 apply(app);assert.equal(app.body.children.length,1);assert.ok(find(app,'recipient-dialog-error').textContent);
 app.choice('kalite@example.com').onclick();app.close().onclick();
 assert.equal(app.body.children.length,0);assert.equal(app.messages.filter(item=>item.type==='action').length,0);
});

test('saved phone addresses can be forgotten from the picker',()=>{
 const app=setup();app.window.updateReportRecipients(saved);app.nodes['recipient-choice'].onclick();
 app.choice('uretim@example.com').onclick();app.forget('uretim@example.com').onclick();
 assert.deepEqual(app.messages.at(-1),{type:'action',action:'forget-recipient',email:'uretim@example.com'});
 app.window.updateReportRecipients(['kalite@example.com']);
 assert.equal(app.choice('uretim@example.com'),undefined);
 app.choice('kalite@example.com').onclick();apply(app);assert.equal(app.messages.at(-1).recipient,'kalite@example.com');
});

test('responsive recipient dialog tracks the visible viewport during resize and cleans listeners',()=>{
 const listeners={};const viewport={width:320,height:568,offsetLeft:160,offsetTop:350,addEventListener:(type,fn)=>{listeners[type]=fn;},removeEventListener:type=>{delete listeners[type];}};
 const app=setup('kalite@example.com',viewport);app.window.updateReportRecipients(saved);app.nodes['recipient-choice'].onclick();
 const overlay=app.body.children[0];assert.equal(overlay.style.left,'160px');assert.equal(overlay.style.width,'320px');assert.equal(overlay.style.height,'568px');
 viewport.height=320;viewport.width=568;listeners.resize();assert.equal(overlay.style.width,'568px');assert.equal(overlay.style.height,'320px');
 app.close().onclick();assert.deepEqual(Object.keys(listeners),[]);
});

test('address list refresh while the dialog is open preserves pending selections',()=>{
 const app=setup();app.window.updateReportRecipients(saved);app.nodes['recipient-choice'].onclick();app.choice('kalite@example.com').onclick();
 app.window.updateReportRecipients([...saved,'yeni@example.com']);
 assert.equal(app.choice('kalite@example.com').attributes['aria-checked'],'true');assert.ok(app.choice('yeni@example.com'));
});

test('recipient selector exists only in the sending screen and never in printable output',()=>{
 assert.ok(buildPaperDocument(createInitial(),{showSend:true}).includes('id="recipient-choice"'));
 assert.ok(!buildPaperDocument(createInitial()).includes('id="recipient-choice"'));
 assert.ok(!buildPaperDocument(createInitial(),{showSend:true}).includes('<select'));
});

test('phone address book keeps newest first, unique, valid and tolerates bad storage',()=>{
 assert.deepEqual(parseSavedEmails('not json'),[]);
 assert.deepEqual(parseSavedEmails(JSON.stringify(['A@x.com','bad','a@x.com'])),['a@x.com']);
 assert.deepEqual(mergeEmails(['a@x.com','b@x.com'],['B@x.com','c@x.com']),['b@x.com','c@x.com','a@x.com']);
 assert.equal(mergeEmails([],Array.from({length:150},(_,i)=>'u'+i+'@x.com')).length,100);
});

test('mail draft subject and body summarise the report',()=>{
 const report={...createInitial(),customer:'ACME',order:'42'};
 assert.equal(mailSubject(report),'Kontrol Raporu - ACME');
 const body=mailBody(report,2);
 assert.ok(body.includes('Kontrol-Raporu.html'));assert.ok(body.includes('2 fotoğraf/video'));assert.ok(body.includes('Sipariş No: 42'));
});
