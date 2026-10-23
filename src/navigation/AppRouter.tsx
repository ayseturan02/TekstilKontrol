import {SafeAreaView} from 'react-native-safe-area-context';
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Alert, BackHandler, StatusBar, Text, View} from 'react-native';
import {useApp} from '../context/AppContext';
import {Button} from '../components/Form';
import {s} from '../styles';
import SplashScreen from '../screens/SplashScreen';
import ReportFormScreen from '../screens/ReportFormScreen';
import PreviewScreen from '../screens/PreviewScreen';
function ReportRouter(){
  const {ready,draftStatus,save,persist,clearReport,reportVersion,busy}=useApp();
  const [page,setPage]=useState<'form'|'preview'>('form');
  useEffect(()=>{
    const handler=BackHandler.addEventListener('hardwareBackPress',()=>{if(page!=='form'){setPage('form');return true;}return false;});
    return ()=>handler.remove();
  },[page]);
  const preview=async()=>{try{await persist();setPage('preview');}catch{Alert.alert('Kaydedilemedi','Önizlemeden önce formu kaydetmek için tekrar deneyin.');}};
  const confirmClear=()=>Alert.alert('Ekranı temizle','Formdaki tüm yazılar, seçimler, imzalar ve ekler temizlensin mi?',[
    {text:'Vazgeç',style:'cancel'},
    {text:'Tümünü temizle',style:'destructive',onPress:async()=>{if(await clearReport())setPage('form');}},
  ]);
  return <SafeAreaView style={s.root}>
    <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
    <View style={s.top}><View style={{flex:1}}><Text style={s.logo}>İNTERNET TEKSTİL</Text><Text style={s.subtitle}>SANAYİ VE TİCARET A.Ş.</Text></View>
    </View>
    {!ready?<View style={{flex:1,justifyContent:'center'}}><ActivityIndicator size="large" /></View>:<View key={reportVersion} style={{flex:1}}>{page==='preview'?<PreviewScreen />:<ReportFormScreen />}</View>}
    <View style={[s.footer,{flexWrap:'wrap',paddingHorizontal:14}]}>
      <View style={{flex:1,minWidth:100}}><Text style={{fontSize:12,fontWeight:'700',color:'#365576'}}>{page==='form'?'Kontrol formu':'Doldurulmuş rapor'}</Text><Text style={[s.muted,{marginTop:3}]}>{draftStatus}</Text></View>
      <View style={s.actions}><Button title="Kaydet" outline disabled={!ready||busy} onPress={save} />
        <Button title="Ekranı temizle" outline disabled={!ready||busy} onPress={confirmClear} />
        <Button title={page==='form'?'Önizle →':'← Forma dön'} disabled={!ready||busy} onPress={page==='form'?preview:()=>setPage('form')} />
      </View>
    </View>

  </SafeAreaView>;
}
export default function AppRouter(){
  const {ready}=useApp();
  const [splashDone,setSplashDone]=useState(false);
  useEffect(()=>{const timer=setTimeout(()=>setSplashDone(true),1000);return ()=>clearTimeout(timer);},[]);
  if(!splashDone||!ready)return <SplashScreen />;
  return <ReportRouter />;
}
