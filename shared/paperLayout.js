const {flowLayout}=require('./paperFlow');
const browserScript=require('./paperScript');
const {normalizeReport,reasons,scopes,statuses,results,agreements,categories,quantityRows}=require('./reportTemplate');
const W=1000,H=1430,INK='#145579';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const valueAt=(data,path)=>path.split('.').reduce((v,k)=>v?.[k],data)??'';
function definition(){
  const fields=[],choices=[],texts=[],lines=[];
  const field=(path,label,x,y,w,h=26,extra={})=>fields.push({path,label,x,y,w,h,...extra});
  const text=(value,x,y,size=12,extra={})=>texts.push({value,x,y,size,...extra});
  const line=(x1,y1,x2,y2,width=1)=>lines.push({x1,y1,x2,y2,width});
  const option=(path,code,label,x,y,w=120,multiple=false)=>choices.push({path,code,label,x,y,w,multiple});
  const group=(path,items,x,y,widths)=>{let left=x;items.forEach(([code,label],i)=>{option(path,code,label,left,y,widths[i]);left+=widths[i];});};
  // Measurements follow the printed sheet, without any handwriting.
  text('İNTERNET',115,26,24,{weight:900,italic:true});text('TEKSTİL',115,50,24,{weight:900,italic:true});text('SANAYİ VE TİCARET A.Ş.',115,66,10,{weight:800});
  text('KONTROL RAPORU',365,65,23,{weight:900,spacing:1});
  ['Organize Sanayi Bölgesi','Adıyaman/TÜRKİYE','Tel   :+90 416 227 24 01 (10HAT)','Faks :+90 416 227 28 67'].forEach((v,i)=>text(v,724,17+i*13,11,{weight:800}));
  line(12,83,988,83,4);line(12,90,988,90,1.4);
  text('Kontrol Tarihi:',488,111,13,{weight:800});field('date','Kontrol tarihi',611,93,137,25);line(611,118,748,118);
  text('Rapor - No:',754,111,13,{weight:800});field('reportNo','Rapor no',851,93,132,25);line(851,117,983,117);
  text('Sipariş Ofisi:',35,160,13,{weight:800});field('office','Sipariş ofisi',149,138,215,28);line(149,165,364,165);
  text('Atölye',520,164,13,{weight:800});field('workshop','Atölye',410,172,286,62,{multiline:true});line(410,199,696,199);line(410,232,696,232);
  // Outer form and the two-row reason/scope strip.
  [12,988].forEach(x=>line(x,90,x,1285,1.3));
  [264,283,315,494,526,558,590,617,742,867,992,1117,1240,1285].forEach(y=>line(12,y,988,y,1.1));
  [350,625,698,842].forEach(x=>line(x,264,x,315));
  text('Kontrol Sebebi',125,278,11,{weight:800});text('Kontrol Kapsamı',430,278,11,{weight:800});text('AQL',646,278,11,{weight:800});
  group('reason',reasons,24,287,[109,109,108]);group('scope',scopes,357,287,[83,92,91]);field('aql','AQL',628,285,67,28);
  field('controlExtra1','Ek kontrol alanı 1',701,285,138,28);field('controlExtra2','Ek kontrol alanı 2',845,285,140,28);
  // Customer details at left; the original compact production grid at right.
  line(380,315,380,494);
  [['Müşteri:','customer',333],['Dept. No:','department',362],['Artikel-No./Tanımı:','article',390]].forEach(([label,path,y])=>{text(label,24,y,12,{weight:800});const x=path==='article'?157:104;field(path,label,x,y-18,373-x,28);line(x,y+5,372,y+5);});
  text('Sipariş No,:(Order No)',24,469,12,{weight:800});field('order','Sipariş no',183,449,190,28);line(183,476,372,476);
  text('Üretim Aşaması',386,333,12,{weight:800});line(380,341,988,341);field('stage','Üretim aşaması',523,343,390,29);
  [372,400,428,445,464].forEach(y=>line(380,y,988,y));
  [523,601,679,757,835,913].forEach(x=>line(x,372,x,494));
  line(523,341,523,372);line(913,341,913,494);
  text('Toplam',925,360,11,{weight:800});text('Renk',386,390,12,{weight:800});text('Renk',918,383,10,{weight:800});text('Adedi',918,395,10,{weight:800});
  for(let i=0;i<5;i++)field('sizes.'+i,'Renk / beden '+(i+1),525+i*78,374,74,24);
  field('colorCount','Renk adedi',915,401,70,25,{numeric:true});
  const rowYs=[400,428,445,464],rowHeights=[28,17,19,30];
  const rowLabels=['Sevk Adedi N','Kontrol Adedi (n)','Kabul Edilen Hata (c)','Hatalı Mal Birimi (i)'];
  quantityRows.forEach(([key],row)=>{text(rowLabels[row],386,rowYs[row]+(row===0?19:row===3?20:12),row===2?9:11,{weight:800});for(let i=0;i<5;i++)field('quantities.'+key+'.'+i,rowLabels[row]+' / sütun '+(i+1),525+i*78,rowYs[row]+1,74,rowHeights[row]-2,{numeric:true});field(key,rowLabels[row]+' toplam',915,rowYs[row]+1,70,rowHeights[row]-2,{numeric:true});});
  [['documents','Kontrol Evrakları:',[['O','Tamam'],['F','Eksik']],494,311,[128,130]],['body','Beden seti raporunda belirtilmiş hatalar:',[['O','Giderilmiştir'],['F','Giderilmemiştir']],526,311,[128,158]],['laboratory','Laboratuvar Kontrolü',[['O','O.K.'],['N','Ön görülmedi'],['V','Ön görüldü']],558,205,[104,129,132]]].forEach(([path,label,items,y,x,widths])=>{text(label,28,y+21,path==='body'?11:12,{weight:800});group(path,items,x,y+3,widths);const end=x+widths.reduce((a,b)=>a+b,0);field(path+'Note',label+' açıklaması',end+5,y+3,982-end-5,26);line(end+5,y+27,983,y+27);});
  // The unequal category/note halves match the source paper.
  const bounds=[[12,150,194,238,500],[500,638,682,726,988]];
  bounds.forEach((b,half)=>{[b[1],b[2],b[3],b[4]].forEach(x=>line(x,617,x,1117));text(half?'PFÜKLASSEN':'Kontrol Kateg.',b[0]+12,608,11,{weight:800});text('Hata',b[1]+4,600,10,{weight:800});text('Kateg.',b[1]+2,611,9,{weight:800});text('Hata',b[2]+3,600,10,{weight:800});text('Adedi',b[2]+2,611,9,{weight:800});text('HATALAR/UYARILAR',b[3]+25,608,12,{weight:800});});
  for(let row=0;row<4;row++)for(let half=0;half<2;half++){
    const c=categories[row+half*4],b=bounds[half],y=617+125*row;
    text(c,b[0]+12,y+19,14,{weight:800});
    statuses.forEach(([code,label],i)=>option('checks.'+c+'.status',code,label,b[0]+14,y+27+i*29,b[1]-b[0]-18));
    field('checks.'+c+'.code',c+' — hata kategorisi',b[1]+2,y+3,b[2]-b[1]-4,119,{multiline:true});field('checks.'+c+'.count',c+' — hata adedi',b[2]+2,y+3,b[3]-b[2]-4,119,{numeric:true});field('checks.'+c+'.note',c+' — hatalar / uyarılar',b[3]+3,y+3,b[4]-b[3]-6,119,{multiline:true});
  }
  line(190,1117,190,1240);line(520,1117,520,1240);
  text('Kontrol Neticesi',30,1138,14,{weight:800});results.forEach(([code,label],i)=>option('result',code,label,30,1148+i*28,155));
  text('Ek Anlaşmalar',290,1138,14,{weight:800});agreements.forEach(([code,label],i)=>option('agreement',code,label,194,1148+i*28,322,true));
  text('Ek Açıklamalar/Uyarılar:',525,1138,14,{weight:800});field('notes','Ek açıklamalar / uyarılar',525,1146,455,89,{multiline:true});
  line(190,1240,190,1285);text('ÖNEMLİ',44,1269,23,{weight:900});
  text('Malın kesin teslim alımı müşterinin mahfuziyet çerçevesinde verdiği onayla gerçekleşir.',197,1256,11,{weight:700});text('İş bu kontrol raporu, imalatçıyı geçerli olan sözleşme yükümlülüklerinden muaf kılmaz.',197,1274,11,{weight:700});
  line(12,1300,988,1300,1.1);
  [['manufacturer','İmalatçı',20],['codeNo','Kod No',280],['controller','Kontrolcü',530],['qcManager','QC-MANAGER',780]].forEach(([path,label,x])=>{text(label,x+35,1325,15,{weight:800});field(path,label,x+4,1333,220,['manufacturer','controller'].includes(path)?28:70,{multiline:true});});
  return {fields,choices,texts,lines};
}
const layout=definition();
function layoutForReport(data){return flowLayout(layout,normalizeReport(data));}
function paperSvg(geometry=layout){
  const height=geometry.height||H;
  const logo='<g transform="translate(17,3)"><circle cx="45" cy="38" r="34" fill="'+INK+'"/><path d="M12 49 L28 47 L39 29 Q43 24 48 30 L58 41 L68 24 L83 24 L83 34 L74 34 L61 55 Q57 60 51 54 L42 43 L33 57 L11 59 Z" fill="white"/><circle cx="43" cy="19" r="5" fill="white"/></g>';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+height+'" aria-label="Kontrol raporu kağıt şablonu" class="ruling"><rect width="1000" height="'+height+'" fill="white"/>'+logo+geometry.lines.map((l,i)=>'<line data-line-index="'+i+'" x1="'+l.x1+'" y1="'+l.y1+'" x2="'+l.x2+'" y2="'+l.y2+'" stroke="'+INK+'" stroke-width="'+l.width+'"/>').join('')+geometry.texts.map((t,i)=>'<text data-text-index="'+i+'" x="'+t.x+'" y="'+t.y+'" fill="'+INK+'" font-family="Arial, sans-serif" font-size="'+t.size+'" font-weight="'+(t.weight||600)+'"'+(t.italic?' font-style="italic"':'')+(t.spacing?' letter-spacing="'+t.spacing+'"':'')+'>'+esc(t.value)+'</text>').join('')+'</svg>';
}
function position(f){return 'left:'+f.x+'px;top:'+f.y+'px;width:'+f.w+'px;height:'+f.h+'px;';}
function buildPaperDocument(input,options={}){
  const data=normalizeReport(input),editable=!!options.editable,interactive=editable||!!options.showSend;
  const geometry=layoutForReport(data);
  const fields=geometry.fields.map(f=>{
    const value=esc(valueAt(data,f.path));
    if(!editable)return '<div class="filled" data-report-field="'+esc(f.path)+'" style="'+position(f)+'">'+value+'</div>';
    if(f.path==='date')return '<button type="button" class="paper-input" data-report-field="date" data-date-picker="true" aria-label="'+esc(f.label)+'" style="text-align:left;cursor:pointer;'+position(f)+'">'+value+'</button>';
    const attrs=' class="paper-input" data-report-field="'+esc(f.path)+'" data-field="'+esc(f.path)+'" aria-label="'+esc(f.label)+'" style="'+position(f)+'" autocomplete="off" spellcheck="false" maxlength="4000"'+(f.numeric?' inputmode="decimal"':'');
    return '<textarea'+attrs+' wrap="soft">'+value+'</textarea>';
  }).join('');
  const signatures=['manufacturer','controller'].map(role=>{
    const f=geometry.fields.find(field=>field.path===role),value=data[role+'Signature'];
    const style=position({x:f.x,y:f.y+f.h+8,w:f.w,h:48});
    const image=value?'<img alt="'+esc(f.label)+' imzası" src="'+esc(value)+'">':'';
    return editable?'<button type="button" class="signature-slot" data-signature="'+role+'" aria-label="'+esc(f.label)+' imzasını aç" style="'+style+'">'+(image||'İmza ekle')+'</button>':'<div class="signature-slot signature-print" data-signature="'+role+'" style="'+style+'">'+image+'</div>';
  }).join('');
  const choices=geometry.choices.map((c,i)=>{
    const value=valueAt(data,c.path),selected=c.multiple?Array.isArray(value)&&value.includes(c.label):value===c.label;
    const inner='<span class="box">'+(selected?'&#10003;':esc(c.code))+'</span><span class="choice-label">'+esc(c.label)+'</span>';
    return editable?'<button type="button" role="'+(c.multiple?'checkbox':'radio')+'" aria-label="'+esc(c.label)+'" aria-checked="'+selected+'" class="choice" data-choice-index="'+i+'" data-choice="true" data-path="'+esc(c.path)+'" data-value="'+esc(c.label)+'" data-code="'+esc(c.code)+'" data-multi="'+c.multiple+'" style="'+position({...c,h:26})+'">'+inner+'</button>':'<div class="choice" aria-checked="'+selected+'" data-choice-index="'+i+'" style="'+position({...c,h:26})+'">'+inner+'</div>';
  }).join('');
  const css='@page{size:A4 portrait;margin:7mm}*{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial,sans-serif;color:'+INK+';background:#eff2f6}body{padding:10px;overflow-x:auto;-webkit-text-size-adjust:100%}.paper-frame{position:relative;margin:0 auto;overflow:hidden}.paper{position:absolute;left:0;top:0;width:1000px;height:'+geometry.height+'px;transform-origin:top left;background:white;box-shadow:0 1px 5px #2030501a}.ruling{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.paper-input,.filled{position:absolute;border:0;border-radius:0;background:transparent;margin:0;padding:2px 3px;font:15px/1.4 Arial,sans-serif;color:#182d43;white-space:pre-wrap;overflow-wrap:break-word;word-wrap:break-word;word-break:break-word;tab-size:4;resize:none;outline:none;overflow:auto}.paper-input:focus{background:#e9f2ff80;box-shadow:inset 0 -2px #2474a2}.choice{position:absolute;display:flex;align-items:center;gap:5px;border:0;background:transparent;padding:1px 0;margin:0;text-align:left;color:'+INK+';font:700 12px Arial,sans-serif;cursor:pointer}.box{width:23px;height:23px;flex-shrink:0;border:1.5px solid '+INK+';display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800}.choice[aria-checked="true"] .box{position:relative;color:transparent;border:2px solid #071b30;background:#eaf1f8}.choice[aria-checked="true"] .box::after{content:"";position:absolute;width:8px;height:15px;border:solid #071b30;border-width:0 4px 4px 0;transform:translateY(-2px) rotate(45deg)}.choice-label{font-size:inherit;line-height:1.15;margin-left:5px}.choice[data-path="agreement"]{font-size:10px}.zoom-back{position:fixed;right:14px;top:10px;z-index:10;background:#174f74;color:white;border:0;border-radius:24px;padding:12px 20px;font-size:15px;box-shadow:0 3px 14px #20305033}.zoom-back[hidden]{display:none}.extras{max-width:820px;margin:20px auto;padding:22px;background:white;border:1px solid #d7e0eb;border-radius:14px}.extras h2{font-size:18px;margin:0 0 18px}.actions{display:flex;gap:10px;flex-wrap:wrap}.extras button{font-size:15px;min-height:46px;padding:10px 16px;border:1px solid #c7d6e5;background:#f7faff;color:#195778;border-radius:9px}.extras .primary{background:#315be8;color:white;border-color:#315be8}.media-file{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e5ebf2;padding:10px 0;gap:12px;font-size:14px}#media-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:10px}.media-tile{position:relative;aspect-ratio:1;min-width:0}.extras .media-open,.extras .media-more{width:100%;height:100%;min-height:72px;padding:0;overflow:hidden;background:#e8eef5;border:0;border-radius:12px}.media-tile img,.media-tile video{display:block;width:100%;height:100%;object-fit:cover;pointer-events:none}.extras .media-remove{position:absolute;right:-5px;top:-5px;min-height:28px;width:28px;padding:0;border-radius:50%;background:#182d43;color:white;border:2px solid white;font-size:21px;line-height:24px;z-index:2}.media-play{position:absolute;left:8px;bottom:8px;background:#182d43b0;color:white;border-radius:20px;padding:3px 7px;pointer-events:none}.extras .media-more{font-size:24px;font-weight:700;color:#195778}.media-viewer{position:fixed;inset:0;background:#07111ff2;z-index:100;display:flex;align-items:center;justify-content:center;padding:60px 12px}.media-viewer img,.media-viewer video{max-width:100%;max-height:100%;object-fit:contain}.media-viewer button{position:absolute;top:12px;right:12px;background:white;border:0;border-radius:24px;padding:12px;font-size:17px}.media-viewer span{position:absolute;top:24px;left:20px;color:white}.extras .media-collapse{grid-column:1/-1}.date-calendar{position:fixed;z-index:110;background:white;border:1px solid #c7d6e5;border-radius:12px;box-shadow:0 6px 24px #182d4340;padding:12px;color:#182d43}.calendar-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.date-calendar button{border:0;background:transparent;color:#182d43;font:16px Arial,sans-serif;min-height:36px;border-radius:8px;cursor:pointer}.calendar-header button{width:36px;font-size:26px}.calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center}.calendar-grid span{font-size:12px;padding:6px 0;color:#75889b}.calendar-grid .selected-day{background:#174f74;color:white;font-weight:bold}.date-calendar .calendar-cancel{display:block;margin:8px 0 0 auto;padding:0 12px;color:#174f74}.info{font-size:12px;color:#75889b;margin:12px 0}.recipient{display:block;width:100%;min-height:56px;margin:12px 0 18px;padding:14px;border:1px solid #cbd8e5;border-radius:9px;font-size:18px;color:#182d43} @media print{html,body{background:white;padding:0}.paper-frame{width:196mm!important;height:'+(geometry.height*0.74078/3.779527559).toFixed(2)+'mm!important;margin:0}.paper{transform:scale(.74078)!important;box-shadow:none}.zoom-back,.extras{display:none!important}.filled{overflow:visible}}';
  const signatureCss='.signature-slot{position:absolute;background:white;border:1px dashed #9ab1c1;border-radius:6px;color:#145579;font:14px Arial;cursor:pointer;padding:3px}.signature-slot img{width:100%;height:100%;object-fit:contain}.signature-print{border:0}.signature-overlay{position:fixed;top:0;right:0;bottom:0;left:0;z-index:200;background:#182d4370;display:flex;align-items:center;justify-content:center;padding:16px;touch-action:none}.signature-panel{width:100%;max-width:720px;max-height:100%;overflow:auto;background:white;border-radius:16px;padding:20px;color:#182d43}.signature-panel h2{margin:0 0 8px;font-size:21px}.signature-panel p{font-size:14px}.signature-pad{display:block;width:100%;height:35vh;min-height:130px;max-height:300px;background:white;border:1px solid #cbd8e5;border-radius:8px;touch-action:none}.signature-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:16px}.signature-actions button{min-height:44px;padding:10px 16px;border:1px solid #cbd8e5;border-radius:8px;background:white;font-size:15px;color:#182d43}.signature-actions .signature-save{background:#315be8;border-color:#315be8;color:white}.signature-error{color:#b42338;min-height:20px}@media print{.signature-slot{border:0}.signature-overlay{display:none!important}}';
  let extras='';
  if(options.showAttachments)extras='<section class="extras"><h2>Fotoğraf ve video ekleri</h2>'+(editable?'<div class="actions"><button data-action="photo-camera">Fotoğraf çek</button><button data-action="photo-library">Fotoğraf seç</button><button data-action="video-camera">Video çek</button><button data-action="video-library">Video seç</button></div>':'')+'<div class="info"><span id="media-count">'+data.media.length+' / 40 ek</span> · Dosya başına en fazla 25 MB</div><div id="media-list"></div></section>';
  if(options.showSend)extras+='<section class="extras"><h2>Önizleme ve gönderim</h2><button data-action="print">A4 dikey önizle / yazdır</button><label for="recipient"><p>E-posta alıcıları</p></label><input id="recipient" class="recipient" data-field="recipient" type="email" multiple aria-label="E-posta alıcıları" value="'+esc(data.recipient)+'" placeholder="E-posta adreslerini virgülle ayırın"><button class="primary" data-action="send">Formu ve ekleri e-posta ile gönder</button></section>';
  const config=JSON.stringify({data,editable,height:geometry.height}).replace(/</g,'\u003c');
  const staticScale='<script>(function(){var f=document.getElementById("paper-frame"),p=document.getElementById("paper");function fit(){var k=Math.min(1,(document.documentElement.clientWidth-20)/1000);f.style.width=(1000*k)+"px";f.style.height=('+geometry.height+'*k)+"px";p.style.transform="scale("+k+")";}fit();addEventListener("resize",fit);})();</script>';
  return '<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5"><title>Kontrol Raporu</title><style>'+css+signatureCss+'</style></head><body>'+(interactive?'<button id="zoom-back" class="zoom-back" hidden type="button">Kağıdın tamamı ↙</button>':'')+'<main id="paper-frame" class="paper-frame" style="width:1000px;height:'+geometry.height+'px"><div id="paper" class="paper">'+paperSvg(geometry)+fields+choices+signatures+'</div></main>'+extras+(interactive?'<script>('+browserScript+')('+config+');</script>':staticScale)+'</body></html>';
}
module.exports={buildPaperDocument,layout,layoutForReport,paperSvg,valueAt};
