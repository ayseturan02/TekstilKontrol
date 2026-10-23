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
 let report,original,contacts=[],override;
 const size=adb(['shell','wm','size']);const match=size.match(/Override size: (\d+x\d+)/);override=match?match[1]:'reset';
 try{
  await waitFor('Kaydet');if(ui().some(n=>n['content-desc']==='Önizle →'))await tap('Önizle →');
  report=await connectReport();
  for(let i=0;i<30;i++){if(await report.evaluate('!!document.getElementById("recipient-choice")'))break;await pause(150);}
  original=await report.evaluate('document.getElementById("recipient").value');
  for(const item of [{size:'640x1136',name:'320'},{size:'896x1600',name:'448'},{size:override,name:'tablet'}]){
   adb(['shell','wm','size',item.size]);await pause(650);
   await report.evaluate('document.getElementById("recipient-choice").click();true;');await pause(250);
   const result=await report.evaluate('(function(){var p=document.querySelector(".recipient-dialog"),r=p.getBoundingClientRect(),v=visualViewport,f=p.querySelector(".recipient-dialog-footer").getBoundingClientRect();return {listHeight:p.querySelector(".recipient-dialog-list").getBoundingClientRect().height,composerWidth:p.querySelector(".recipient-add-row").getBoundingClientRect().width,width:v.width,height:v.height,inside:r.left>=v.offsetLeft&&r.right<=v.offsetLeft+v.width&&r.top>=v.offsetTop&&r.bottom<=v.offsetTop+v.height+1,footerVisible:f.bottom<=v.offsetTop+v.height&&f.top>=v.offsetTop,font:parseFloat(getComputedStyle(p.querySelector(".recipient-option-name")).fontSize)};})()');
   if(!result.inside||!result.footerVisible||result.font<17||result.listHeight<58||result.composerWidth>result.width)throw Error('Responsive kontrol başarısız: '+JSON.stringify(result));
   if(!contacts.length)contacts=await report.evaluate('Array.from(document.querySelectorAll("[data-recipient-choice]")).filter(function(e){return e.dataset.recipientChoice!=="__other__";}).map(function(e){return {email:e.dataset.recipientChoice,name:e.querySelector(".recipient-option-name").textContent.replace(" (Örnek)",""),isExample:e.querySelector(".recipient-option-name").textContent.indexOf("(Örnek)")>=0};})');
   if(item.name==='320'){
    await report.evaluate('(function(){var rows=Array.from(document.querySelectorAll("[data-recipient-choice]")).filter(function(e){return e.dataset.recipientChoice!=="__other__";});rows.forEach(function(e){if(e.getAttribute("aria-checked")==="true")e.click();});document.querySelectorAll("[data-recipient-choice]")[0].click();document.querySelectorAll("[data-recipient-choice]")[1].click();return true;})()');
    const count=await report.evaluate('document.querySelectorAll(".recipient-option[aria-checked=true]").length');if(count!==2)throw Error('İki alıcı seçilemedi');
    adb(['shell','screencap','-p','/sdcard/recipients-320.png']);adb(['pull','/sdcard/recipients-320.png',path.join(__dirname,'..','artifacts','recipients-320.png')]);
    await report.evaluate('document.querySelector(".recipient-apply").click();true;');
    const value=await report.evaluate('document.getElementById("recipient").value');if(value.split(",").length!==2)throw Error('Çoklu seçim kaydedilemedi');
    await report.evaluate('(function(v,list){var e=document.getElementById("recipient");e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}));window.updateReportRecipients(list,"",false);return true;})('+JSON.stringify(original)+','+JSON.stringify(contacts)+')');
   }else{
    adb(['shell','screencap','-p','/sdcard/recipients-'+item.name+'.png']);adb(['pull','/sdcard/recipients-'+item.name+'.png',path.join(__dirname,'..','artifacts','recipients-'+item.name+'.png')]);
    await report.evaluate('document.querySelector(".recipient-dialog-close").click();true;');
   }
   console.log('PASS: '+item.name+' genişlik, görünür düğmeler, '+result.font+'px yazı');
  }
 }finally{
  adb(['shell','wm','size',override||'reset']);
  if(report){if(original!==undefined){await report.evaluate('(function(v,list){var e=document.getElementById("recipient");e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}));window.updateReportRecipients(list,"",false);var b=document.querySelector(".recipient-dialog-close");if(b)b.click();return true;})('+JSON.stringify(original)+','+JSON.stringify(contacts)+')');await pause(750);}report.close();adb(['forward','--remove','tcp:9236']);}
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});

