const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const React=require('react');
const Renderer=require('react-test-renderer');
const {createInitial,normalizeReport}=require('../shared/reportTemplate');
global.IS_REACT_ACT_ENVIRONMENT=true;
const code=require('@babel/core').transformFileSync(require.resolve('../src/context/AppContext.tsx'),{presets:['module:@react-native/babel-preset'],configFile:false,babelrc:false}).code;
function harness(){
 const storage=new Map();const alerts=[];let state;
 const module={exports:{}};
 const AsyncStorage={getItem:async key=>storage.get(key)||null,setItem:async(key,value)=>{storage.set(key,value);},removeItem:async key=>{storage.delete(key);}};
 vm.runInNewContext(code,{module,exports:module.exports,setTimeout,clearTimeout,require:name=>{
  if(name==='react')return React;
  if(name==='react-native')return {Alert:{alert:(...args)=>alerts.push(args)}};
  if(name==='@react-native-async-storage/async-storage')return AsyncStorage;
  if(name==='react-native-image-picker')return {};
  if(name==='../report')return {API:'',createInitial,normalizeReport};
  if(name==='../services/auth')return {authenticate:async()=> 'demo-session'};
  return require(name);
 }});
 const {AppProvider,useApp}=module.exports;
 function Probe(){state=useApp();return null;}
 return {storage,alerts,get state(){return state;},mount:async()=>{
  let root;await Renderer.act(async()=>{root=Renderer.create(React.createElement(AppProvider,null,React.createElement(Probe)));});return root;
 }};
}
test('login persists session without password, restart restores it and logout removes it while preserving draft',async()=>{
 const app=harness();let root=await app.mount();assert.equal(app.state.sessionReady,true);assert.equal(app.state.token,'');
 await Renderer.act(async()=>{app.state.setEmail('demo@tekstil.com');app.state.setPassword('Demo123');});
 await Renderer.act(async()=>{await app.state.login();});
 assert.equal(app.state.token,'demo-session');
 assert.deepEqual(JSON.parse(app.storage.get('saved-session-v1')),{token:'demo-session',email:'demo@tekstil.com'});
 assert.equal(app.state.password,'');
 await Renderer.act(async()=>root.unmount());
 root=await app.mount();assert.equal(app.state.token,'demo-session');
 await Renderer.act(async()=>app.state.setPath('customer','Saved customer'));
 await Renderer.act(async()=>{await app.state.logout();});
 assert.equal(app.state.token,'');assert.equal(app.storage.has('saved-session-v1'),false);
 assert.equal(JSON.parse(app.storage.get('paper-form-v2')).customer,'Saved customer');
 await Renderer.act(async()=>root.unmount());root=await app.mount();assert.equal(app.state.token,'');
 await Renderer.act(async()=>root.unmount());
});
test('invalid saved session does not prevent opening the login screen',async()=>{
 const app=harness();app.storage.set('saved-session-v1','invalid json');const root=await app.mount();
 assert.equal(app.state.sessionReady,true);assert.equal(app.state.token,'');
 await Renderer.act(async()=>root.unmount());
});
