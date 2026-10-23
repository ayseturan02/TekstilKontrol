import React, {createContext, useContext, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {launchCamera, launchImageLibrary, Asset} from 'react-native-image-picker';
import {API, createInitial, normalizeReport} from '../report';
import {authenticate, getProfile, UserProfile} from '../services/auth';
function useAppState() {
  const [reportVersion,setReportVersion]=useState(0);
  const [token,setToken]=useState('');
  const [user,setUser]=useState<UserProfile|null>(null);
  const [sessionReady,setSessionReady]=useState(false);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [loginError,setLoginError]=useState('');
  const loggingIn=useRef(false);
  const [d,setD]=useState<any>(createInitial);
  const [busy,setBusy]=useState(false);
  const [draftReady,setDraftReady]=useState(false);
  const [loadedKey,setLoadedKey]=useState('');
  const [draftWritable,setDraftWritable]=useState(false);
  const draftOwner=useRef('');
  const accountEmail=(user?.email||email).trim().toLowerCase();
  const accountKey=token?(user?.id?'paper-form-v3:user:'+encodeURIComponent(user.id):accountEmail?'paper-form-v3:email:'+encodeURIComponent(accountEmail):''):'';
  const ready=draftReady&&loadedKey===accountKey;
  const [draftStatus,setDraftStatus]=useState('');
  const storageQueue=useRef<Promise<any>>(Promise.resolve());
  const sending=useRef(false);
  const enqueue=(task:()=>Promise<any>)=>{
    const job=storageQueue.current.catch(()=>{}).then(task);
    storageQueue.current=job;
    return job;
  };
  useEffect(()=>{
    let active=true;
    AsyncStorage.getItem('saved-session-v1').then(async value=>{
      if(!active||!value)return;
      let session:any;
      try{session=JSON.parse(value);}catch{return;}
      if(typeof session.token!=='string'||!session.token)return;
      let profile:UserProfile|null=null;
      try{profile=await getProfile(API,session.token);}
      catch(error:any){
        if(error.status===401){await AsyncStorage.removeItem('saved-session-v1');return;}
        profile=session.user||null;
      }
      if(!active)return;
      setToken(session.token);setUser(profile);
      if(typeof session.email==='string')setEmail(session.email);
    }).catch(()=>{}).finally(()=>{if(active)setSessionReady(true);});
    return ()=>{active=false;};
  },[]);
  useEffect(()=>{
    let active=true;
    draftOwner.current=accountKey;
    setDraftReady(false);setDraftWritable(false);setDraftStatus('');setD(createInitial());
    const load=async()=>{
      if(!accountKey){if(active){setLoadedKey('');setDraftReady(true);}return;}
      try{
        await storageQueue.current.catch(()=>{});
        const value=await AsyncStorage.getItem(accountKey);
        const report=value?normalizeReport(JSON.parse(value)):createInitial();
        if(active&&draftOwner.current===accountKey){setD(report);setDraftWritable(true);setDraftStatus(value?'Taslağınız yüklendi':'Yeni kontrol formu');}
      }catch{
        if(active)setDraftStatus('Taslak okunamadı. Çıkış yapıp tekrar giriş yapın.');
      }finally{
        if(active&&draftOwner.current===accountKey){setLoadedKey(accountKey);setDraftReady(true);setReportVersion(value=>value+1);}
      }
    };
    load();
    return ()=>{active=false;};
  },[accountKey]);
  const persist = async (report:any=d)=>{
    const key=accountKey;
    if(!key||!ready||!draftWritable||draftOwner.current!==key)throw Error('Kişisel taslak henüz hazır değil.');
    const snapshot=JSON.stringify(report);
    await enqueue(()=>AsyncStorage.setItem(key,snapshot));
  };
  useEffect(()=>{
    if(!ready||!accountKey||!draftWritable)return;
    let active=true;
    setDraftStatus('Kaydediliyor…');
    const timer=setTimeout(()=>{
      persist(d).then(()=>{if(active&&draftOwner.current===accountKey)setDraftStatus('Kişisel taslak kaydedildi');}).catch(()=>{if(active&&draftOwner.current===accountKey)setDraftStatus('Kaydedilemedi — tekrar deneyin');});
    },600);
    return ()=>{active=false;clearTimeout(timer);};
  },[d,ready,accountKey,draftWritable]);
  const set=(key:string,value:any)=>{if(!ready||!accountKey||draftOwner.current!==accountKey)return;setD((old:any)=>({...old,[key]:value}));};
  const setPath=(path:string,value:any)=>{if(!ready||!accountKey||draftOwner.current!==accountKey)return;setD((old:any)=>{
    const keys=path.split('.');
    const copy=Array.isArray(old)?[...old]:{...old};
    let target:any=copy;
    let source:any=old;
    for(const key of keys.slice(0,-1)){
      source=source?.[key];
      target[key]=Array.isArray(source)?[...source]:{...source};
      target=target[key];
    }
    target[keys[keys.length-1]]=value;
    return copy;
  });};
  const save=async()=>{
    try{await persist();setDraftStatus('Cihazda kaydedildi');Alert.alert('Kaydedildi','Form cihazda saklandı.');}
    catch{setDraftStatus('Kaydedilemedi');Alert.alert('Kaydedilemedi','Cihaz depolamasını kontrol edip tekrar deneyin.');}
  };
  const login=async()=>{
    if(loggingIn.current)return;
    loggingIn.current=true;
    setLoginError('');setBusy(true);
    try{
      let profile:UserProfile|null=null;
      const session=await authenticate(email,password,{api:API,onProfile:value=>{profile=value;}});
      await AsyncStorage.setItem('saved-session-v1',JSON.stringify({token:session,email:email.trim().toLowerCase(),user:profile}));
      setUser(profile);setToken(session);setPassword('');
    }catch(e:any){setLoginError(e.message||'Giriş yapılamadı. Bağlantınızı kontrol edip tekrar deneyin.');}
    finally{loggingIn.current=false;setBusy(false);}
  };
  const addMedia=async(camera:boolean,video:boolean)=>{
    const owner=accountKey;
    if(!ready||!owner||draftOwner.current!==owner)return;
    if(d.media.length>=40){Alert.alert('Ek sınırı','En fazla 40 fotoğraf veya video ekleyebilirsiniz.');return;}
    try{
      const options={mediaType:video?'video' as const:'photo' as const,quality:0.8 as const,videoQuality:'low' as const,durationLimit:60};
      const r=camera?await launchCamera(options):await launchImageLibrary({...options,selectionLimit:40-d.media.length});
      if(draftOwner.current!==owner||r.didCancel)return;
      if(r.errorCode){Alert.alert('Medya eklenemedi',r.errorMessage||'Kamera veya galeri iznini kontrol edin.');return;}
      const assets=(r.assets||[]).filter(a=>a.uri&&(!a.fileSize||a.fileSize<=25*1024*1024));
      if(assets.length!==(r.assets||[]).length)Alert.alert('Bazı ekler alınamadı','Her dosya en fazla 25 MB olabilir.');
      setD((old:any)=>({...old,media:[...old.media,...assets].slice(0,40)}));
    }catch(e:any){Alert.alert('Medya eklenemedi',e.message||'Tekrar deneyin.');}
  };
  const send=async(recipientOverride?:string)=>{
    const report=typeof recipientOverride==='string'?{...d,recipient:recipientOverride}:d;
    if(sending.current)return;
    if(token==='demo-session'){Alert.alert('Demo','Demo hesabında e-posta gönderimi kapalı. Formu önizleyebilir ve yazdırabilirsiniz.');return;}
    const recipients=report.recipient.split(',').map((v:string)=>v.trim()).filter(Boolean);
    if(!recipients.length||recipients.some((v:string)=>!/^\S+@[^\s@]+\.[^\s@]+$/.test(v))){Alert.alert('Alıcı gerekli','Geçerli e-posta adreslerini virgülle ayırarak yazın.');return;}
    sending.current=true;setBusy(true);
    try{
      const body=new FormData();body.append('report',JSON.stringify(report));
      for(const a of d.media as Asset[])if(a.uri)body.append('files',{uri:a.uri,type:a.type||'application/octet-stream',name:a.fileName||'ek'} as any);
      const r=await fetch(API+'/send',{method:'POST',headers:{Authorization:'Bearer '+token},body});
      const j=await r.json();if(!r.ok)throw Error(j.error||'Gönderim başarısız');
      // Keep the completed report on screen after sending, avoiding accidental loss.
      await persist().catch(()=>{});
      Alert.alert('Gönderildi','Doldurulmuş kontrol formu ve ekler e-posta ile gönderildi.');
    }catch(e:any){Alert.alert('Gönderilemedi',e.message||'Bağlantıyı kontrol edip tekrar deneyin.');}
    finally{sending.current=false;setBusy(false);}
  };
  const logout=async()=>{try{if(ready&&draftWritable&&accountKey)await persist();await AsyncStorage.removeItem('saved-session-v1');draftOwner.current='';setD(createInitial());setDraftReady(false);setToken('');setUser(null);setPassword('');}catch{Alert.alert('Kaydedilemedi','Çıkıştan önce formu kaydetmek için tekrar deneyin.');}};
  return {reportVersion,sessionReady,token,user,email,setEmail:(value:string)=>{setEmail(value);setLoginError('');},password,setPassword:(value:string)=>{setPassword(value);setLoginError('');},loginError,d,set,setPath,busy,ready,draftStatus,save,persist,login,logout,addMedia,send};
}
const AppContext=createContext<ReturnType<typeof useAppState>|null>(null);
export function AppProvider({children}:React.PropsWithChildren){return <AppContext.Provider value={useAppState()}>{children}</AppContext.Provider>;}
export function useApp(){const value=useContext(AppContext);if(!value)throw Error('AppProvider gerekli');return value;}
