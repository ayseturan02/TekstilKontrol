const cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const serial=process.argv[2];if(!serial||!/^[A-Za-z0-9_-]+$/.test(serial))throw Error('Pass a physical Android serial');
const direct=process.argv.includes('--direct');
const packageName='com.tekstilkontrol',port=9228,results={device:serial,cases:{},restored:false};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function adb(args){const r=cp.spawnSync('adb',['-s',serial,...args],{maxBuffer:30*1024*1024,timeout:20000});if(r.status!==0)throw Error(r.stderr?.toString()||r.error?.message||'ADB failed');return r.stdout;}
function check(name,condition){if(!condition)throw Error('FAILED: '+name);results.cases[name]='passed';console.log('PASS: '+name);}
function nodes(xml){return (xml.match(/<node\b[^>]*>/g)||[]).map(raw=>Object.fromEntries([...raw.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]])));}
function bounds(node){const n=node?.bounds?.match(/\d+/g)?.map(Number);if(!n||n.length!==4)throw Error('No UI bounds');return {x:n[0],y:n[1],w:n[2]-n[0],h:n[3]-n[1]};}
function ui(){const file='/sdcard/tekstil-phone-test.xml';const r=adb(['shell','uiautomator','dump',file]).toString();if(!r.includes('dumped'))throw Error(r);return adb(['shell','cat',file]).toString();}
function nativeTap(match){const node=nodes(ui()).find(match);const b=bounds(node);adb(['shell','input','tap',String(Math.round(b.x+b.w/2)),String(Math.round(b.y+b.h/2))]);}
function keyboardShown(){return /mInputShown=true|mIsInputViewShown=true|isInputViewShown=true/.test(adb(['shell','dumpsys','input_method']).toString());}
function hideKeyboard(){if(keyboardShown()||knownKeyboard)adb(['shell','input','keyevent','4']);knownKeyboard=false;}
let session,original,noteChanged=false,knownKeyboard=false,webBounds;
const backupDir=path.join(os.tmpdir(),'TekstilKontrolPhoneTest',serial),backupFile=path.join(backupDir,'restore-state.json');
async function connect(){
 const pid=adb(['shell','pidof',packageName]).toString().trim().split(' ')[0];adb(['forward','tcp:'+port,'localabstract:webview_devtools_remote_'+pid]);
 let target;
 for(let i=0;i<15;i++){try{const pages=await(await fetch('http://127.0.0.1:'+port+'/json')).json();target=pages.find(p=>p.title==='Kontrol Raporu');if(target)break;}catch{}await pause(300);}
 if(!target)throw Error('Report WebView unavailable');
 const description=JSON.parse(target.description||'{}');webBounds={x:description.screenX||0,y:description.screenY||0,w:description.width,h:description.height};
 const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 let id=0;const pending=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);const entry=pending.get(m.id);if(entry){clearTimeout(entry.timer);pending.delete(m.id);if(m.error||m.result?.exceptionDetails)entry.reject(Error(JSON.stringify(m.error||m.result.exceptionDetails)));else entry.resolve(m.result);}});
 return {close:()=>ws.close(),command:(method,params={})=>new Promise((resolve,reject)=>{const next=++id;const timer=setTimeout(()=>{pending.delete(next);reject(Error('Debug request timed out: '+method));},7000);pending.set(next,{resolve,reject,timer});ws.send(JSON.stringify({id:next,method,params}));})};
}
async function evaluate(expression){return (await session.command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result?.value;}
async function poll(expression){for(let i=0;i<30;i++){if(await evaluate(expression))return;await pause(120);}throw Error('Condition did not become true');}
async function webTap(selector){
 await evaluate('(function(){document.querySelector('+JSON.stringify(selector)+').scrollIntoView({block:"center",inline:"nearest"});return true;})()');await pause(150);
 const r=JSON.parse(await evaluate('(function(){var r=document.querySelector('+JSON.stringify(selector)+').getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,width:visualViewport.width,offsetX:visualViewport.offsetLeft,offsetY:visualViewport.offsetTop});})()'));
 const b=direct?webBounds:bounds(nodes(ui()).find(n=>n.class==='android.webkit.WebView'));const ratio=b.w/r.width;
 adb(['shell','input','tap',String(Math.round(b.x+(r.x-r.offsetX)*ratio)),String(Math.round(b.y+(r.y-r.offsetY)*ratio))]);
}
async function toForm(){
 if(direct){if(await evaluate('!!document.querySelector(".filled")')){session?.close();adb(['shell','input','tap','1020','2440']);await pause(450);session=await connect();}return;}
 const xml=ui();if(xml.includes('Forma dön')){session?.close();nativeTap(n=>n['content-desc']?.includes('Forma dön'));await pause(350);session=await connect();}
}
async function restore(){
 if(!original||!noteChanged)return;
 hideKeyboard();await toForm();
 const restored=await evaluate('(function(data){Object.keys(data.fields).forEach(function(key){var e=Array.from(document.querySelectorAll(".paper-input")).find(function(el){return el.dataset.field===key;});if(e&&e.value!==data.fields[key]){e.value=data.fields[key];e.dispatchEvent(new Event("input",{bubbles:true}));}});Object.keys(data.choices).forEach(function(key){var group=Array.from(document.querySelectorAll("[data-choice]")).filter(function(e){return e.dataset.path===key;});var wanted=data.choices[key];if(group[0].dataset.multi==="true"){group.forEach(function(e){if((e.getAttribute("aria-checked")==="true")!==wanted.includes(e.dataset.value))e.click();});}else{var selected=group.find(function(e){return e.getAttribute("aria-checked")==="true";});var target=group.find(function(e){return wanted.includes(e.dataset.value);});if(target&&target!==selected)target.click();else if(!target&&selected)selected.click();}});return true;})('+JSON.stringify(original)+')');
 if(!restored)throw Error('Restore did not execute');await pause(900);
 const values=JSON.parse(await evaluate('(function(){var out={};document.querySelectorAll(".paper-input").forEach(function(e){out[e.dataset.field]=e.value;});return JSON.stringify(out);})()'));
 if(JSON.stringify(values)!==JSON.stringify(original.fields))throw Error('Original form values were not fully restored');
 results.restored=true;noteChanged=false;if(fs.existsSync(backupFile))fs.unlinkSync(backupFile);console.log('PASS: original form values restored');
}
(async()=>{
 try{
  if(!process.argv.includes('--reuse')){adb(['shell','am','force-stop',packageName]);adb(['shell','am','start','-W','-n',packageName+'/.MainActivity']);await pause(3000);}
  if(!direct){
  let xml=ui();
  if(xml.includes('Demo hesabında e-posta gönderimi kapalı')){nativeTap(n=>/^(tamam|ok)$/i.test(n.text||n['content-desc']||''));await pause(200);xml=ui();}
  if(xml.includes('Forma dön')){nativeTap(n=>n['content-desc']?.includes('Forma dön'));await pause(350);xml=ui();}
  if(xml.includes('E-posta adresi')){
   nativeTap(n=>n['content-desc']==='E-posta adresi');adb(['shell','input','text','demo@tekstil.com']);adb(['shell','input','keyevent','61']);adb(['shell','input','text','Demo123']);hideKeyboard();nativeTap(n=>n['content-desc']==='Giriş yap');await pause(1500);
   xml=ui();if(/Google Password Manager|Google Şifre|hizmetine kaydedilsin/.test(xml)){adb(['shell','input','keyevent','4']);await pause(250);xml=ui();}
  }
  }
  session=await connect();await toForm();await poll('!!document.querySelector(".paper-input")');check('demo_login',true);check('android_preserves_page_scale',Math.abs(await evaluate('visualViewport.scale')-1)<0.03);
  original=JSON.parse(await evaluate('(function(){var fields={},choices={};document.querySelectorAll(".paper-input").forEach(function(e){fields[e.dataset.field]=e.value;});document.querySelectorAll("[data-choice]").forEach(function(e){var key=e.dataset.path;if(!choices[key])choices[key]=[];if(e.getAttribute("aria-checked")==="true")choices[key].push(e.dataset.value);});return JSON.stringify({fields:fields,choices:choices});})()'));
  fs.mkdirSync(backupDir,{recursive:true});fs.writeFileSync(backupFile,JSON.stringify(original),'utf8');noteChanged=true;
  const beforeHeight=await evaluate('window.visualViewport.height');
  const notePath='checks.Tanımlama.note',selector='[data-field="'+notePath+'"]';
  await webTap(selector);await pause(500);
  check('tap_focus_and_zoom',await evaluate('document.activeElement.dataset.field==='+JSON.stringify(notePath)+'&&document.getElementById("paper").style.transform==="scale(1.2)"'));
  check('keyboard_opens',keyboardShown()||await evaluate('window.visualViewport.height')<beforeHeight-70);knownKeyboard=true;
  const sample='1. Birinci kontrol satırı.\n2. İkinci satır ayrı kalmalı.\n\nBoş satır korunmalı.\n'+('Dikiş ve ölçü kontrollerinde görülen hatalar tekrar değerlendirilecek. '.repeat(18))+'\nSON SATIR: TELEFON TESTİ TAMAMLANDI.';
  noteChanged=true;
  await evaluate('(function(){var e=document.querySelector('+JSON.stringify(selector)+');e.value="";e.setSelectionRange(0,0);e.dispatchEvent(new Event("input",{bubbles:true}));return true;})()');await pause(150);
  await session.command('Input.insertText',{text:sample});await poll('document.querySelector('+JSON.stringify(selector)+').value==='+JSON.stringify(sample));
  await poll('(function(){var e=document.querySelector('+JSON.stringify(selector)+');return e.clientHeight>=e.scrollHeight-1;})()');check('inline_typing_and_live_row_growth',true);
  fs.writeFileSync('artifacts/phone-test-inline.png',adb(['exec-out','screencap','-p']));
  hideKeyboard();await evaluate('document.getElementById("zoom-back").click();true');await pause(200);
  session.close();if(direct)adb(['shell','input','tap','1020','2440']);else nativeTap(n=>n['content-desc']?.includes('Önizle'));await pause(450);session=await connect();await poll('!!document.querySelector(".filled")');
  const field='[data-report-field="'+notePath+'"]';
  const preview=JSON.parse(await evaluate('(function(){var e=document.querySelector('+JSON.stringify(field)+');var next=Array.from(document.querySelectorAll("[data-report-field]")).find(function(el){return el.dataset.reportField==="checks.Ölçü.note";});return JSON.stringify({text:e.textContent,visible:e.scrollHeight<=e.clientHeight+1&&e.scrollWidth<=e.clientWidth+1,whiteSpace:getComputedStyle(e).whiteSpace,notOverlapping:next.getBoundingClientRect().top>=e.getBoundingClientRect().bottom});})()'));
  check('preview_preserves_newlines_and_all_text',preview.text===sample&&preview.whiteSpace==='pre-wrap');check('preview_has_no_clipping_or_overlap',preview.visible&&preview.notOverlapping);
  await evaluate('document.querySelector('+JSON.stringify(field)+').scrollIntoView({block:"center"});true');
  fs.writeFileSync('artifacts/phone-test-preview.png',adb(['exec-out','screencap','-p']));
  await toForm();await poll('!!document.querySelector(".paper-input")');
  const firstChoice='[data-path="reason"]';const oldTick=await evaluate('document.querySelector('+JSON.stringify(firstChoice)+').getAttribute("aria-checked")');await webTap(firstChoice);await pause(180);check('checkbox_toggle',await evaluate('document.querySelector('+JSON.stringify(firstChoice)+').getAttribute("aria-checked")')!==oldTick);
  await restore();await evaluate('document.getElementById("zoom-back").click();window.scrollTo(0,0);true');await pause(250);
  fs.writeFileSync('artifacts/phone-test-form.png',adb(['exec-out','screencap','-p']));
 }catch(error){results.error=error.message;console.error(error.stack);process.exitCode=1;}
 finally{
  try{await restore();}catch(error){results.restoreError=error.message;console.error('Restore requires follow-up:',error.message);process.exitCode=1;}
  session?.close();fs.writeFileSync('artifacts/phone-test-results.json',JSON.stringify(results,null,2),'utf8');
 }
})();
