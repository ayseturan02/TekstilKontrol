import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Platform, View} from 'react-native';
import DateTimePicker, {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {WebView, WebViewMessageEvent} from 'react-native-webview';
import {buildPaperDocument, layout, layoutForReport, valueAt} from '../../shared/paperLayout';
export type PaperField = {path:string;label:string;multiline?:boolean;numeric?:boolean};
export const paperFields:PaperField[] = layout.fields;
export const fieldValue = (data:any,path:string):string => String(valueAt(data,path));
const textPaths=new Set(layout.fields.map(field=>field.path));
const choicePaths=new Set(layout.choices.map(choice=>choice.path));
type Props={data:any;readOnly?:boolean;showSend?:boolean;onChange?:(path:string,value:any)=>void;onAction?:(action:string,detail:any)=>void};
export default function PaperReport({data,readOnly=false,showSend=false,onChange,onAction}:Props){
  const web=useRef<WebView<{}>>(null);
  const initialData=useRef(data);
  const [showDate,setShowDate]=useState(false);
  const dateValue=()=>{
    const parts=String(data.date||'').match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    return parts?new Date(Number(parts[3]),Number(parts[2])-1,Number(parts[1]),12):new Date();
  };
  const selectDate=(event:{type:string},date?:Date)=>{
    setShowDate(false);
    if(event.type!=='set'||!date)return;
    const value=String(date.getDate()).padStart(2,'0')+'.'+String(date.getMonth()+1).padStart(2,'0')+'.'+date.getFullYear();
    onChange?.('date',value);
  };
  const pickDate=()=>{
    if(readOnly)return;
    if(Platform.OS==='android')DateTimePickerAndroid.open({value:dateValue(),mode:'date',display:'calendar',onChange:selectDate});
    else setShowDate(true);
  };
  // A stable document preserves the cursor, keyboard and zoom on every keystroke.
  const source=useMemo(()=>({html:buildPaperDocument(initialData.current,{editable:!readOnly,showAttachments:true,showSend}),baseUrl:'file:///'}),[readOnly,showSend]);
  const syncMedia=()=>web.current?.injectJavaScript('window.updateReportMedia && window.updateReportMedia('+JSON.stringify(data.media||[])+');true;');
  useEffect(()=>{syncMedia();},[data.media]);
  const syncDate=()=>web.current?.injectJavaScript('window.updateReportDate && window.updateReportDate('+JSON.stringify(data.date||'')+');true;');
  useEffect(()=>{syncDate();},[data.date]);
  const syncLayout=()=>web.current?.injectJavaScript('window.updatePaperLayout && window.updatePaperLayout('+JSON.stringify(layoutForReport(data))+');true;');
  useEffect(()=>{syncLayout();},[data]);
  const message=(event:WebViewMessageEvent)=>{
    let payload:any;try{payload=JSON.parse(event.nativeEvent.data);}catch{return;}
    if(payload.type==='ready'){syncMedia();syncLayout();syncDate();return;}
    if(payload.type==='field'&&typeof payload.value==='string'&&payload.value.length<=4000){
      if((!readOnly&&textPaths.has(payload.path))||(showSend&&payload.path==='recipient'))onChange?.(payload.path,payload.value);
    }
    if(payload.type==='choice'&&!readOnly&&choicePaths.has(payload.path)){
      const choices=layout.choices.filter(choice=>choice.path===payload.path);
      if(Array.isArray(payload.value)&&choices[0].multiple&&payload.value.every((v:any)=>choices.some(c=>c.label===v)))onChange?.(payload.path,payload.value);
      else if(typeof payload.value==='string'&&(payload.value===''||choices.some(c=>c.label===payload.value)))onChange?.(payload.path,payload.value);
    }
    if(payload.type==='action'&&payload.action==='pick-date'){pickDate();return;}
    if(payload.type==='action')onAction?.(payload.action,payload);
  };
  return <View style={{flex:1}}><WebView<{}> ref={web} source={source} originWhitelist={['*']}
    style={{flex:1,backgroundColor:'#eff2f6'}} onMessage={message} javaScriptEnabled domStorageEnabled={false}
    onShouldStartLoadWithRequest={request=>request.url==='about:blank'||request.url==='file:///'}
    scalesPageToFit={false} allowFileAccess allowFileAccessFromFileURLs keyboardDisplayRequiresUserAction={false} hideKeyboardAccessoryView={false}
    automaticallyAdjustContentInsets={false} setSupportMultipleWindows={false} />{showDate&&!readOnly&&<DateTimePicker value={dateValue()} mode="date" display="inline" locale="tr-TR" onChange={selectDate} />}</View>;
}
