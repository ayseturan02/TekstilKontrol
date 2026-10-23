const {test}=require('node:test');
const assert=require('node:assert/strict');
const {authenticate}=require('../src/services/auth');
test('demo login succeeds without calling any server, including non-development builds',async()=>{
  const token=await authenticate(' demo@tekstil.com ','Demo123',{fetchImpl:()=>{throw Error('Server must not be used');}});
  assert.equal(token,'demo-session');
  assert.equal(await authenticate('DEMO@TEKSTIL.COM','Demo123\n'),'demo-session');
});
test('incorrect demo password fails immediately without a network request',async()=>{
  await assert.rejects(authenticate('demo@tekstil.com','incorrect',{fetchImpl:()=>{throw Error('Must not fetch');}}),/Demo/);
});
test('a stalled request times out even if fetch ignores AbortSignal',async()=>{
  await assert.rejects(authenticate('user@example.com','password',{api:'http://test',fetchImpl:()=>new Promise(()=>{}),timeoutMs:15}),/Sunucuya/);
});
test('a stalled response body also times out',async()=>{
  await assert.rejects(authenticate('user@example.com','password',{api:'http://test',fetchImpl:async()=>({ok:true,json:()=>new Promise(()=>{})}),timeoutMs:15}),/Sunucuya/);
});
test('real login requires a valid token and preserves server errors',async()=>{
  assert.equal(await authenticate('user@example.com','password',{api:'http://test',fetchImpl:async()=>({ok:true,json:async()=>({token:'signed-token'})})}),'signed-token');
  await assert.rejects(authenticate('user@example.com','wrong',{api:'http://test',fetchImpl:async()=>({ok:false,json:async()=>({error:'Invalid credentials'})})}),/Invalid credentials/);
});

test('login exposes the server profile and demo never grants an admin role',async()=>{
  let profile;
  const user={id:'admin',firstName:'İnternet',lastName:'Tekstil',email:'admin@example.com',role:'admin'};
  await authenticate(user.email,'SomePassword123!',{api:'http://test',onProfile:value=>{profile=value;},fetchImpl:async()=>({ok:true,json:async()=>({token:'signed-token',user})})});
  assert.deepEqual(profile,user);
  await authenticate('demo@tekstil.com','Demo123',{onProfile:value=>{profile=value;}});
  assert.equal(profile.role,'user');
});

test('authenticated requests send the session token and preserve authorization errors',async()=>{
  const {apiRequest}=require('../src/services/auth');let request;
  await assert.rejects(apiRequest('http://test','/admin/users',{token:'worker-token',fetchImpl:async(url,options)=>{request={url,options};return {ok:false,status:403,json:async()=>({error:'Yönetici gerekli'})};}}),error=>error.status===403&&error.message==='Yönetici gerekli');
  assert.equal(request.url,'http://test/admin/users');assert.equal(request.options.headers.Authorization,'Bearer worker-token');
});
