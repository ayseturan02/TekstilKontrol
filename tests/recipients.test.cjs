const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {createRequire} = require('node:module');
const {createApp} = require('../server/app');
const {createRecipientStore} = require('../server/recipients');
async function fixture(t){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tekstil-recipients-'));const filename=path.join(directory,'recipients.json');const recipientStore=createRecipientStore(filename);await recipientStore.init();
 const server=await new Promise(resolve=>{const listener=createApp({recipientStore}).listen(0,'127.0.0.1',()=>resolve(listener));});
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));await fs.rm(directory,{recursive:true,force:true});});
 return {recipientStore,filename,base:'http://127.0.0.1:'+server.address().port};
}
test('recipient directory remains available without a session',async t=>{
 const {base}=await fixture(t);const response=await fetch(base+'/recipients');assert.equal(response.status,200);assert.equal((await response.json()).recipients.length,3);
});
test('login and all admin endpoints are removed',async t=>{
 const {base}=await fixture(t);
 for(const [method,route] of [['POST','/login'],['GET','/me'],['GET','/admin/users'],['POST','/admin/users'],['POST','/admin/users/one/reset-password'],['POST','/admin/recipients'],['DELETE','/admin/recipients/one']])assert.equal((await fetch(base+route,{method})).status,404);
});
test('existing recipient records persist and validate duplicates',async t=>{
 const {recipientStore,filename}=await fixture(t);await recipientStore.create({email:'QUALITY@FIRMA.COM',name:'Quality'});await assert.rejects(recipientStore.create({email:'quality@firma.com'}));await assert.rejects(recipientStore.create({email:'bad'}));
 const restored=createRecipientStore(filename);await restored.init();assert.deepEqual(restored.list(),recipientStore.list());
});
