const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const React = require('react');
const Renderer = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const code = require('@babel/core').transformFileSync(require.resolve('../src/components/RecipientSettings.tsx'), {presets: ['module:@react-native/babel-preset'], configFile: false, babelrc: false}).code;
function setup(role = 'admin', fail = false) {
  const module = {exports: {}}, calls = [], alerts = [];
  const initial = {id: 'one', name: 'Kalite Ekibi', email: 'kalite@example.com', isExample: true};
  vm.runInNewContext(code, {module, exports: module.exports, require: name => {
    if (name === 'react') return React;
    if (name === 'react-native') return {...Object.fromEntries(['View','Text','Modal','ScrollView','KeyboardAvoidingView','ActivityIndicator'].map(key => [key,key])), Alert: {alert: (...args) => alerts.push(args)}, Platform: {OS: 'android'}, StyleSheet: {create: value => value}};
    if (name === 'react-native-safe-area-context') return {SafeAreaView: 'SafeAreaView'};
    if (name === '../context/AppContext') return {useApp: () => ({token: 'token', user: {role}})};
    if (name === '../report') return {API: 'http://test'};
    if (name === '../../shared/recipients') return require('../shared/recipients');
    if (name === './Form') return {Button: 'Button', Field: 'Field'};
    if (name === '../services/auth') return {apiRequest: async (api, path, options) => {
      calls.push({path, options});
      if (!options.method) return {recipients: [initial]};
      if (options.method === 'POST') {if (fail) throw Error('Bu e-posta adresi listede zaten var.'); return {recipient: {id: 'two', ...options.body, isExample: false}};}
      return {ok: true};
    }};
    return require(name);
  }});
  return {Component: module.exports.default, calls, alerts};
}
test('admin adds a saved email and can remove it after confirmation', async () => {
  const app = setup(); let root;
  await Renderer.act(async () => {root = Renderer.create(React.createElement(app.Component));});
  const button = title => root.root.findAllByType('Button').find(node => node.props.title === title);
  await Renderer.act(async () => button('+ Mail ekle').props.onPress());
  for (const [label, value] of [['Kişi / ekip adı (isteğe bağlı)', 'Rapor Ekibi'], ['E-posta adresi', ' RAPOR@FIRMA.COM ']]) await Renderer.act(async () => root.root.findAllByType('Field').find(node => node.props.label === label).props.onChangeText(value));
  await Renderer.act(async () => button('E-postayı kaydet').props.onPress());
  const added = app.calls.find(call => call.options.method === 'POST');
  assert.equal(added.path, '/admin/recipients'); assert.equal(added.options.body.email, 'rapor@firma.com');
  assert.equal(root.root.findByType('Modal').props.visible, false);
  assert.equal(root.root.findAllByType('Button').filter(node => node.props.title === 'Kaldır').length, 2);
  await Renderer.act(async () => root.root.findAllByType('Button').filter(node => node.props.title === 'Kaldır')[1].props.onPress());
  assert.equal(app.calls.filter(call => call.options.method === 'DELETE').length, 0);
  await Renderer.act(async () => {await app.alerts.at(-1)[2].find(option => option.text === 'Kaldır').onPress();});
  assert.ok(app.calls.some(call => call.path === '/admin/recipients/two' && call.options.method === 'DELETE'));
  assert.equal(root.root.findAllByType('Button').filter(node => node.props.title === 'Kaldır').length, 1);
  await Renderer.act(async () => root.unmount());
});
test('duplicate recipient errors keep the add dialog open and preserve the email', async () => {
  const app = setup('admin', true); let root;
  await Renderer.act(async () => {root = Renderer.create(React.createElement(app.Component));});
  await Renderer.act(async () => root.root.findAllByType('Button').find(node => node.props.title === '+ Mail ekle').props.onPress());
  await Renderer.act(async () => root.root.findAllByType('Field').find(node => node.props.label === 'E-posta adresi').props.onChangeText('kalite@example.com'));
  await Renderer.act(async () => root.root.findAllByType('Button').find(node => node.props.title === 'E-postayı kaydet').props.onPress());
  assert.equal(root.root.findByType('Modal').props.visible, true);
  assert.ok(root.root.findAllByType('Text').some(node => node.props.accessibilityRole === 'alert' && node.props.children.includes('zaten var')));
  await Renderer.act(async () => root.unmount());
});
test('regular accounts cannot render or fetch the recipient management panel', async () => {
  const app = setup('user'); let root;
  await Renderer.act(async () => {root = Renderer.create(React.createElement(app.Component));});
  assert.equal(root.toJSON(), null); assert.equal(app.calls.length, 0);
  await Renderer.act(async () => root.unmount());
});

