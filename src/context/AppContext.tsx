import React, {createContext, useContext, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {launchCamera, launchImageLibrary, Asset} from 'react-native-image-picker';
import {createInitial, normalizeReport} from '../report';
function useAppState() {
  const [reportVersion,setReportVersion]=useState(0);
  const [d,setD]=useState<any>(createInitial);
  const [busy,setBusy]=useState(false);
  const [draftReady,setDraftReady]=useState(false);
  const [loadedKey,setLoadedKey]=useState('');
  const [draftWritable,setDraftWritable]=useState(false);
  const draftOwner=useRef('');
  const draftKey='paper-form-v4:device';
  const ready=draftReady&&loadedKey===draftKey;
  const [draftStatus,setDraftStatus]=useState('');
  const storageQueue=useRef<Promise<any>>(Promise.resolve());
  const clearing=useRef(false);
  const generation=useRef(0);
  const enqueue=(task:()=>Promise<any>)=>{
    const job=storageQueue.current.catch(()=>{}).then(task);
    storageQueue.current=job;
    return job;
  };
  useEffect(()=>{
    let active=true;
    draftOwner.current=draftKey;
    setDraftReady(false);setDraftWritable(false);setDraftStatus('');setD(createInitial());
    const load=async()=>{
      if(!draftKey){if(active){setLoadedKey('');setDraftReady(true);}return;}
      try{
        await storageQueue.current.catch(()=>{});
        let value=await AsyncStorage.getItem(draftKey);
        if(!value){
          const saved=await AsyncStorage.getItem('saved-session-v1');
          let session:any;try{session=saved?JSON.parse(saved):null;}catch{}
          const id=session?.user?.id;
          const address=String(session?.user?.email||session?.email||'').trim().toLowerCase();
          const previousKey=id?'paper-form-v3:user:'+encodeURIComponent(id):address?'paper-form-v3:email:'+encodeURIComponent(address):'';
          if(previousKey)value=await AsyncStorage.getItem(previousKey);
          if(!value)value=await AsyncStorage.getItem('paper-form-v2');
        }
        const report=value?normalizeReport(JSON.parse(value)):createInitial();
        if(active&&draftOwner.current===draftKey){setD(report);setDraftWritable(true);setDraftStatus(value?'Taslağınız yüklendi':'Yeni kontrol formu');}
      }catch{
        if(active)setDraftStatus('Taslak okunamadı. Uygulamayı yeniden açın.');
      }finally{
        if(active&&draftOwner.current===draftKey){setLoadedKey(draftKey);setDraftReady(true);setReportVersion(value=>value+1);}
      }
    };
    load();
    return ()=>{active=false;};
  },[draftKey]);
  const persist = async (report:any=d)=>{
    const key=draftKey;
    if(!key||!ready||!draftWritable||draftOwner.current!==key)throw Error('Cihaz taslağı henüz hazır değil.');
    const snapshot=JSON.stringify(report);
    await enqueue(()=>AsyncStorage.setItem(key,snapshot));
  };
  useEffect(()=>{
    if(!ready||!draftKey||!draftWritable)return;
    let active=true;
    const version=generation.current;
    setDraftStatus('Kaydediliyor…');
    const timer=setTimeout(()=>{
      if(clearing.current||version!==generation.current)return;
      persist(d).then(()=>{if(active&&draftOwner.current===draftKey)setDraftStatus('Cihaz taslağı kaydedildi');}).catch(()=>{if(active&&draftOwner.current===draftKey)setDraftStatus('Kaydedilemedi — tekrar deneyin');});
    },600);
    return ()=>{active=false;clearTimeout(timer);};
  },[d,ready,draftKey,draftWritable]);
  const set=(key:string,value:any)=>{if(clearing.current||!ready||!draftKey||draftOwner.current!==draftKey)return;setD((old:any)=>({...old,[key]:value}));};
  const setPath=(path:string,value:any)=>{if(clearing.current||!ready||!draftKey||draftOwner.current!==draftKey)return;setD((old:any)=>{
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
  const clearReport=async()=>{
    if(!ready||busy||clearing.current)return false;
    clearing.current=true;generation.current++;setBusy(true);
    const blank=createInitial();
    try{
      await enqueue(()=>AsyncStorage.setItem(draftKey,JSON.stringify(blank)));
      setD(blank);setDraftWritable(true);setReportVersion(value=>value+1);
      setDraftStatus('Ekran temizlendi');return true;
    }catch{
      Alert.alert('Temizlenemedi','Cihaz depolamasını kontrol edip tekrar deneyin.');return false;
    }finally{clearing.current=false;setBusy(false);}
  };
  const addMedia=async(camera:boolean,video:boolean)=>{
    const owner=draftKey;
    const version=generation.current;
    if(clearing.current||!ready||!owner||draftOwner.current!==owner)return;
    if(d.media.length>=40){Alert.alert('Ek sınırı','En fazla 40 fotoğraf veya video ekleyebilirsiniz.');return;}
    try{
      const options={mediaType:video?'video' as const:'photo' as const,quality:0.8 as const,videoQuality:'low' as const,durationLimit:60};
      const r=camera?await launchCamera(options):await launchImageLibrary({...options,selectionLimit:40-d.media.length});
      if(version!==generation.current||draftOwner.current!==owner||r.didCancel)return;
      if(r.errorCode){Alert.alert('Medya eklenemedi',r.errorMessage||'Kamera veya galeri iznini kontrol edin.');return;}
      const assets=(r.assets||[]).filter(a=>a.uri&&(!a.fileSize||a.fileSize<=25*1024*1024));
      if(assets.length!==(r.assets||[]).length)Alert.alert('Bazı ekler alınamadı','Her dosya en fazla 25 MB olabilir.');
      setD((old:any)=>({...old,media:[...old.media,...assets].slice(0,40)}));
    }catch(e:any){Alert.alert('Medya eklenemedi',e.message||'Tekrar deneyin.');}
  };
  return {reportVersion,d,set,setPath,busy,ready,draftStatus,save,persist,clearReport,addMedia};
}
const AppContext=createContext<ReturnType<typeof useAppState>|null>(null);
export function AppProvider({children}:React.PropsWithChildren){return <AppContext.Provider value={useAppState()}>{children}</AppContext.Provider>;}
export function useApp(){const value=useContext(AppContext);if(!value)throw Error('AppProvider gerekli');return value;}
