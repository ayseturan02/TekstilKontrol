import React, {useEffect, useRef, useState} from 'react';
import {KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {Button} from './Form';
import {fieldValue, PaperField, paperFields} from './PaperReport';
import {s} from '../styles';
type Props={field:PaperField|null;data:any;onClose:()=>void;onSave:(path:string,value:string)=>void;onNext:(field:PaperField)=>void};
export default function PaperFieldEditor({field,data,onClose,onSave,onNext}:Props){
  const [value,setValue]=useState('');
  const input=useRef<TextInput>(null);
  useEffect(()=>{if(field)setValue(fieldValue(data,field.path));},[field,data]);
  const commit=()=>{if(field)onSave(field.path,value);};
  const next=field?paperFields[paperFields.findIndex(f=>f.path===field.path)+1]:undefined;
  return <Modal visible={!!field} transparent animationType="fade" onRequestClose={onClose} onShow={()=>input.current?.focus()}>
    <SafeAreaView style={e.backdrop}><KeyboardAvoidingView style={e.keyboard} behavior={Platform.OS==='ios'?'padding':undefined}>
      <ScrollView contentContainerStyle={e.scroll} keyboardShouldPersistTaps="handled">
        <View style={e.panel}>
          <Text style={s.eyebrow}>KONTROL RAPORU</Text><Text style={e.title}>{field?.label}</Text>
          <TextInput ref={input} autoFocus accessibilityLabel={field?.label} style={[e.input,field?.multiline&&e.multiline]}
            value={value} onChangeText={setValue} multiline={!!field?.multiline} keyboardType={field?.numeric?'decimal-pad':'default'}
            autoCapitalize={field?.numeric?'none':'sentences'} maxLength={4000} placeholder="Buraya yazın…" placeholderTextColor="#9aa7b8"
            onSubmitEditing={field?.multiline?undefined:()=>{commit();onClose();}} />
          <View style={e.buttons}><Button title="Vazgeç" outline onPress={onClose} /><Button title="Tamam" onPress={()=>{commit();onClose();}} /></View>
          {!!next&&<View style={{marginTop:12}}><Button title="Kaydet ve sonraki alana geç →" outline onPress={()=>{commit();onNext(next);input.current?.focus();}} /></View>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView></SafeAreaView>
  </Modal>;
}
const e=StyleSheet.create({backdrop:{flex:1,backgroundColor:'rgba(16,35,62,0.62)'},keyboard:{flex:1},scroll:{flexGrow:1,justifyContent:'center',alignItems:'center',padding:24},panel:{width:'100%',maxWidth:600,backgroundColor:'white',borderRadius:22,padding:26},title:{fontSize:23,fontWeight:'800',color:'#1b2b49',marginBottom:20},input:{borderWidth:1.5,borderColor:'#315be8',backgroundColor:'#f8faff',borderRadius:12,padding:16,fontSize:24,color:'#182f4b',minHeight:68},multiline:{minHeight:160,textAlignVertical:'top'},buttons:{flexDirection:'row',justifyContent:'flex-end',gap:10,marginTop:20}});
