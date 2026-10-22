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
