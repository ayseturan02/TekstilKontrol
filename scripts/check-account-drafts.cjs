const cp = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function adb(args) {const r = cp.spawnSync('adb', args, {encoding: 'utf8', timeout: 20000}); if (r.status !== 0) throw Error('ADB işlemi başarısız'); return r.stdout;}
function decode(value) {return value.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');}
function ui() {
  adb(['shell', 'uiautomator', 'dump', '/sdcard/admin-ui.xml']);
  const xml = adb(['shell', 'cat', '/sdcard/admin-ui.xml']);
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
(async () => {
  const admin = {email: process.env.ADMIN_VERIFY_EMAIL, password: process.env.ADMIN_VERIFY_PASSWORD};
  const demo = {email: 'demo@tekstil.com', password: 'Demo123'};
  if (!admin.email || !admin.password) throw Error('Admin test giriş bilgileri gerekli');
  let report;
  const originals = new Map();
  const switchTo = async account => {
    if (report) {report.close(); report = null;}
    let nodes = ui();
    if (nodes.some(node => node['content-desc'] === 'Profili aç')) {await tap('Profili aç'); await tap('Çıkış yap');}
    await waitFor('E-posta adresi'); input('E-posta adresi', account.email); input('Şifre', account.password);
    adb(['shell', 'input', 'keyevent', '4']); await pause(200); await tap('Giriş yap'); await waitFor('Profili aç');
    report = await connectReport();
  };
  const readCustomer = () => report.evaluate('document.querySelector(\'[data-field="customer"]\').value');
  const setCustomer = async value => {
    await report.evaluate('(function(value){var field=document.querySelector(\'[data-field="customer"]\');field.value=value;field.dispatchEvent(new Event("input",{bubbles:true}));return true;})(' + JSON.stringify(value) + ')');
    await pause(750);
  };
  try {
    await switchTo(admin); originals.set(admin, await readCustomer()); await setCustomer('SCOPE-ADMIN-VERIFY');
    await switchTo(demo); const original = await readCustomer(); originals.set(demo, original);
    if (original === 'SCOPE-ADMIN-VERIFY') throw Error('Admin formu başka hesapta göründü');
    await setCustomer('SCOPE-DEMO-VERIFY');
    await switchTo(admin); if (await readCustomer() !== 'SCOPE-ADMIN-VERIFY') throw Error('Admin kendi formunu geri alamadı');
    await switchTo(demo); if (await readCustomer() !== 'SCOPE-DEMO-VERIFY') throw Error('İkinci hesap kendi formunu geri alamadı');
    console.log('PASS: Android hesap değişiminde iki ayrı form korunuyor');
  } finally {
    for (const [account, value] of originals) {await switchTo(account); await setCustomer(value);}
    await switchTo(admin); report.close(); report = null;
    adb(['forward', '--remove', 'tcp:9236']);
    await tap('Profili aç'); await tap('Ayarlar'); await waitFor('Kullanıcı yönetimi');
    console.log('PASS: örnek test değerleri kaldırıldı, kişisel formlar geri yüklendi');
  }
})().catch(error => {console.error(error.message); process.exitCode = 1;});

