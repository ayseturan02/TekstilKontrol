import React, {useEffect, useState} from 'react';
import {Alert} from 'react-native';
import RNPrint from 'react-native-print';
import PaperReport from '../components/PaperReport';
import {useApp} from '../context/AppContext';
import {API, htmlFor} from '../report';
import {apiRequest} from '../services/api';
import {SavedRecipient} from '../../shared/recipients';
export default function PreviewScreen(){
  const {d,setPath,busy,send}=useApp();
  const [recipients,setRecipients]=useState<SavedRecipient[]>([]);
  const [recipientStatus,setRecipientStatus]=useState('');
  const [recipientLoading,setRecipientLoading]=useState(true);
  const [refresh,setRefresh]=useState(0);
  useEffect(()=>{
    let active=true;
    setRecipientLoading(true);setRecipientStatus('');
    apiRequest(API,'/recipients').then(data=>{if(active)setRecipients(data.recipients);})
      .catch(()=>{if(active){setRecipients([]);setRecipientStatus('Kayıtlı alıcılar yüklenemedi. Listeyi yenileyebilir veya Yeni e-posta ile devam edebilirsiniz.');}})
      .finally(()=>{if(active)setRecipientLoading(false);});
    return ()=>{active=false;};
  },[refresh]);
  const action=async(name:string,detail:any)=>{
    if(name==='reload-recipients'){setRefresh(value=>value+1);return;}
    if(name==='print')try{await RNPrint.print({html:htmlFor(d)});}catch(e:any){Alert.alert('Önizleme açılamadı',e.message||'Yazdırma servisini kontrol edin.');}
    if(name==='send'&&!busy){
      const value=String(detail.recipient||'').trim();
      if(!value||value.split(',').some((email:string)=>!/^\S+@[^\s@]+\.[^\s@]+$/.test(email.trim()))){Alert.alert('Alıcı gerekli','Kayıtlı bir alıcı seçin veya geçerli bir e-posta yazın.');return;}
      Alert.alert('Gönderimi onayla','Kontrol formu ve ekleri '+value+' adresine gönderilsin mi?',[{text:'Vazgeç',style:'cancel'},{text:'Gönder',onPress:()=>send(value)}]);
    }
  };
  return <PaperReport data={d} readOnly showSend recipients={recipients} recipientStatus={recipientStatus} recipientLoading={recipientLoading} onChange={setPath} onAction={action} />;
}
