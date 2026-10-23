const path = require('node:path');
require('dotenv').config({path: path.join(__dirname, '.env')});
const {createApp} = require('./app');
const {createRecipientStore} = require('./recipients');
async function start() {
  const recipientStore = createRecipientStore(process.env.RECIPIENTS_FILE || path.join(__dirname, 'data', 'recipients.json'));
  await recipientStore.init();
  const port = Number(process.env.PORT || 4000);
  createApp({recipientStore}).listen(port, '0.0.0.0', () => console.log('API hazır: ' + port));
}
start().catch(error => {console.error(error.message); process.exitCode = 1;});
