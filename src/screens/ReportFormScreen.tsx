import React from 'react';
import {Alert} from 'react-native';
import {useApp} from '../context/AppContext';
import PaperReport from '../components/PaperReport';
export default function ReportFormScreen(){
  const {d,setPath,addMedia,set}=useApp();
  const action=(name:string,detail:any)=>{
    if(name==='photo-camera')addMedia(true,false);
    if(name==='photo-library')addMedia(false,false);
    if(name==='video-camera')addMedia(true,true);
    if(name==='video-library')addMedia(false,true);
    if(name==='remove-media'&&Number.isInteger(detail.index)&&d.media[detail.index])Alert.alert('Eki kaldır','Bu dosya rapor eklerinden kaldırılsın mı?',[{text:'Vazgeç',style:'cancel'},{text:'Kaldır',style:'destructive',onPress:()=>set('media',d.media.filter((_:any,i:number)=>i!==detail.index))}]);
  };
  return <PaperReport data={d} onChange={setPath} onAction={action} />;
}
