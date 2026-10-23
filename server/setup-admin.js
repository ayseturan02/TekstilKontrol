const fs = require('node:fs/promises');
const path = require('node:path');
const {randomBytes} = require('node:crypto');
require('dotenv').config({path: path.join(__dirname, '.env')});
const {createUserStore} = require('./users');
async function main() {
  const arg = name => {const i = process.argv.indexOf('--' + name); return i >= 0 ? process.argv[i + 1] : '';};
  const firstName = arg('first-name'), lastName = arg('last-name'), email = arg('email');
  if (!firstName || !lastName || !email) throw Error('Kullanım: npm run setup-admin -- --first-name Ad --last-name Soyad --email admin@firma.com');
  const store = createUserStore(process.env.USERS_FILE || path.join(__dirname, 'data', 'users.json'));
  await store.init();
  if (store.list().some(user => user.role === 'admin')) throw Error('Yönetici zaten var. Mevcut hesapla giriş yapın.');
  const envFile = path.join(__dirname, '.env');
  try { await fs.access(envFile); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await fs.writeFile(envFile, 'PORT=4000\nJWT_SECRET=' + randomBytes(48).toString('hex') + '\n', {mode: 0o600, flag: 'wx'});
  }
  const password = randomBytes(12).toString('base64url');
  const user = await store.create({firstName, lastName, email, password}, 'admin');
  console.log('Admin hesabı oluşturuldu.\nAd soyad: ' + user.firstName + ' ' + user.lastName + '\nE-posta: ' + user.email + '\nŞifre: ' + password);
}
main().catch(error => {console.error(error.message); process.exitCode = 1;});
