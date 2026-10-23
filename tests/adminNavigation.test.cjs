const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const React = require('react');
const Renderer = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const code = require('@babel/core').transformFileSync(require.resolve('../src/navigation/AppRouter.tsx'), {presets: ['module:@react-native/babel-preset'], configFile: false, babelrc: false}).code;
function harness(role) {
  const module = {exports: {}};
  const state = {token: 'test-token', sessionReady: true, ready: true, email: 'account@example.com', user: {firstName: 'Ayşe', lastName: 'Yılmaz', role}};
  vm.runInNewContext(code, {module, exports: module.exports, setTimeout: fn => {fn(); return 1;}, clearTimeout(){}, require: name => {
    if (name === 'react') return React;
    if (name === 'react-native') return {...Object.fromEntries(['View','Text','TouchableOpacity','Modal','StatusBar','ActivityIndicator'].map(key => [key, key])), Alert: {}, BackHandler: {addEventListener: () => ({remove(){}})}};
    if (name === 'react-native-safe-area-context') return {SafeAreaView: 'SafeAreaView'};
    if (name === '../context/AppContext') return {useApp: () => state};
    if (name === '../components/Form') return {Button: 'Button'};
    if (name === '../styles') return {s: {}};
    if (name.startsWith('../screens/')) return {__esModule: true, default: name.split('/').at(-1)};
    return require(name);
  }});
  return {Component: module.exports.default, state};
}
test('admin sees real name and Settings in profile and can open user management', async () => {
  const {Component} = harness('admin'); let root;
  await Renderer.act(async () => {root = Renderer.create(React.createElement(Component));});
  const settings = root.root.findAll(node => node.type === 'TouchableOpacity' && node.props.accessibilityLabel === 'Ayarlar');
  assert.equal(settings.length, 1);
  assert.ok(root.root.findAllByType('Text').some(node => node.props.children === 'Ayşe Yılmaz'));
  await Renderer.act(async () => settings[0].props.onPress());
  assert.equal(root.root.findAllByType('SettingsScreen').length, 1);
  assert.equal(root.root.findAll(node => node.type === 'Button' && node.props.title === 'Kaydet').length, 0);
  await Renderer.act(async () => root.unmount());
});
test('ordinary account and demo profile have no Settings entry', async () => {
  const {Component} = harness('user'); let root;
  await Renderer.act(async () => {root = Renderer.create(React.createElement(Component));});
  assert.equal(root.root.findAll(node => node.props.accessibilityLabel === 'Ayarlar').length, 0);
  assert.equal(root.root.findAllByType('SettingsScreen').length, 0);
  await Renderer.act(async () => root.unmount());
});

