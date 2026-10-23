const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {createRequire} = require('node:module');
const jwt = createRequire(require.resolve('../server/app'))('jsonwebtoken');
const {createApp} = require('../server/app');
const {createRecipientStore} = require('../server/recipients');
async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tekstil-recipients-'));
  const filename = path.join(directory, 'recipients.json');
  const recipientStore = createRecipientStore(filename); await recipientStore.init();
  const secret = 'recipient-test-secret-at-least-32-characters';
  const store = {findById: id => ['admin', 'worker'].includes(id) ? {id, role: id === 'admin' ? 'admin' : 'user', authVersion: 0} : null};
  const app = createApp({store, recipientStore, secret});
  const server = await new Promise(resolve => {const listener = app.listen(0, '127.0.0.1', () => resolve(listener));});
  t.after(async () => {await new Promise(resolve => server.close(resolve)); await fs.rm(directory, {recursive: true, force: true});});
  const request = async (route, role = 'admin', body, method = body ? 'POST' : 'GET') => {
    const token = role ? jwt.sign({version: 0}, secret, {subject: role, expiresIn: '1h'}) : '';
    const response = await fetch('http://127.0.0.1:' + server.address().port + route, {method, headers: {'Content-Type': 'application/json', ...(token ? {Authorization: 'Bearer ' + token} : {})}, ...(body ? {body: JSON.stringify(body)} : {})});
    return {status: response.status, data: await response.json()};
  };
  return {recipientStore, filename, request};
}
test('shared recipient directory is seeded once and persists added and removed addresses', async t => {
  const {recipientStore, filename, request} = await fixture(t);
  const initial = recipientStore.list();
  assert.equal(initial.length, 3); assert.ok(initial.every(item => item.isExample && item.email.endsWith('@example.com')));
  const created = await request('/admin/recipients', 'admin', {name: 'Kalite Sorumlusu', email: ' QUALITY@FIRMA.COM ', isExample: true});
  assert.equal(created.status, 201); assert.equal(created.data.recipient.email, 'quality@firma.com'); assert.equal(created.data.recipient.isExample, false);
  assert.equal((await request('/recipients', 'worker')).data.recipients.length, 4);
  const reloaded = createRecipientStore(filename); await reloaded.init(); assert.deepEqual(reloaded.list(), recipientStore.list());
  for (const item of recipientStore.list()) assert.equal((await request('/admin/recipients/' + item.id, 'admin', undefined, 'DELETE')).status, 200);
  const empty = createRecipientStore(filename); await empty.init(); assert.deepEqual(empty.list(), []);
});
test('all authenticated users can read recipients but only admins can add or remove', async t => {
  const {request, recipientStore} = await fixture(t);
  assert.equal((await request('/recipients', null)).status, 401);
  assert.equal((await request('/recipients', 'worker')).status, 200);
  const body = {name: 'Unauthorized', email: 'blocked@example.com'};
  assert.equal((await request('/admin/recipients', 'worker', body)).status, 403);
  assert.equal((await request('/admin/recipients/' + recipientStore.list()[0].id, 'worker', undefined, 'DELETE')).status, 403);
  assert.equal(recipientStore.list().length, 3);
});
test('recipient validation rejects invalid and duplicate emails without losing saved contacts', async t => {
  const {request, recipientStore} = await fixture(t);
  assert.equal((await request('/admin/recipients', 'admin', {email: 'bad'})).status, 400);
  assert.equal((await request('/admin/recipients', 'admin', {email: 'valid@example.com', name: 'a'.repeat(121)})).status, 400);
  assert.equal((await request('/admin/recipients', 'admin', {email: ' KALITE@example.com '})).status, 409);
  assert.equal((await request('/admin/recipients/missing', 'admin', undefined, 'DELETE')).status, 404);
  const results = await Promise.allSettled([recipientStore.create({email: 'one@firma.com'}), recipientStore.create({email: 'ONE@FIRMA.COM'})]);
  assert.equal(results.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(recipientStore.list().length, 4);
});

