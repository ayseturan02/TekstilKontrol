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
(async () => {
  const email = process.env.ADMIN_VERIFY_EMAIL, password = process.env.ADMIN_VERIFY_PASSWORD;
  if (!email || !password) throw Error('ADMIN_VERIFY_EMAIL ve ADMIN_VERIFY_PASSWORD gerekli');
  let nodes = ui();
  if (nodes.some(n => n['content-desc'] === 'Profili aç')) {
    await tap('Profili aç'); nodes = ui();
    if (nodes.some(n => n.text === 'Ayarlar')) {
      await tap('Ayarlar'); await waitFor('Kullanıcı yönetimi');
      console.log('PASS: mevcut admin oturumuyla Ayarlar erişimi');
    } else {
      console.log('PASS: normal kullanıcı profilinde Ayarlar yok');
      await tap('Çıkış yap'); await waitFor('E-posta adresi');
    }
  }
  nodes = ui();
  if (nodes.some(n => n.class === 'android.widget.EditText' && n['content-desc'] === 'E-posta adresi')) {
    input('E-posta adresi', email); input('Şifre', password);
    adb(['shell', 'input', 'keyevent', '4']); await pause(300);
    await tap('Giriş yap'); await waitFor('Profili aç');
    await tap('Profili aç');
    nodes = await waitFor('Ayarlar');
    if (!nodes.some(n => n.text === 'İnternet Tekstil')) throw Error('Profilde ad soyad görünmüyor');
    await tap('Ayarlar'); await waitFor('Kullanıcı yönetimi');
    console.log('PASS: admin giriş, gerçek ad soyad ve Ayarlar');
  }
  nodes = await waitFor('Ekip üyeleri');
  if (!nodes.some(n => n.text === email)) throw Error('Admin kullanıcı listesinde görünmüyor');
  await tap('+ Yeni kullanıcı');
  nodes = await waitFor('Yeni kullanıcı');
  for (const label of ['Ad', 'Soyad', 'E-posta', 'Şifre']) if (!nodes.some(n => n.class === 'android.widget.EditText' && n['content-desc'] === label)) throw Error('Eksik hesap alanı: ' + label);

  console.log('PASS: kullanıcı oluşturma alanları ve sunucudan gelen hesap listesi');
  await tap('Vazgeç'); await waitFor('Kullanıcı yönetimi');
  await tap('Şifreyi sıfırla'); await waitFor('Yeni şifre'); await tap('Vazgeç'); await waitFor('Kullanıcı yönetimi');
  console.log('PASS: şifre sıfırlama penceresi ve vazgeç');
  fs.mkdirSync(path.join(__dirname, '..', 'artifacts'), {recursive: true});
  adb(['shell', 'screencap', '-p', '/sdcard/admin-settings.png']);
  adb(['pull', '/sdcard/admin-settings.png', path.join(__dirname, '..', 'artifacts', 'admin-settings.png')]);
})().catch(error => {console.error(error.message); process.exitCode = 1;});



