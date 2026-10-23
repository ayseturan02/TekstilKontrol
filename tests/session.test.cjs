const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const React=require('react');
const Renderer=require('react-test-renderer');
const {createInitial,normalizeReport}=require('../shared/reportTemplate');
global.IS_REACT_ACT_ENVIRONMENT=true;
const code=require('@babel/core').transformFileSync(require.resolve('../src/context/AppContext.tsx'),{presets:['module:@react-native/babel-preset'],configFile:false,babelrc:false}).code;
function harness(){
 let readHook=null,writeHook=null,mediaHook=async()=>({didCancel:true});
 const storage=new Map();const alerts=[];let state;
 const module={exports:{}};
 const AsyncStorage={getItem:async key=>readHook?readHook(key,()=>storage.get(key)||null):storage.get(key)||null,setItem:async(key,value)=>{if(writeHook)await writeHook(key,value);storage.set(key,value);},removeItem:async key=>{storage.delete(key);}};
 vm.runInNewContext(code,{module,exports:module.exports,setTimeout,clearTimeout,require:name=>{
  if(name==='react')return React;
  if(name==='react-native')return {Alert:{alert:(...args)=>alerts.push(args)}};
  if(name==='@react-native-async-storage/async-storage')return AsyncStorage;
  if(name==='react-native-image-picker')return {launchCamera:()=>mediaHook(),launchImageLibrary:()=>mediaHook()};
  if(name==='../report')return {API:'',createInitial,normalizeReport};
  return require(name);
 }});
 const {AppProvider,useApp}=module.exports;
 function Probe(){state=useApp();return null;}
 return {storage,alerts,setMediaHook:fn=>{mediaHook=fn;},setReadHook:fn=>{readHook=fn;},setWriteHook:fn=>{writeHook=fn;},get state(){return state;},mount:async()=>{
  let root;await Renderer.act(async()=>{root=Renderer.create(React.createElement(AppProvider,null,React.createElement(Probe)));});return root;
 }};
}

const key='paper-form-v4:device';
test('form is ready without a session and saves and restores a device draft',async()=>{
 const app=harness();let root=await app.mount();assert.equal(app.state.ready,true);assert.equal(app.state.login,undefined);assert.equal(app.state.logout,undefined);
 await Renderer.act(async()=>{app.state.setPath('customer','Device customer');app.state.setPath('notes','Saved note');app.state.setPath('manufacturerSignature','data:image/png;base64,AAAA');app.state.set('media',[{uri:'file:///one.jpg'}]);});
 await Renderer.act(async()=>app.state.persist());await Renderer.act(async()=>root.unmount());root=await app.mount();
 assert.equal(app.state.d.customer,'Device customer');assert.equal(app.state.d.notes,'Saved note');assert.equal(app.state.d.media[0].uri,'file:///one.jpg');assert.equal(app.state.d.manufacturerSignature,'data:image/png;base64,AAAA');
 await Renderer.act(async()=>root.unmount());
});
test('last active account draft migrates without modifying the original data',async()=>{
 const app=harness();const previous='paper-form-v3:user:previous-user';const value=JSON.stringify({...createInitial(),customer:'Previous form'});
 app.storage.set('saved-session-v1',JSON.stringify({user:{id:'previous-user'}}));app.storage.set(previous,value);
 const root=await app.mount();assert.equal(app.state.d.customer,'Previous form');await Renderer.act(async()=>app.state.persist());assert.equal(app.storage.get(previous),value);assert.equal(JSON.parse(app.storage.get(key)).customer,'Previous form');await Renderer.act(async()=>root.unmount());
});
test('device draft wins over older account data',async()=>{
 const app=harness();app.storage.set(key,JSON.stringify({...createInitial(),customer:'Device'}));app.storage.set('saved-session-v1',JSON.stringify({user:{id:'previous-user'}}));app.storage.set('paper-form-v3:user:previous-user',JSON.stringify({...createInitial(),customer:'Old'}));
 const root=await app.mount();assert.equal(app.state.d.customer,'Device');await Renderer.act(async()=>root.unmount());
});
test('broken saved data is preserved and never overwritten by an empty report',async()=>{
 const app=harness();app.storage.set(key,'broken json');const root=await app.mount();assert.equal(app.state.ready,true);await Renderer.act(async()=>app.state.save());assert.equal(app.storage.get(key),'broken json');await Renderer.act(async()=>root.unmount());
});
test('automatic saving works without a login',async()=>{
 const app=harness();const root=await app.mount();await Renderer.act(async()=>app.state.setPath('customer','Automatic'));await Renderer.act(async()=>new Promise(resolve=>setTimeout(resolve,700)));assert.equal(JSON.parse(app.storage.get(key)).customer,'Automatic');await Renderer.act(async()=>root.unmount());
});

test('clear removes all report contents and persists the empty form across restart',async()=>{
 const app=harness();let root=await app.mount();
 await Renderer.act(async()=>{app.state.setPath('customer','Customer');app.state.setPath('notes','Notes');app.state.setPath('recipient','one@example.com');app.state.setPath('manufacturerSignature','data:image/png;base64,AAAA');app.state.set('media',[{uri:'file:///one.jpg'}]);});
 await Renderer.act(async()=>app.state.clearReport());
 assert.deepEqual(JSON.parse(JSON.stringify(app.state.d)),createInitial());assert.deepEqual(JSON.parse(app.storage.get(key)),createInitial());
 await Renderer.act(async()=>new Promise(resolve=>setTimeout(resolve,700)));
 await Renderer.act(async()=>root.unmount());root=await app.mount();assert.deepEqual(JSON.parse(JSON.stringify(app.state.d)),createInitial());await Renderer.act(async()=>root.unmount());
});
test('failed clear preserves the visible report and the saved draft',async()=>{
 const app=harness();const root=await app.mount();await Renderer.act(async()=>app.state.setPath('customer','Keep'));await Renderer.act(async()=>app.state.persist());
 app.setWriteHook(()=>{throw Error('Disk full');});let cleared;
 await Renderer.act(async()=>{cleared=await app.state.clearReport();});assert.equal(cleared,false);assert.equal(app.state.d.customer,'Keep');assert.equal(JSON.parse(app.storage.get(key)).customer,'Keep');await Renderer.act(async()=>root.unmount());
});
test('a media picker result opened before clear cannot refill the empty report',async()=>{
 const app=harness();const root=await app.mount();let finish,picking;app.setMediaHook(()=>new Promise(resolve=>{finish=resolve;}));
 await Renderer.act(async()=>{picking=app.state.addMedia(false,false);});await Renderer.act(async()=>app.state.clearReport());
 await Renderer.act(async()=>{finish({assets:[{uri:'file:///old.jpg'}]});await picking;});assert.equal(app.state.d.media.length,0);await Renderer.act(async()=>root.unmount());
});
