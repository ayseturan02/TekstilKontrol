const cp = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function adb(args) {const r = cp.spawnSync('adb', args, {encoding: 'utf8', timeout: 20000}); if (r.status !== 0) throw Error('ADB işlemi başarısız'); return r.stdout;}
function decode(value) {return value.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');}
function ui() {
  adb(['shell', 'uiautomator', 'dump', '/sdcard/report-ui.xml']);
  const xml = adb(['shell', 'cat', '/sdcard/report-ui.xml']);
  return (xml.match(/<node\b[^>]*>/g) || []).map(raw => Object.fromEntries([...raw.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], decode(m[2])])));
}
function tapNode(node) {
  if (!node) throw Error('Gerekli ekran öğesi bulunamadı');
  const b = node.bounds.match(/\d+/g).map(Number);
  adb(['shell', 'input', 'tap', String(Math.round((b[0] + b[2]) / 2)), String(Math.round((b[1] + b[3]) / 2))]);
}
async function tap(label) {
  const nodes = ui(); const node = nodes.find(n => n['content-desc'] === label && n.clickable === 'true') || nodes.find(n => n.text === label);
  tapNode(node); await pause(300);
}
async function waitFor(label) {
  for (let i = 0; i < 12; i++) {const nodes = ui(); if (nodes.some(n => n.text === label || n['content-desc'] === label)) return nodes; await pause(300);}
  throw Error('Ekran açılmadı: ' + label);
}
function input(label, value) {
  const node = ui().find(n => n.class === 'android.widget.EditText' && n['content-desc'] === label);
  tapNode(node);
  adb(['shell', 'input', 'keyevent', '123']);
  adb(['shell', 'input', 'keyevent', ...Array.from({length: Math.min(100, (node.text || '').length + 1)}, () => '67')]);
  adb(['shell', 'input', 'text', value]);
}
async function connectReport() {
  const pid = adb(['shell', 'pidof', 'com.tekstilkontrol']).trim().split(' ')[0];
  adb(['forward', 'tcp:9236', 'localabstract:webview_devtools_remote_' + pid]);
  let page;
  for (let i = 0; i < 20; i++) {
    try {const pages = await (await fetch('http://127.0.0.1:9236/json')).json(); page = pages.find(item => item.title === 'Kontrol Raporu'); if (page) break;} catch {}
    await pause(150);
  }
  if (!page) throw Error('Kontrol formu açılmadı');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {ws.onopen = resolve; ws.onerror = reject;});
  let id = 0; const pending = new Map();
  ws.onmessage = event => {
    const message = JSON.parse(event.data), entry = pending.get(message.id);
    if (!entry) return;
    clearTimeout(entry.timer); pending.delete(message.id);
    if (message.error || message.result.exceptionDetails) entry.reject(Error('WebView işlemi başarısız'));
    else entry.resolve(message.result.result.value);
  };
  return {
    close: () => ws.close(),
    evaluate: expression => new Promise((resolve, reject) => {
      const next = ++id, timer = setTimeout(() => {pending.delete(next); reject(Error('WebView zaman aşımı'));}, 7000);
      pending.set(next, {resolve, reject, timer});
      ws.send(JSON.stringify({id: next, method: 'Runtime.evaluate', params: {expression, returnByValue: true}}));
    }),
  };
}
(async()=>{
 let report;
 try{
  await waitFor('Kaydet');if(ui().some(n=>/Profili|Giri\u015f yap|\u00c7\u0131k\u0131\u015f yap|Ayarlar/.test(n['content-desc']||n.text||'')))throw Error('Account UI should not exist');if(ui().some(n=>n['content-desc']==='\u00d6nizle \u2192'))await tap('\u00d6nizle \u2192');
  report=await connectReport();
  await report.evaluate('document.getElementById("recipient-choice").click();true;');
  const result=await report.evaluate('(function(){var input=document.querySelector(".recipient-dialog-custom-input"),add=document.querySelector(".recipient-add");if(!add)throw Error("Missing add button");input.value="kontrol-test@example.com";add.click();input.value="ikinci-test@example.com";add.click();var rows=Array.from(document.querySelectorAll("[data-recipient-choice]"));return rows.filter(function(e){return /test@example.com$/.test(e.dataset.recipientChoice)&&e.getAttribute("aria-checked")==="true";}).length===2&&!document.querySelector("[data-recipient-choice=__other__]");})()');
  if(!result)throw Error('New recipient cards failed');
  await pause(500);
  adb(['shell','screencap','-p','/sdcard/recipient-add.png']);adb(['pull','/sdcard/recipient-add.png',path.join(__dirname,'..','artifacts','recipient-add.png')]);
  console.log('PASS: direct input adds two separate checked recipient cards');
 }finally{if(report){await report.evaluate('var b=document.querySelector(".recipient-dialog-close");if(b)b.click();true;');report.close();adb(['forward','--remove','tcp:9236']);}}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
