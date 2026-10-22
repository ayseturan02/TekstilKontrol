// Shared text measurements keep tablet preview, printing and mail geometry consistent.
const upper='ABCDEFGHIJKLMNOPQRSTUVWXYZ',lower='abcdefghijklmnopqrstuvwxyz';
const upperWidths=[667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611];
const lowerWidths=[556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500];
const equivalents={'İ':'I','ı':'i','Ş':'S','ş':'s','Ğ':'G','ğ':'g','Ç':'C','ç':'c','Ö':'O','ö':'o','Ü':'U','ü':'u'};
function characterWidth(character){
  const c=equivalents[character]||character;
  if(/[\u0300-\u036f\u200d\ufe0f]/u.test(c))return 0;
  let units=600,index=upper.indexOf(c);
  if(index>=0)units=upperWidths[index];
  else if((index=lower.indexOf(c))>=0)units=lowerWidths[index];
  else if(/[0-9]/.test(c))units=556;
  else if(c===' ')units=278;
  else if(c==='\t')units=1112;
  else if(/[.,:;!'|]/.test(c))units=278;
  else if(c==='W'||c==='@')units=1015;
  else if(c.codePointAt(0)>0x2e7f)units=1200;
  // Small safety margin accommodates Android Arial-compatible fonts.
  return units*15/1000*1.06+0.15;
}
function wrappedLineCount(value,width){
  const available=Math.max(8,width-6);let lines=0;
  for(const paragraph of String(value??'').replace(/\r\n?/g,'\n').split('\n')){
    lines++;let used=0;
    for(const token of paragraph.match(/\s+|\S+/gu)||[]){
      const chars=Array.from(token),tokenWidth=chars.reduce((sum,c)=>sum+characterWidth(c),0);
      if(!/^\s/.test(token)&&tokenWidth<=available&&used>0&&used+tokenWidth>available){lines++;used=0;}
      for(const c of chars){const size=characterWidth(c);if(used>0&&used+size>available){lines++;used=0;}used+=size;}
    }
  }
  return lines;
}
function flowLayout(base,data){
  const events=new Map();
  for(const field of base.fields){
    const value=field.path.split('.').reduce((obj,key)=>obj?.[key],data);
    if(value===undefined||value===null||String(value)==='')continue;
    const needed=wrappedLineCount(value,field.w)*21+6;
    const extra=Math.max(0,needed-field.h);
    if(extra)events.set(field.y+field.h,Math.max(events.get(field.y+field.h)||0,extra));
  }
  const growth=Array.from(events,([at,extra])=>({at,extra})).sort((a,b)=>a.at-b.at);
  const y=value=>value+growth.reduce((sum,event)=>sum+(event.at<=value?event.extra:0),0);
  return {
    height:y(1430),
    fields:base.fields.map(field=>({...field,y:y(field.y),h:y(field.y+field.h)-y(field.y)})),
    choices:base.choices.map(choice=>({...choice,y:y(choice.y)})),
    texts:base.texts.map(text=>({...text,y:y(text.y)})),
    lines:base.lines.map(line=>({...line,y1:y(line.y1),y2:y(line.y2)})),
  };
}
module.exports={flowLayout,wrappedLineCount};
