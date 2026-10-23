const cp=require('node:child_process');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function adb(args){const r=cp.spawnSync('adb',args,{encoding:'utf8',timeout:15000});if(r.status!==0)throw Error(r.stderr||'adb failed');return r.stdout.trim();}
(async()=>{
 const pid=adb(['shell','pidof','com.tekstilkontrol']).split(' ')[0];adb(['forward','tcp:9231','localabstract:webview_devtools_remote_'+pid]);
 const pages=await(await fetch('http://127.0.0.1:9231/json')).json();const page=pages.find(p=>p.title==='Kontrol Raporu');if(!page)throw Error('Report form is not open');
 const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});let id=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}};
 const evaluate=expression=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,m=>{if(m.error||m.result.exceptionDetails)reject(Error(JSON.stringify(m.error||m.result.exceptionDetails)));else resolve(m.result.result.value);});ws.send(JSON.stringify({id:n,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}));});
 let original;
 try{
  original=await evaluate(`['manufacturer','controller'].reduce((result,role)=>{const image=document.querySelector('[data-signature="'+role+'"] img');result[role+'Signature']=image?image.getAttribute('src'):'';return result;},{})`);
  const nativeTap=async selector=>{
   await evaluate('(function(){document.querySelector('+JSON.stringify(selector)+').scrollIntoView({block:"center",inline:"center"});return true;})()');await pause(250);
   const rect=await evaluate('(function(){var r=document.querySelector('+JSON.stringify(selector)+').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,width:visualViewport.width,offsetX:visualViewport.offsetLeft,offsetY:visualViewport.offsetTop};})()');
   adb(['shell','uiautomator','dump','/sdcard/signature-ui.xml']);const xml=adb(['shell','cat','/sdcard/signature-ui.xml']);const node=(xml.match(/<node[^>]*class="android.webkit.WebView"[^>]*>/g)||[]).at(-1);if(!node)throw Error('WebView bounds unavailable');const box=node.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/).slice(1).map(Number);const k=(box[2]-box[0])/rect.width;
   adb(['shell','input','tap',String(Math.round(box[0]+(rect.x-rect.offsetX)*k)),String(Math.round(box[1]+(rect.y-rect.offsetY)*k))]);await pause(300);
  };
  for(const role of ['manufacturer','controller']){
   await nativeTap('[data-signature="'+role+'"]');
   const result=await evaluate(`(function(){const slot=document.querySelector('[data-signature="${role}"]');if(slot.tagName!=='BUTTON')throw Error('Form is read-only');const panel=document.querySelector('.signature-panel'),pad=panel&&panel.querySelector('canvas'),rect=pad?pad.getBoundingClientRect():{width:0,height:0,left:0,right:0};return {visible:!!panel,width:rect.width,height:rect.height,inViewport:rect.left>=visualViewport.offsetLeft&&rect.right<=visualViewport.offsetLeft+visualViewport.width};})()`);
   if(!result.visible||!result.inViewport||result.width<100)throw Error('Signature modal layout failed');
   await pause(200);
   const saved=await evaluate(`(function(){const panel=document.querySelector('.signature-panel');panel.querySelector('[data-signature-command="clear"]').click();const pad=panel.querySelector('canvas'),r=pad.getBoundingClientRect();const e={pointerId:1,clientX:r.left+r.width*.2,clientY:r.top+r.height*.5,preventDefault(){}};const capture=pad.setPointerCapture;pad.setPointerCapture=()=>{};pad.onpointerdown(e);pad.onpointermove({...e,clientX:r.left+r.width*.7,clientY:r.top+r.height*.3});pad.onpointerup(e);pad.setPointerCapture=capture;panel.querySelector('[data-signature-command="save"]').click();const image=document.querySelector('[data-signature="${role}"] img');return !!image&&image.src.startsWith('data:image/png;base64,')&&!document.querySelector('.signature-panel');})()`);
   if(!saved){console.log(await evaluate("JSON.stringify({modal:!!document.querySelector('.signature-panel'),error:document.querySelector('.signature-error')&&document.querySelector('.signature-error').textContent,images:Array.from(document.querySelectorAll('[data-signature] img')).map(i=>({length:i.src.length,complete:i.complete})),html:document.querySelector('.signature-panel')&&document.querySelector('.signature-panel').innerText})"));throw Error('Signature save failed');}await pause(850);console.log('PASS: '+role+' modal, drawing and save');
  }
 }finally{
  if(original){await evaluate(`(function(values){const dialog=document.querySelector('.signature-panel');if(dialog)dialog.querySelector('[data-signature-command="cancel"]').click();window.updateReportSignatures(values);Object.entries(values).forEach(([path,value])=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'signature',path,value})));return true;})(${JSON.stringify(original)})`);await pause(850);console.log('Original signatures restored');}
  ws.close();adb(['forward','--remove','tcp:9231']);
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});


