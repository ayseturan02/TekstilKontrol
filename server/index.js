const path = require('node:path');
require('dotenv').config({path: path.join(__dirname, '.env')});
const {createApp} = require('./app');
const {createUserStore} = require('./users');
const {createRecipientStore} = require('./recipients');
async function start() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw Error('JWT_SECRET en az 32 karakter olmalı. İlk kurulum için npm run setup-admin çalıştırın.');
  const store = createUserStore(process.env.USERS_FILE || path.join(__dirname, 'data', 'users.json'));
  await store.init({email: process.env.USER_EMAIL, passwordHash: process.env.USER_PASSWORD_HASH, firstName: process.env.ADMIN_FIRST_NAME, lastName: process.env.ADMIN_LAST_NAME});
  if (!store.list().some(user => user.role === 'admin')) throw Error('Yönetici hesabı yok. Önce npm run setup-admin çalıştırın.');
  const recipientStore = createRecipientStore(process.env.RECIPIENTS_FILE || path.join(__dirname, 'data', 'recipients.json'));
  await recipientStore.init();
  const port = Number(process.env.PORT || 4000);
  createApp({store, recipientStore, secret}).listen(port, '0.0.0.0', () => console.log('API hazır: ' + port));
}
start().catch(error => {console.error(error.message); process.exitCode = 1;});
