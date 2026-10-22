const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const browserScript=require('../shared/paperScript');
function setup(editable=true){
 class Element {
  constructor(tag='div'){this.tagName=tag;this.style={};this.children=[];this.dataset={};this.attributes={};this._text='';}
  set textContent(v){this._text=v;this.children=[];} get textContent(){return this._text;}
  appendChild(n){this.children.push(n);return n;} setAttribute(k,v){this.attributes[k]=v;}
 }
 const nodes=Object.fromEntries(['paper','paper-frame','zoom-back','media-list','media-count'].map(id=>[id,new Element()]));
 const messages=[];
 const document={getElementById:id=>nodes[id],documentElement:{clientWidth:400},querySelectorAll:()=>[],querySelector:()=>null,createElement:t=>new Element(t),addEventListener(){},body:new Element()};
 const window={addEventListener(){},ReactNativeWebView:{postMessage:v=>messages.push(JSON.parse(v))}};
 vm.runInNewContext('('+browserScript+')('+JSON.stringify({height:1430,data:{media:[]},editable})+')',{window,document});
 return {nodes,window,messages};
}
test('media gallery shows ten thumbnails plus +30, expands all forty and removes the correct attachment',()=>{
 const {nodes,window,messages}=setup();
 const media=Array.from({length:40},(_,i)=>({uri:'file:///cache/'+i+'.jpg',fileName:'private-name-'+i+'.jpg',type:i===0?'video/mp4':'image/jpeg'}));
 window.updateReportMedia(media);
 const list=nodes['media-list'];assert.equal(list.children.length,11);assert.equal(list.children[10].children[0].textContent,'+30');
 assert.equal(list.children[0].children[0].children[0].tagName,'video');assert.equal(list.children[1].children[0].children[0].src,media[1].uri);
 list.children[10].children[0].onclick();assert.equal(list.children.length,41);
 list.children[39].children[1].onclick();assert.deepEqual(messages.at(-1),{type:'action',action:'remove-media',index:39});
 window.updateReportMedia(media.slice(0,39));assert.equal(nodes['media-count'].textContent,'39 / 40 ek');
});
test('preview hides removal controls and refuses remote media URLs',()=>{
 const {nodes,window}=setup(false);window.updateReportMedia([{uri:'https://untrusted.example/image.jpg',fileName:'secret.jpg',type:'image/jpeg'}]);
 const tile=nodes['media-list'].children[0];assert.equal(tile.children.length,1);assert.equal(tile.children[0].children[0].src,'');
});
