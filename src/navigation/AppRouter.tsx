import {SafeAreaView} from 'react-native-safe-area-context';
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Alert, BackHandler, Modal, StatusBar, Text, TouchableOpacity, View} from 'react-native';
import {useApp} from '../context/AppContext';
import {Button} from '../components/Form';
import {s} from '../styles';
import LoginScreen from '../screens/LoginScreen';
import ReportFormScreen from '../screens/ReportFormScreen';
import PreviewScreen from '../screens/PreviewScreen';
function ReportRouter(){
  const {ready,draftStatus,save,persist,logout,busy}=useApp();
  const [page,setPage]=useState<'form'|'preview'>('form');
  const [menuOpen,setMenuOpen]=useState(false);
  useEffect(()=>{
    const handler=BackHandler.addEventListener('hardwareBackPress',()=>{if(page==='preview'){setPage('form');return true;}return false;});
    return ()=>handler.remove();
  },[page]);
  const preview=async()=>{try{await persist();setPage('preview');}catch{Alert.alert('Kaydedilemedi','Önizlemeden önce formu kaydetmek için tekrar deneyin.');}};
  return <SafeAreaView style={s.root}>
    <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
    <View style={s.top}><View style={{flex:1}}><Text style={s.logo}>İNTERNET TEKSTİL</Text><Text style={s.subtitle}>SANAYİ VE TİCARET A.Ş.</Text></View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Menüyü aç" onPress={()=>setMenuOpen(true)} style={s.menuButton}><Text style={s.menuText}>☰ Menü</Text></TouchableOpacity>
    </View>
    {!ready?<View style={{flex:1,justifyContent:'center'}}><ActivityIndicator size="large" /></View>:<View style={{flex:1}}>{page==='form'?<ReportFormScreen />:<PreviewScreen />}</View>}
    <View style={[s.footer,{flexWrap:'wrap',paddingHorizontal:14}]}>
      <View style={{flex:1,minWidth:100}}><Text style={{fontSize:12,fontWeight:'700',color:'#365576'}}>{page==='form'?'Kontrol formu':'Doldurulmuş rapor'}</Text><Text style={[s.muted,{marginTop:3}]}>{draftStatus}</Text></View>
      <View style={s.actions}><Button title="Kaydet" outline disabled={!ready||busy} onPress={save} />
        <Button title={page==='form'?'Önizle →':'← Forma dön'} disabled={!ready||busy} onPress={page==='form'?preview:()=>setPage('form')} />
      </View>
    </View>
    <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={()=>setMenuOpen(false)}>
      <TouchableOpacity activeOpacity={1} style={s.modalBackdrop} onPress={()=>setMenuOpen(false)}>
        <View style={s.menuPanel} onStartShouldSetResponder={()=>true}><Text style={s.sideValue}>İNTERNET TEKSTİL</Text>
          <TouchableOpacity style={s.menuItem} disabled={busy} onPress={()=>{setMenuOpen(false);logout();}}><Text style={s.logoutText}>Çıkış yap →</Text></TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  </SafeAreaView>;
}
export default function AppRouter(){const {token}=useApp();return token?<ReportRouter />:<LoginScreen />;}
