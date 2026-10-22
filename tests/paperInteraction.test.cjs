const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const React=require('react');
const Renderer=require('react-test-renderer');
const paper=require('../shared/paperLayout');
const template=require('../shared/reportTemplate');
global.IS_REACT_ACT_ENVIRONMENT=true;
const compiled=require('@babel/core').transformFileSync(require.resolve('../src/components/PaperReport.tsx'),{presets:['module:@react-native/babel-preset'],configFile:false,babelrc:false}).code;
const moduleObject={exports:{}};
let datePickerOptions;
const WebView=React.forwardRef((props,ref)=>{React.useImperativeHandle(ref,()=>({injectJavaScript(){}}));return React.createElement('WebView',props);});
vm.runInNewContext(compiled,{module:moduleObject,exports:moduleObject.exports,require:name=>{
 if(name==='react')return React;
 if(name==='react-native')return {View:'View',Platform:{OS:'android'}};
 if(name==='@react-native-community/datetimepicker')return {__esModule:true,default:'DateTimePicker',DateTimePickerAndroid:{open:options=>{datePickerOptions=options;}}};
 if(name==='react-native-webview')return {WebView};
 if(name==='../../shared/paperLayout')return paper;
 return require(name);
}});
const PaperReport=moduleObject.exports.default;
test('form uses inline fields, no editing modal, and keeps the document stable while typing',async()=>{
 const d=template.createInitial();let root,change;
 const onChange=(path,value)=>change={path,value};
 await Renderer.act(async()=>{root=Renderer.create(React.createElement(PaperReport,{data:d,onChange}));});
 assert.equal(root.root.findByType('WebView').props.scalesPageToFit,false);
 const source=root.root.findByType('WebView').props.source;
 assert.ok(source.html.includes('data-field="customer"'));assert.ok(source.html.includes('Math.max(fit,1.2)'));assert.ok(!source.html.includes('<dialog'));
 await Renderer.act(async()=>root.root.findByType('WebView').props.onMessage({nativeEvent:{data:JSON.stringify({type:'field',path:'customer',value:'Typed customer'})}}));
 assert.deepEqual(change,{path:'customer',value:'Typed customer'});
 await Renderer.act(async()=>root.update(React.createElement(PaperReport,{data:{...d,customer:'Typed customer'},onChange})));
 assert.equal(root.root.findByType('WebView').props.source,source);
 await Renderer.act(async()=>root.unmount());
});
test('bridge rejects arbitrary paths and preview rejects form edits',async()=>{
 let root,change;const onChange=(path,value)=>change={path,value};
 await Renderer.act(async()=>{root=Renderer.create(React.createElement(PaperReport,{data:template.createInitial(),readOnly:true,showSend:true,onChange}));});
 const props=root.root.findByType('WebView').props;
 assert.ok(!props.source.html.includes('class="paper-input"'));
 for(const path of ['customer','__proto__.polluted'])await Renderer.act(async()=>props.onMessage({nativeEvent:{data:JSON.stringify({type:'field',path,value:'No'})}}));
 assert.equal(change,undefined);
 await Renderer.act(async()=>props.onMessage({nativeEvent:{data:JSON.stringify({type:'field',path:'recipient',value:'test@example.com'})}}));
 assert.deepEqual(change,{path:'recipient',value:'test@example.com'});
 await Renderer.act(async()=>root.unmount());
});

test('browser script is literal, parses independently and avoids modern syntax unsupported by old Android WebView',()=>{
 const html=paper.buildPaperDocument(template.createInitial(),{editable:true});
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
 assert.ok(scripts.length>0);
 for(const script of scripts){new vm.Script(script);assert.ok(!script.includes('[bytecode]'));assert.ok(!script.includes('?.'));}
});

test('date field opens a calendar, selection updates date and preview cannot open it',async()=>{
 let root,change;datePickerOptions=undefined;
 await Renderer.act(async()=>{root=Renderer.create(React.createElement(PaperReport,{data:{...template.createInitial(),date:'22.10.2026'},onChange:(path,value)=>{change={path,value};}}));});
 let props=root.root.findByType('WebView').props;
 assert.ok(props.source.html.includes('data-date-picker="true"'));
 assert.ok(!props.source.html.includes('data-field="date"'));
 await Renderer.act(async()=>props.onMessage({nativeEvent:{data:JSON.stringify({type:'action',action:'pick-date'})}}));
 assert.equal(datePickerOptions.display,'calendar');assert.equal(datePickerOptions.value.getFullYear(),2026);
 await Renderer.act(async()=>datePickerOptions.onChange({type:'set'},new Date(2026,10,3)));
 assert.deepEqual(change,{path:'date',value:'03.11.2026'});
 change=undefined;await Renderer.act(async()=>datePickerOptions.onChange({type:'dismissed'}));assert.equal(change,undefined);
 await Renderer.act(async()=>root.update(React.createElement(PaperReport,{data:template.createInitial(),readOnly:true})));
 datePickerOptions=undefined;props=root.root.findByType('WebView').props;
 await Renderer.act(async()=>props.onMessage({nativeEvent:{data:JSON.stringify({type:'action',action:'pick-date'})}}));
 assert.equal(datePickerOptions,undefined);
 await Renderer.act(async()=>root.unmount());
});
