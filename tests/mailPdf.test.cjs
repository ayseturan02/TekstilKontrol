const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const code=require('@babel/core').transformFileSync(require.resolve('../src/services/mail.ts'),{presets:['module:@react-native/babel-preset'],configFile:false,babelrc:false}).code;
function harness({failPdf=false,failEmail=false}={}){
 const calls={pdf:[],email:[],share:[]},module={exports:{}};
 const pdf=Buffer.from('%PDF-1.7\nNative test').toString('base64');
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>{
  if(name==='@react-native-async-storage/async-storage')return {getItem:async()=>null,setItem:async()=>{}};
  if(name==='react-native-html-to-pdf')return {generatePDF:async options=>{calls.pdf.push(options);if(failPdf)throw Error('PDF failed');return {base64:pdf};}};
  if(name==='react-native-share')return {Social:{EMAIL:'email'},shareSingle:async options=>{calls.email.push(options);if(failEmail)throw Error('No mail app');},open:async options=>{calls.share.push(options);}};
  if(name==='../report')return {htmlFor:report=>'<html>'+report.customer+'</html>'};
  if(name==='../../shared/recipients')return require('../shared/recipients');
  return require(name);
 }});return {...module.exports,calls,pdf};
}
test('phone mail draft attaches an A4 PDF and keeps photos and videos',async()=>{
 const app=harness();await app.openMailDraft({customer:'Customer',media:[{uri:'file:///photo.jpg'},{uri:'content://video'},{uri:'https://invalid'}]},['one@example.com','two@example.com']);
 assert.equal(app.calls.pdf[0].width,595.28);assert.equal(app.calls.pdf[0].height,841.89);assert.ok(app.calls.pdf[0].html.includes('Customer'));
 const options=app.calls.email[0];assert.equal(options.email,'one@example.com,two@example.com');assert.equal(options.filenames[0],'Kontrol-Raporu.pdf');assert.equal(options.urls[0],'data:application/pdf;base64,'+app.pdf);assert.deepEqual(Array.from(options.urls.slice(1)),['file:///photo.jpg','content://video']);assert.ok(!options.urls.some(url=>url.startsWith('data:text/html')));
});
test('native PDF failure never opens an incomplete mail draft',async()=>{
 const app=harness({failPdf:true});await assert.rejects(app.openMailDraft({customer:'Customer'},['one@example.com']),/PDF failed/);assert.equal(app.calls.email.length,0);assert.equal(app.calls.share.length,0);
});
test('mail app fallback still carries the same PDF',async()=>{
 const app=harness({failEmail:true});await app.openMailDraft({customer:'Customer'},['one@example.com']);assert.equal(app.calls.share[0].urls[0],app.calls.email[0].urls[0]);assert.equal(app.calls.pdf.length,1);
});
