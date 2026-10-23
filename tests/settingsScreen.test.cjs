const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const React = require('react');
const Renderer = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const code = require('@babel/core').transformFileSync(require.resolve('../src/screens/SettingsScreen.tsx'), {presets: ['module:@react-native/babel-preset'], configFile: false, babelrc: false}).code;
function setup(includeWorker = false) {
  const admin = {id: 'admin', firstName: 'İnternet', lastName: 'Tekstil', email: 'admin@example.com', role: 'admin'};
  const worker = {id: 'worker', firstName: 'Ayşe', lastName: 'Yılmaz', email: 'ayse@example.com', role: 'user'};
  const calls = [], alerts = [];
  let creationError = false, loggedOut = false;
  const module = {exports: {}};
  vm.runInNewContext(code, {module, exports: module.exports, require: name => {
    if (name === 'react') return React;
    if (name === 'react-native') return {...Object.fromEntries(['View','Text','TouchableOpacity','Modal','ActivityIndicator','KeyboardAvoidingView','ScrollView','TextInput'].map(key => [key, key])), Alert: {alert: (...args) => alerts.push(args)}, Platform: {OS: 'android'}, StyleSheet: {create: value => value}, useWindowDimensions: () => ({width: 1000})};
    if (name === 'react-native-safe-area-context') return {SafeAreaView: 'SafeAreaView'};
    if (name === '../context/AppContext') return {useApp: () => ({user: admin, token: 'admin-token', logout: async () => {loggedOut = true;}})};
    if (name === '../components/RecipientSettings') return {__esModule: true, default: 'RecipientSettings'};
    if (name === '../components/Form') return {Button: 'Button', Field: 'Field'};
    if (name === '../styles') return {s: {}};
    if (name === '../report') return {API: 'http://test'};
    if (name === '../services/auth') return {apiRequest: async (api, route, options) => {
      calls.push({route, options});
      if (route === '/admin/users' && !options.method) return {users: includeWorker ? [admin, worker] : [admin]};
      if (route === '/admin/users' && options.method === 'POST') {
        if (creationError) throw Error('Bu e-posta adresiyle bir hesap zaten var.');
        return {user: worker};
      }
      return {ok: true};
    }};
    return require(name);
  }});
  return {Component: module.exports.default, calls, alerts, get loggedOut(){return loggedOut;}, failCreation(){creationError = true;}};
}
test('account creation lists the new user, resets the form, and password reset targets that account', async () => {
  const app = setup(); let root;
  await Renderer.act(async () => {root = Renderer.create(React.createElement(app.Component, {onBack(){}}));});
  const field = label => root.root.findAllByType('Field').find(node => node.props.label === label);
  const button = title => root.root.findAllByType('Button').find(node => node.props.title === title);
  await Renderer.act(async () => root.root.findAllByType('Button').find(node => node.props.title === '+ Yeni kullanıcı').props.onPress());
  for (const [label, value] of [['Ad','Ayşe'],['Soyad','Yılmaz'],['E-posta','ayse@example.com'],['Şifre','WorkerPass123!']]) await Renderer.act(async () => field(label).props.onChangeText(value));
  assert.equal(field('Şifre').props.secureTextEntry, true);
  await Renderer.act(async () => button('Hesap oluştur').props.onPress());
  const created = app.calls.find(call => call.options.method === 'POST');
  assert.equal(created.options.body.firstName, 'Ayşe'); assert.equal(created.options.body.lastName, 'Yılmaz');
  assert.equal(created.options.token, 'admin-token');
  assert.equal(root.root.findAllByType('Field').length, 0);
  assert.equal(root.root.findAllByType('Button').filter(node => node.props.title === 'Şifreyi sıfırla').length, 2);
  await Renderer.act(async () => root.root.findAllByType('Button').filter(node => node.props.title === 'Şifreyi sıfırla')[1].props.onPress());
  assert.equal(root.root.findAllByType('Modal').some(node => node.props.visible), true);
  await Renderer.act(async () => field('Yeni şifre').props.onChangeText('NewWorkerPass123!'));
  await Renderer.act(async () => button('Şifreyi güncelle').props.onPress());
  assert.ok(app.calls.some(call => call.route === '/admin/users/worker/reset-password' && call.options.body.password === 'NewWorkerPass123!'));
  assert.equal(root.root.findAllByType('Modal').some(node => node.props.visible), false);
  assert.equal(app.loggedOut, false);
  await Renderer.act(async () => root.unmount());
});
test('account creation failures preserve entered details and show the server error', async () => {
  const app = setup(); app.failCreation(); let root;
  await Renderer.act(async () => {root = Renderer.create(React.createElement(app.Component, {onBack(){}}));});
  await Renderer.act(async () => root.root.findAllByType('Button').find(node => node.props.title === '+ Yeni kullanıcı').props.onPress());
  for (const [label, value] of [['Ad','Ayşe'],['Soyad','Yılmaz'],['E-posta','ayse@example.com'],['Şifre','WorkerPass123!']]) await Renderer.act(async () => root.root.findAllByType('Field').find(node => node.props.label === label).props.onChangeText(value));
  await Renderer.act(async () => root.root.findAllByType('Button').find(node => node.props.title === 'Hesap oluştur').props.onPress());
  assert.ok(root.root.findAllByType('Text').some(node => node.props.accessibilityRole === 'alert' && node.props.children.includes('zaten var')));
  assert.equal(root.root.findAllByType('Field').find(node => node.props.label === 'Ad').props.value, 'Ayşe');
  await Renderer.act(async () => root.unmount());
});


test('search and role filters show only matching accounts and clear correctly', async () => {
  const app = setup(true); let root;
  await Renderer.act(async () => {root = Renderer.create(React.createElement(app.Component, {onBack(){}}));});
  const rows = () => root.root.findAllByType('Button').filter(node => node.props.title === 'Şifreyi sıfırla');
  const filter = label => root.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel === label);
  assert.equal(rows().length, 2);
  await Renderer.act(async () => root.root.findByType('TextInput').props.onChangeText('ayşe'));
  assert.equal(rows().length, 1);
  assert.ok(root.root.findAllByType('Text').some(node => node.props.children === 'Ayşe Yılmaz'));
  await Renderer.act(async () => filter('Yöneticiler').props.onPress());
  assert.equal(rows().length, 0);
  assert.ok(root.root.findAllByType('Text').some(node => node.props.children === 'Kullanıcı bulunamadı'));
  await Renderer.act(async () => root.root.findAllByType('Button').find(node => node.props.title === 'Filtreleri temizle').props.onPress());
  assert.equal(rows().length, 2);
  await Renderer.act(async () => filter('Yöneticiler').props.onPress());
  assert.equal(rows().length, 1);
  assert.ok(root.root.findAllByType('Text').some(node => node.props.children === 'İnternet Tekstil'));
  await Renderer.act(async () => root.unmount());
});

