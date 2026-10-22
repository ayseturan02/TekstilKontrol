import React from 'react';
import {Alert, Image, StyleSheet, Text, View} from 'react-native';
import {Asset} from 'react-native-image-picker';
import {useApp} from '../context/AppContext';
import {Button} from './Form';
export default function ReportMedia({readOnly=false}:{readOnly?:boolean}){
  const {d,set,addMedia}=useApp();
  return <View style={m.panel}><Text style={m.title}>Fotoğraf ve video ekleri</Text>
    {!readOnly&&<View style={m.actions}><Button title="Fotoğraf çek" outline onPress={()=>addMedia(true,false)} /><Button title="Fotoğraf seç" outline onPress={()=>addMedia(false,false)} /><Button title="Video çek" outline onPress={()=>addMedia(true,true)} /><Button title="Video seç" outline onPress={()=>addMedia(false,true)} /></View>}
    <Text style={m.info}>{d.media.length} / 10 dosya · Dosya başına en fazla 25 MB</Text>
    <View style={m.assets}>{d.media.map((asset:Asset,i:number)=><View key={asset.uri||i} style={m.asset}>
      {asset.type?.startsWith('image')&&asset.uri?<Image source={{uri:asset.uri}} style={m.image} />:<View style={m.video}><Text style={m.videoText}>▶ VIDEO</Text></View>}
      <Text style={m.fileName} numberOfLines={2}>{asset.fileName||'Ek '+(i+1)}</Text>
      {!readOnly&&<Button title="Kaldır" outline onPress={()=>Alert.alert('Eki kaldır','Bu dosya rapor eklerinden kaldırılsın mı?',[{text:'Vazgeç',style:'cancel'},{text:'Kaldır',style:'destructive',onPress:()=>set('media',d.media.filter((_:Asset,j:number)=>i!==j))}])} />}
    </View>)}</View>
  </View>;
}
const m=StyleSheet.create({panel:{marginTop:20,padding:20,backgroundColor:'white',borderRadius:16,borderWidth:1,borderColor:'#dde4ed'},title:{fontSize:17,fontWeight:'800',color:'#243a59',marginBottom:16},actions:{flexDirection:'row',flexWrap:'wrap',gap:10},info:{fontSize:12,color:'#7e8ba0',marginTop:14},assets:{flexDirection:'row',flexWrap:'wrap',gap:14,marginTop:14},asset:{width:132,gap:8},image:{width:132,height:112,borderRadius:10},video:{width:132,height:112,borderRadius:10,backgroundColor:'#eaf0f9',justifyContent:'center',alignItems:'center'},videoText:{fontSize:14,color:'#195778',fontWeight:'700'},fileName:{fontSize:11,color:'#697b91',minHeight:28}});
