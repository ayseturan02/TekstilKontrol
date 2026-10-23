const fs = require('node:fs/promises');
const path = require('node:path');
const {randomUUID} = require('node:crypto');
const {ServiceError} = require('./errors');
const {defaultRecipients, isValidEmail, normalizeEmail} = require('../shared/recipients');
function createRecipientStore(filename) {
  let recipients = [], queue = Promise.resolve();
  const write = async next => {
    await fs.mkdir(path.dirname(filename), {recursive: true});
    const temp = filename + '.' + randomUUID() + '.tmp';
    try {
      await fs.writeFile(temp, JSON.stringify({version: 1, recipients: next}, null, 2), {mode: 0o600});
      await fs.rename(temp, filename);
      recipients = next;
    } finally {await fs.rm(temp, {force: true}).catch(() => {});}
  };
  const serialize = task => {const result = queue.then(task); queue = result.catch(() => {}); return result;};
  return {
    async init() {
      try {
        const data = JSON.parse(await fs.readFile(filename, 'utf8'));
        if (data.version !== 1 || !Array.isArray(data.recipients) || data.recipients.some(item => !item.id || typeof item.name !== 'string' || !isValidEmail(item.email))) throw Error('E-posta alıcı kayıtları geçersiz.');
        recipients = data.recipients;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        await write(defaultRecipients.map(item => ({...item, id: randomUUID(), isExample: true, createdAt: new Date().toISOString()})));
      }
    },
    list: () => recipients.map(item => ({...item})),
    async create(input) {
      const email = normalizeEmail(input.email);
      const name = String(input.name || '').trim() || email;
      if (!isValidEmail(email)) throw new ServiceError(400, 'Geçerli bir e-posta adresi girin.');
      if (name.length > 120) throw new ServiceError(400, 'Kişi veya ekip adı en fazla 120 karakter olabilir.');
      return serialize(async () => {
        if (recipients.some(item => item.email === email)) throw new ServiceError(409, 'Bu e-posta adresi listede zaten var.');
        const item = {id: randomUUID(), name, email, isExample: false, createdAt: new Date().toISOString()};
        await write([...recipients, item]);
        return {...item};
      });
    },
    async remove(id) {
      return serialize(async () => {
        if (!recipients.some(item => item.id === id)) throw new ServiceError(404, 'E-posta adresi bulunamadı.');
        await write(recipients.filter(item => item.id !== id));
      });
    },
  };
}
module.exports = {createRecipientStore};
