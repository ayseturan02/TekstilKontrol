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
  await waitFor('Kaydet');if(ui().some(n=>n['content-desc']==='\u00d6nizle \u2192'))await tap('\u00d6nizle \u2192');
  report=await connectReport();
  const addresses=await report.evaluate('Array.from(document.querySelectorAll("[data-recipient-choice]")).map(function(e){return e.dataset.recipientChoice;})');
  const before=adb(['shell','run-as','com.tekstilkontrol','find','cache','-name','*.pdf']).trim().split(/\r?\n/);
  await report.evaluate('window.ReactNativeWebView.postMessage(JSON.stringify({type:"action",action:"send",recipient:"pdf-test@example.com"}));true;');
  let files=[];
  for(let i=0;i<40;i++){await pause(500);files=adb(['shell','run-as','com.tekstilkontrol','find','cache','-name','*.pdf']).trim().split(/\r?\n/).filter(p=>p&&!before.includes(p));if(files.length)break;}
  if(!files.length)throw Error('Native PDF was not generated');
  const file=files.find(p=>p.indexOf('Kontrol-Raporu')>=0)||files[0];
  const result=cp.spawnSync('adb',['exec-out','run-as','com.tekstilkontrol','cat',file],{maxBuffer:30*1024*1024});if(result.status!==0)throw Error('PDF read failed');
  if(result.stdout.subarray(0,5).toString()!=='%PDF-')throw Error('Invalid native PDF');
  fs.writeFileSync(path.join(__dirname,'..','artifacts','kontrol-raporu-android.pdf'),result.stdout);
  console.log('PASS: phone generated a real PDF ('+result.stdout.length+' bytes); no email sent');
  adb(['shell','input','keyevent','4']);await pause(300);
  await report.evaluate('window.ReactNativeWebView.postMessage(JSON.stringify({type:"action",action:"forget-recipient",email:"pdf-test@example.com"}));true;');
 }finally{if(report){report.close();adb(['forward','--remove','tcp:9236']);}}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
