const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const React=require('react');
const Renderer=require('react-test-renderer');
const {createInitial,normalizeReport}=require('../shared/reportTemplate');
global.IS_REACT_ACT_ENVIRONMENT=true;
const code=require('@babel/core').transformFileSync(require.resolve('../src/context/AppContext.tsx'),{presets:['module:@react-native/babel-preset'],configFile:false,babelrc:false}).code;
function harness(){
 const profileFor=email=>({id:email==='demo@tekstil.com'?'demo':email,firstName:email==='demo@tekstil.com'?'Demo':'Test',lastName:'Kullanıcı',email,role:'user'});
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
  if(name==='../services/auth')return {authenticate:async(email,password,options)=>{email=email.trim().toLowerCase();options.onProfile(profileFor(email));return email==='demo@tekstil.com'?'demo-session':'session:'+email;},getProfile:async(api,token)=>profileFor(token==='demo-session'?'demo@tekstil.com':token.slice(8))};
  return require(name);
 }});
 const {AppProvider,useApp}=module.exports;
 function Probe(){state=useApp();return null;}
 return {storage,alerts,setMediaHook:fn=>{mediaHook=fn;},setReadHook:fn=>{readHook=fn;},setWriteHook:fn=>{writeHook=fn;},get state(){return state;},mount:async()=>{
  let root;await Renderer.act(async()=>{root=Renderer.create(React.createElement(AppProvider,null,React.createElement(Probe)));});return root;
 }};
}
test('login persists session without password, restart restores it and logout removes it while preserving draft',async()=>{
 const app=harness();let root=await app.mount();assert.equal(app.state.sessionReady,true);assert.equal(app.state.token,'');
 await Renderer.act(async()=>{app.state.setEmail('demo@tekstil.com');app.state.setPassword('Demo123');});
 await Renderer.act(async()=>{await app.state.login();});
 assert.equal(app.state.token,'demo-session');
 assert.deepEqual(JSON.parse(app.storage.get('saved-session-v1')),{token:'demo-session',email:'demo@tekstil.com',user:{id:'demo',firstName:'Demo',lastName:'Kullanıcı',email:'demo@tekstil.com',role:'user'}});
 assert.equal(app.state.password,'');
 await Renderer.act(async()=>root.unmount());
 root=await app.mount();assert.equal(app.state.token,'demo-session');
 await Renderer.act(async()=>app.state.setPath('customer','Saved customer'));
 await Renderer.act(async()=>{await app.state.logout();});
 assert.equal(app.state.token,'');assert.equal(app.storage.has('saved-session-v1'),false);
 assert.equal(JSON.parse(app.storage.get('paper-form-v3:user:demo')).customer,'Saved customer');
 await Renderer.act(async()=>root.unmount());root=await app.mount();assert.equal(app.state.token,'');
 await Renderer.act(async()=>root.unmount());
});
test('invalid saved session does not prevent opening the login screen',async()=>{
 const app=harness();app.storage.set('saved-session-v1','invalid json');const root=await app.mount();
 assert.equal(app.state.sessionReady,true);assert.equal(app.state.token,'');
 await Renderer.act(async()=>root.unmount());
});

const keyFor=email=>'paper-form-v3:user:'+encodeURIComponent(email);
async function signIn(app,email){
 await Renderer.act(async()=>{app.state.setEmail(email);app.state.setPassword('TestPass123!');});
 await Renderer.act(async()=>{await app.state.login();});
}

test('different accounts restore only their own text, choices, attachments and signatures',async()=>{
 const app=harness();let root=await app.mount();
 const legacy=JSON.stringify({...createInitial(),customer:'Old shared customer'});app.storage.set('paper-form-v2',legacy);
 await signIn(app,'one@example.com');assert.equal(app.state.d.customer,'');
 await Renderer.act(async()=>{app.state.setPath('customer','Account One');app.state.setPath('notes','Private notes');app.state.setPath('manufacturerSignature','data:image/png;base64,AAAA');app.state.set('media',[{uri:'file:///one.jpg'}]);app.state.setPath('reason','Ara Kontrol');});
 await Renderer.act(async()=>{await app.state.logout();});assert.equal(app.state.d.customer,'');assert.equal(app.state.d.media.length,0);
 await signIn(app,'two@example.com');assert.equal(app.state.d.customer,'');assert.equal(app.state.d.notes,'');assert.equal(app.state.d.manufacturerSignature,'');assert.equal(app.state.d.media.length,0);assert.equal(app.state.d.reason,'');
 await Renderer.act(async()=>app.state.setPath('customer','Account Two'));
 await Renderer.act(async()=>{await app.state.logout();});
 await signIn(app,'one@example.com');assert.equal(app.state.d.customer,'Account One');assert.equal(app.state.d.notes,'Private notes');assert.equal(app.state.d.reason,'Ara Kontrol');assert.equal(app.state.d.media[0].uri,'file:///one.jpg');assert.equal(app.state.d.manufacturerSignature,'data:image/png;base64,AAAA');
 await Renderer.act(async()=>root.unmount());root=await app.mount();assert.equal(app.state.d.customer,'Account One');
 assert.equal(JSON.parse(app.storage.get(keyFor('two@example.com'))).customer,'Account Two');assert.equal(app.storage.get('paper-form-v2'),legacy);
 await Renderer.act(async()=>root.unmount());
});

test('a late draft read from a previous account cannot replace the current account form',async()=>{
 const app=harness();const root=await app.mount();let release;
 app.setReadHook((key,read)=>key===keyFor('one@example.com')?new Promise(resolve=>{release=resolve;}):read());
 app.storage.set(keyFor('two@example.com'),JSON.stringify({...createInitial(),customer:'Only Two'}));
 await signIn(app,'one@example.com');assert.equal(app.state.ready,false);assert.equal(app.state.d.customer,'');
 await Renderer.act(async()=>{await app.state.logout();});await signIn(app,'two@example.com');assert.equal(app.state.ready,true);assert.equal(app.state.d.customer,'Only Two');
 await Renderer.act(async()=>release(JSON.stringify({...createInitial(),customer:'Late One'})));
 assert.equal(app.state.d.customer,'Only Two');assert.equal(app.state.user.email,'two@example.com');
 await Renderer.act(async()=>root.unmount());
});

test('a queued save keeps its original account key during account switching',async()=>{
 const app=harness();const root=await app.mount();await signIn(app,'one@example.com');
 await Renderer.act(async()=>app.state.setPath('customer','Saved for One'));
 let release;let saving;
 app.setWriteHook((key)=>key===keyFor('one@example.com')?new Promise(resolve=>{release=resolve;}):undefined);
 await Renderer.act(async()=>{saving=app.state.persist();await Promise.resolve();});
 await signIn(app,'two@example.com');assert.equal(app.state.ready,false);assert.equal(app.state.d.customer,'');
 await Renderer.act(async()=>{release();await saving;});
 assert.equal(app.state.ready,true);assert.equal(app.state.d.customer,'');
 assert.equal(JSON.parse(app.storage.get(keyFor('one@example.com'))).customer,'Saved for One');
 assert.equal(app.storage.has(keyFor('two@example.com')),false);
 await Renderer.act(async()=>root.unmount());
});

test('a broken personal draft is preserved and is never overwritten with an empty form',async()=>{
 const app=harness();const root=await app.mount();app.storage.set(keyFor('broken@example.com'),'broken json');
 await signIn(app,'broken@example.com');assert.equal(app.state.ready,true);
 await Renderer.act(async()=>{await app.state.save();});
 assert.equal(app.storage.get(keyFor('broken@example.com')),'broken json');
 await Renderer.act(async()=>{await app.state.logout();});assert.equal(app.storage.get(keyFor('broken@example.com')),'broken json');
 await Renderer.act(async()=>root.unmount());
});


test('automatic saves are scoped to the signed-in account and stop on logout',async()=>{
 const app=harness();const root=await app.mount();await signIn(app,'auto-one@example.com');
 await Renderer.act(async()=>app.state.setPath('notes','Only One'));
 await Renderer.act(async()=>{await new Promise(resolve=>setTimeout(resolve,650));});
 assert.equal(JSON.parse(app.storage.get(keyFor('auto-one@example.com'))).notes,'Only One');
 await Renderer.act(async()=>{await app.state.logout();});await signIn(app,'auto-two@example.com');
 await Renderer.act(async()=>app.state.setPath('notes','Only Two'));
 await Renderer.act(async()=>{await new Promise(resolve=>setTimeout(resolve,650));});
 assert.equal(JSON.parse(app.storage.get(keyFor('auto-one@example.com'))).notes,'Only One');assert.equal(JSON.parse(app.storage.get(keyFor('auto-two@example.com'))).notes,'Only Two');
 assert.equal(app.storage.has('paper-form-v2'),false);
 await Renderer.act(async()=>root.unmount());
});

test('a gallery result from a previous account is not attached to the new account report',async()=>{
 const app=harness();const root=await app.mount();await signIn(app,'one@example.com');let release,pending;
 app.setMediaHook(()=>new Promise(resolve=>{release=resolve;}));
 await Renderer.act(async()=>{pending=app.state.addMedia(false,false);});
 await Renderer.act(async()=>{await app.state.logout();});await signIn(app,'two@example.com');
 await Renderer.act(async()=>{release({assets:[{uri:'file:///private-one.jpg',type:'image/jpeg'}]});await pending;});
 assert.equal(app.state.d.media.length,0);
 await Renderer.act(async()=>root.unmount());
});
