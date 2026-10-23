const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {createRequire} = require('node:module');
const serverRequire = createRequire(require.resolve('../server/app'));
const jwt = serverRequire('jsonwebtoken');
const bcrypt = serverRequire('bcryptjs');
const {createUserStore} = require('../server/users');
const {createApp} = require('../server/app');
const secret = 'test-only-secret-for-user-management-at-least-32-chars';
async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tekstil-users-'));
  const filename = path.join(directory, 'users.json');
  const store = createUserStore(filename); await store.init();
  const admin = await store.create({firstName: 'İnternet', lastName: 'Tekstil', email: 'admin@example.com', password: 'AdminPass123!'}, 'admin');
  const app = createApp({store, secret});
  const server = await new Promise(resolve => {const listener = app.listen(0, '127.0.0.1', () => resolve(listener));});
  const base = 'http://127.0.0.1:' + server.address().port;
  t.after(async () => {await new Promise(resolve => server.close(resolve)); await fs.rm(directory, {recursive: true, force: true});});
  const request = async (route, {token, body, method} = {}) => {
    const response = await fetch(base + route, {method: method || (body ? 'POST' : 'GET'), headers: {'Content-Type': 'application/json', ...(token ? {Authorization: 'Bearer ' + token} : {})}, ...(body ? {body: JSON.stringify(body)} : {})});
    return {status: response.status, data: await response.json()};
  };
  const login = (email = admin.email, password = 'AdminPass123!') => request('/login', {body: {email, password}});
  return {store, admin, login, request, filename};
}
test('admin creates permanent accounts and list never exposes password hashes', async t => {
  const {store, login, request, filename} = await fixture(t);
  const {data: session} = await login();
  assert.equal(session.user.role, 'admin'); assert.equal(session.user.firstName, 'İnternet');
  assert.equal(session.user.passwordHash, undefined);
  const account = {firstName: 'Ayşe', lastName: 'Yılmaz', email: ' AYSE@example.com ', password: 'WorkerPass123!'};
  const created = await request('/admin/users', {token: session.token, body: {...account, role: 'admin'}});
  assert.equal(created.status, 201); assert.equal(created.data.user.email, 'ayse@example.com'); assert.equal(created.data.user.role, 'user');
  const listed = await request('/admin/users', {token: session.token});
  assert.equal(listed.data.users.length, 2); assert.ok(!JSON.stringify(listed.data).includes('password'));
  const stored = await fs.readFile(filename, 'utf8'); assert.ok(!stored.includes(account.password)); assert.ok(stored.includes('passwordHash'));
  assert.ok(await bcrypt.compare(account.password, store.findByEmail('ayse@example.com').passwordHash));
  const restarted = createUserStore(filename); await restarted.init();
  assert.equal(restarted.list().length, 2); assert.equal(restarted.findByEmail('ayse@example.com').firstName, 'Ayşe');
  const signedIn = await login('ayse@example.com', account.password); assert.equal(signedIn.status, 200);
  const profile = await request('/me', {token: signedIn.data.token}); assert.equal(profile.data.user.lastName, 'Yılmaz');
  const duplicate = await request('/admin/users', {token: session.token, body: account}); assert.equal(duplicate.status, 409);
});
test('only the database admin can manage users, including forged role claims and demo tokens', async t => {
  const {store, request, login} = await fixture(t);
  const worker = await store.create({firstName: 'Normal', lastName: 'Kullanıcı', email: 'worker@example.com', password: 'WorkerPass123!'});
  const session = (await login(worker.email, 'WorkerPass123!')).data;
  const body = {firstName: 'Unauthorized', lastName: 'User', email: 'bad@example.com', password: 'SomePass123!'};
  for (const token of [undefined, 'demo-session', 'invalid-token']) assert.equal((await request('/admin/users', {token})).status, 401);
  const forgedRole = jwt.sign({version: 0, role: 'admin'}, secret, {subject: worker.id, expiresIn: '1h'});
  for (const token of [session.token, forgedRole]) {
    assert.equal((await request('/admin/users', {token})).status, 403);
    assert.equal((await request('/admin/users', {token, body})).status, 403);
    assert.equal((await request('/admin/users/' + worker.id + '/reset-password', {token, body: {password: 'NewPass123!'}})).status, 403);
  }
  assert.equal(store.list().length, 2);
});
test('password reset persists the new password and invalidates every previous user token', async t => {
  const {store, login, request, filename} = await fixture(t);
  const adminToken = (await login()).data.token;
  const worker = await store.create({firstName: 'Test', lastName: 'Kullanıcı', email: 'test@example.com', password: 'OldPassword123!'});
  const previous = (await login(worker.email, 'OldPassword123!')).data.token;
  assert.equal((await request('/admin/users/' + worker.id + '/reset-password', {token: adminToken, body: {password: 'NewPassword456!'}})).status, 200);
  assert.equal((await login(worker.email, 'OldPassword123!')).status, 401);
  const current = await login(worker.email, 'NewPassword456!'); assert.equal(current.status, 200);
  assert.equal((await request('/me', {token: previous})).status, 401);
  assert.equal((await request('/me', {token: current.data.token})).status, 200);
  const reloaded = createUserStore(filename); await reloaded.init();
  assert.ok(await bcrypt.compare('NewPassword456!', reloaded.findById(worker.id).passwordHash));
});
test('invalid accounts and weak passwords fail without changing existing records', async t => {
  const {store, login, request, admin} = await fixture(t);
  const token = (await login()).data.token;
  const good = {firstName: 'Ad', lastName: 'Soyad', email: 'valid@example.com', password: 'GoodPassword123!'};
  for (const body of [{...good, firstName: ''}, {...good, lastName: ''}, {...good, email: 'invalid'}, {...good, email: 'demo@tekstil.com'}, {...good, password: 'short'}, {...good, password: 'a'.repeat(73)}]) assert.equal((await request('/admin/users', {token, body})).status, 400);
  assert.equal((await request('/admin/users/' + admin.id + '/reset-password', {token, body: {password: 'short'}})).status, 400);
  assert.equal((await request('/admin/users/unknown/reset-password', {token, body: {password: 'GoodPassword123!'}})).status, 404);
  assert.equal(store.list().length, 1); assert.equal((await login()).status, 200);
});
test('simultaneous account creation keeps all records and enforces unique emails', async t => {
  const {store} = await fixture(t);
  const first = {firstName: 'Bir', lastName: 'Kullanıcı', email: 'one@example.com', password: 'GoodPassword123!'};
  const second = {...first, firstName: 'İki', email: 'two@example.com'};
  const results = await Promise.allSettled([store.create(first), store.create(second), store.create({...first, email: ' ONE@example.com '})]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 2);
  assert.equal(results.find(result => result.status === 'rejected').reason.status, 409);
  assert.equal(store.list().length, 3);
});
test('resetting the admin password also revokes the current admin session', async t => {
  const {admin, login, request} = await fixture(t);
  const token = (await login()).data.token;
  assert.equal((await request('/admin/users/' + admin.id + '/reset-password', {token, body: {password: 'NewAdminPass123!'}})).status, 200);
  assert.equal((await request('/admin/users', {token})).status, 401);
  assert.equal((await login(admin.email, 'NewAdminPass123!')).status, 200);
});

