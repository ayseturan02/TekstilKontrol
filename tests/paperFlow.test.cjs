const {test}=require('node:test');
const assert=require('node:assert/strict');
const {wrappedLineCount}=require('../shared/paperFlow');
const {layoutForReport,buildPaperDocument,layout}=require('../shared/paperLayout');
const {createInitial,htmlFor,categories}=require('../shared/reportTemplate');
test('explicit line endings and empty lines remain separate',()=>{
 assert.equal(wrappedLineCount('First\n\nThird',300),3);
 assert.equal(wrappedLineCount('First\r\nSecond\rThird',300),3);
 assert.ok(wrappedLineCount('abcdefghij'.repeat(30),40)>50);
});
test('long notes grow both halves of a row and move all following rows and borders down',()=>{
 const d=createInitial(),category=categories[1];d.checks[category].note='Dikiş kontrolü tamamlandı. '.repeat(40);
 const output=layoutForReport(d),find=path=>output.fields.find(f=>f.path===path);
 const original=layout.fields.find(f=>f.path==='checks.'+category+'.note');
 const note=find('checks.'+category+'.note');assert.ok(note.h>original.h);
 assert.equal(find('checks.'+categories[5]+'.note').h,note.h);
 assert.ok(find('checks.'+categories[2]+'.note').y>=note.y+note.h);
 assert.ok(output.height>1430);
 assert.equal(output.lines.find(l=>l.y1===l.y2&&l.y1===867+(note.h-original.h)).y1,867+(note.h-original.h));
});
test('narrow cells, metadata and additional notes grow without changing text or column width',()=>{
 const d=createInitial();d.customer='Çok uzun müşteri adı '.repeat(12);d.notes='Birinci satır\n\nSon satır '+('kesintisizmetin'.repeat(60));d.checks[categories[0]].code='ABCDEFGH'.repeat(20);
 const output=layoutForReport(d);
 for(const path of ['customer','notes','checks.'+categories[0]+'.code']){
  const before=layout.fields.find(f=>f.path===path),after=output.fields.find(f=>f.path===path);
  assert.equal(after.w,before.w);assert.ok(after.h>before.h);
 }
 const html=htmlFor(d);assert.ok(html.includes(d.customer));assert.ok(html.includes(d.notes));
 assert.ok(html.includes('white-space:pre-wrap'));assert.ok(html.includes('word-wrap:break-word'));
});
test('editing and preview use the same calculated field rectangles and multiline controls',()=>{
 const d=createInitial();d.notes='Line one\nLine two\n'+'Long note '.repeat(60);
 const editable=buildPaperDocument(d,{editable:true}),preview=htmlFor(d);
 const field=layoutForReport(d).fields.find(f=>f.path==='notes');const rectangle='left:'+field.x+'px;top:'+field.y+'px;width:'+field.w+'px;height:'+field.h+'px;';
 assert.ok(editable.includes(rectangle));assert.ok(preview.includes(rectangle));assert.ok(editable.includes('wrap="soft"'));assert.ok(!editable.includes('<input class="paper-input"'));
});
