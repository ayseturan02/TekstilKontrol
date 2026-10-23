import React, {useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import RNPrint from 'react-native-print';
import PaperReport from '../components/PaperReport';
import {useApp} from '../context/AppContext';
import {htmlFor} from '../report';
import {forgetEmail, loadSavedEmails, openMailDraft, parseRecipients, rememberEmails} from '../services/mail';
export default function PreviewScreen(){
  const {d,setPath}=useApp();
  const [recipients,setRecipients]=useState<string[]>([]);
  const opening=useRef(false);
  useEffect(()=>{
    let active=true;
    loadSavedEmails().then(list=>{if(active)setRecipients(list);}).catch(()=>{});
    return ()=>{active=false;};
  },[]);
  const action=async(name:string,detail:any)=>{
    if(name==='print')try{await RNPrint.print({html:htmlFor(d)});}catch(e:any){Alert.alert('Önizleme açılamadı',e.message||'Yazdırma servisini kontrol edin.');}
    if(name==='forget-recipient'){
      try{setRecipients(await forgetEmail(String(detail.email||'')));}catch{Alert.alert('Silinemedi','Adres telefondan silinemedi, tekrar deneyin.');}
      return;
    }
    if(name==='send'){
      if(opening.current)return;
      const list=parseRecipients(detail.recipient);
      if(!list.length){Alert.alert('Alıcı gerekli','En az bir geçerli e-posta adresi seçin.');return;}
      opening.current=true;
      try{
        // Addresses are remembered first so they stay saved even if the mail app is cancelled.
        try{setRecipients(await rememberEmails(list));}catch{}
        await openMailDraft({...d,recipient:list.join(', ')},list);
      }catch(e:any){Alert.alert('Mail uygulaması açılamadı',e?.message||'Telefonda bir e-posta uygulaması kurulu olduğundan emin olun.');}
      finally{opening.current=false;}
    }
  };
  return <PaperReport data={d} readOnly showSend recipients={recipients} onChange={setPath} onAction={action} />;
}
