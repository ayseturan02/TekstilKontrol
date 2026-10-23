const fs = require('node:fs/promises');
const path = require('node:path');
const {randomUUID} = require('node:crypto');
const bcrypt = require('bcryptjs');

class UserError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const publicUser = ({id, firstName, lastName, email, role, createdAt}) => ({id, firstName, lastName, email, role, createdAt});
function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new UserError(400, 'Şifre en az 8 karakter olmalı ve 72 baytı aşmamalı.');
  }
}
function validateAccount(input) {
  const firstName = String(input.firstName || '').trim();
  const lastName = String(input.lastName || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  if (!firstName || !lastName || firstName.length > 80 || lastName.length > 80) throw new UserError(400, 'Ad ve soyad gerekli; her biri en fazla 80 karakter olabilir.');
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserError(400, 'Geçerli bir e-posta adresi girin.');
  if (email === 'demo@tekstil.com') throw new UserError(400, 'Bu e-posta demo hesabına ayrılmıştır.');
  validatePassword(input.password);
  return {firstName, lastName, email};
}
function createUserStore(filename) {
  let users = [];
  let queue = Promise.resolve();
  const serialize = task => {
    const result = queue.then(task);
    queue = result.catch(() => {});
    return result;
  };
  const write = async next => {
    await fs.mkdir(path.dirname(filename), {recursive: true});
    const temp = filename + '.' + randomUUID() + '.tmp';
    try {
      await fs.writeFile(temp, JSON.stringify({version: 1, users: next}, null, 2), {mode: 0o600});
      await fs.rename(temp, filename);
      users = next;
    } finally { await fs.rm(temp, {force: true}).catch(() => {}); }
  };
  return {
    async init(bootstrap) {
      try {
        const data = JSON.parse(await fs.readFile(filename, 'utf8'));
        if (data.version !== 1 || !Array.isArray(data.users) || data.users.some(u => !u.id || !u.email || !u.passwordHash || !['admin', 'user'].includes(u.role))) throw Error('Kullanıcı kayıt dosyası geçersiz.');
        users = data.users;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        if (bootstrap?.email && bootstrap?.passwordHash) {
          await write([{id: randomUUID(), firstName: bootstrap.firstName || 'Yönetici', lastName: bootstrap.lastName || 'Hesabı', email: bootstrap.email.trim().toLowerCase(), passwordHash: bootstrap.passwordHash, role: 'admin', authVersion: 0, createdAt: new Date().toISOString()}]);
        }
      }
    },
    list: () => users.map(publicUser),
    findById: id => users.find(u => u.id === id),
    findByEmail: email => users.find(u => u.email === String(email || '').trim().toLowerCase()),
    async create(input, role = 'user') {
      const fields = validateAccount(input);
      const passwordHash = await bcrypt.hash(input.password, 12);
      return serialize(async () => {
        if (users.some(u => u.email === fields.email)) throw new UserError(409, 'Bu e-posta adresiyle bir hesap zaten var.');
        const user = {...fields, id: randomUUID(), passwordHash, role, authVersion: 0, createdAt: new Date().toISOString()};
        await write([...users, user]);
        return publicUser(user);
      });
    },
    async resetPassword(id, password) {
      validatePassword(password);
      const passwordHash = await bcrypt.hash(password, 12);
      return serialize(async () => {
        if (!users.some(u => u.id === id)) throw new UserError(404, 'Kullanıcı bulunamadı.');
        const next = users.map(u => u.id === id ? {...u, passwordHash, authVersion: (u.authVersion || 0) + 1} : u);
        await write(next);
      });
    },
  };
}
module.exports = {createUserStore, publicUser, UserError};

