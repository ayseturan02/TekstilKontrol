import {SafeAreaView} from 'react-native-safe-area-context';
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Alert, BackHandler, Modal, StatusBar, Text, TouchableOpacity, View} from 'react-native';
import {useApp} from '../context/AppContext';
import {Button} from '../components/Form';
import {s} from '../styles';
import LoginScreen from '../screens/LoginScreen';
import SplashScreen from '../screens/SplashScreen';
import ReportFormScreen from '../screens/ReportFormScreen';
import PreviewScreen from '../screens/PreviewScreen';
import SettingsScreen from '../screens/SettingsScreen';
function ReportRouter(){
  const {ready,draftStatus,save,persist,logout,busy,email,user}=useApp();
  const [page,setPage]=useState<'form'|'preview'|'settings'>('form');
  const [menuOpen,setMenuOpen]=useState(false);
  const profileName=[user?.firstName,user?.lastName].filter(Boolean).join(' ') || email.trim().split('@')[0].replace(/[._-]+/g,' ') || 'Kullanıcı';
  useEffect(()=>{
    const handler=BackHandler.addEventListener('hardwareBackPress',()=>{if(page!=='form'){setPage('form');return true;}return false;});
    return ()=>handler.remove();
  },[page]);
  const preview=async()=>{try{await persist();setPage('preview');}catch{Alert.alert('Kaydedilemedi','Önizlemeden önce formu kaydetmek için tekrar deneyin.');}};
  return <SafeAreaView style={s.root}>
    <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
    <View style={s.top}><View style={{flex:1}}><Text style={s.logo}>İNTERNET TEKSTİL</Text><Text style={s.subtitle}>SANAYİ VE TİCARET A.Ş.</Text></View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Profili aç" accessibilityState={{expanded:menuOpen}} onPress={()=>setMenuOpen(true)} style={s.profileButton}>
        <View accessible={false} style={s.profileIcon}>
          <View style={s.profileHead} />
          <View style={s.profileShoulders} />
        </View>
      </TouchableOpacity>
    </View>
    {!ready?<View style={{flex:1,justifyContent:'center'}}><ActivityIndicator size="large" /></View>:<View style={{flex:1}}>{page==='settings'&&user?.role==='admin'?<SettingsScreen onBack={()=>setPage('form')} />:page==='preview'?<PreviewScreen />:<ReportFormScreen />}</View>}
    {page!=='settings'&&<View style={[s.footer,{flexWrap:'wrap',paddingHorizontal:14}]}>
      <View style={{flex:1,minWidth:100}}><Text style={{fontSize:12,fontWeight:'700',color:'#365576'}}>{page==='form'?'Kontrol formu':'Doldurulmuş rapor'}</Text><Text style={[s.muted,{marginTop:3}]}>{draftStatus}</Text></View>
      <View style={s.actions}><Button title="Kaydet" outline disabled={!ready||busy} onPress={save} />
        <Button title={page==='form'?'Önizle →':'← Forma dön'} disabled={!ready||busy} onPress={page==='form'?preview:()=>setPage('form')} />
      </View>
    </View>}
    <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={()=>setMenuOpen(false)}>
      <TouchableOpacity activeOpacity={1} style={s.modalBackdrop} onPress={()=>setMenuOpen(false)}>
        <View style={s.menuPanel} onStartShouldSetResponder={()=>true}><Text style={[s.profileName,{textTransform:'none'}]}>{profileName}</Text>
          {user?.role==='admin'&&<TouchableOpacity accessibilityRole="button" accessibilityLabel="Ayarlar" style={s.menuItem} onPress={()=>{setMenuOpen(false);setPage('settings');}}><Text style={s.menuText}>Ayarlar</Text></TouchableOpacity>}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Çıkış yap" style={[s.menuItem,busy&&s.disabled]} disabled={busy} onPress={()=>{setMenuOpen(false);logout();}}><Text style={s.logoutText}>Çıkış yap</Text></TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  </SafeAreaView>;
}
export default function AppRouter(){
  const {token,sessionReady,ready,user,email}=useApp();
  const [splashDone,setSplashDone]=useState(false);
  useEffect(()=>{const timer=setTimeout(()=>setSplashDone(true),1000);return ()=>clearTimeout(timer);},[]);
  if(!splashDone||!sessionReady||!ready)return <SplashScreen />;
  return token?<ReportRouter key={user?.id||email} />:<LoginScreen />;
}
