import React from 'react';
import {Alert} from 'react-native';
import RNPrint from 'react-native-print';
import PaperReport from '../components/PaperReport';
import {useApp} from '../context/AppContext';
import {htmlFor} from '../report';
export default function PreviewScreen(){
  const {d,setPath,busy,send}=useApp();
  const action=async(name:string,detail:any)=>{
    if(name==='print')try{await RNPrint.print({html:htmlFor(d)});}catch(e:any){Alert.alert('Önizleme açılamadı',e.message||'Yazdırma servisini kontrol edin.');}
    if(name==='send'&&!busy)Alert.alert('Gönderimi onayla','Kontrol formu ve ekleri '+detail.recipient+' adresine gönderilsin mi?',[{text:'Vazgeç',style:'cancel'},{text:'Gönder',onPress:()=>send(String(detail.recipient||''))}]);
  };
  return <PaperReport data={d} readOnly showSend onChange={setPath} onAction={action} />;
}
