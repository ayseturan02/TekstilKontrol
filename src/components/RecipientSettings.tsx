import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useApp} from '../context/AppContext';
import {apiRequest} from '../services/auth';
import {API} from '../report';
import {SavedRecipient, isValidEmail, normalizeEmail} from '../../shared/recipients';
import {Button, Field} from './Form';

export default function RecipientSettings() {
  const {token, user} = useApp();
  const [items, setItems] = useState<SavedRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState('');
  const active = useRef(true);
  const working = useRef(false);
  const load = async () => {
    setLoading(true); setError('');
    try {const data = await apiRequest(API, '/recipients', {token}); if (active.current) setItems(data.recipients);}
    catch (problem: any) {if (active.current) setError(problem.message);}
    finally {if (active.current) setLoading(false);}
  };
  useEffect(() => {
    active.current = true;
    if (user?.role === 'admin') load();
    return () => {active.current = false;};
  }, [token, user?.role]);
  const close = () => {if (working.current) return; setOpen(false); setName(''); setEmail(''); setFormError('');};
  const add = async () => {
    if (working.current) return;
    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {setFormError('Geçerli bir e-posta adresi girin.'); return;}
    working.current = true; setSaving(true); setFormError('');
    try {
      const data = await apiRequest(API, '/admin/recipients', {token, method: 'POST', body: {name: name.trim(), email: normalized}});
      if (active.current) {setItems(current => [...current, data.recipient]); setOpen(false); setName(''); setEmail('');}
    } catch (problem: any) {if (active.current) setFormError(problem.message);}
    finally {working.current = false; if (active.current) setSaving(false);}
  };
  const remove = (item: SavedRecipient) => Alert.alert('E-posta adresini kaldır', item.email + ' kayıtlı alıcılardan kaldırılsın mı?', [
    {text: 'Vazgeç', style: 'cancel'},
    {text: 'Kaldır', style: 'destructive', onPress: async () => {
      if (working.current) return;
      working.current = true; setRemoving(item.id);
      try {
        await apiRequest(API, '/admin/recipients/' + encodeURIComponent(item.id), {token, method: 'DELETE'});
        if (active.current) setItems(current => current.filter(entry => entry.id !== item.id));
      } catch (problem: any) {if (active.current) Alert.alert('Kaldırılamadı', problem.message);}
      finally {working.current = false; if (active.current) setRemoving('');}
    }},
  ]);
  if (user?.role !== 'admin') return null;
  return <View style={styles.card}>
    <View style={styles.header}>
      <View style={{flex: 1, minWidth: 180}}><Text style={styles.eyebrow}>GÖNDERİM AYARLARI</Text><Text style={styles.title}>Mail gönderilecek kişiler</Text><Text style={styles.description}>Kaydettiğiniz adresler form gönderirken tüm kullanıcıların alıcı listesinde görünür.</Text></View>
      <Button title="+ Mail ekle" onPress={() => {setOpen(true); setFormError('');}} disabled={loading || !!error || !!removing} style={{minHeight: 44}} />
    </View>
    {loading ? <ActivityIndicator accessibilityLabel="E-posta alıcıları yükleniyor" color="#315be8" style={{margin: 30}} /> : error ? <View style={styles.feedback}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Button title="Alıcıları tekrar yükle" outline onPress={load} /></View> : items.length ? items.map(item => <View key={item.id} style={styles.row}>
      <View style={styles.icon}><Text style={styles.at}>@</Text></View>
      <View style={{flex: 1, minWidth: 0}}><View style={styles.nameRow}><Text style={styles.name}>{item.name}</Text>{item.isExample && <Text style={styles.example}>Örnek</Text>}</View><Text style={styles.email}>{item.email}</Text></View>
      <Button title={removing === item.id ? '…' : 'Kaldır'} outline disabled={!!removing || saving} onPress={() => remove(item)} style={styles.remove} textStyle={{fontSize: 11, color: '#8c6380'}} />
    </View>) : <View style={styles.feedback}><Text style={styles.description}>Henüz kayıtlı e-posta yok. Mail ekle ile ilk adresi kaydedin.</Text></View>}
    <View style={styles.footer}><Text style={styles.footerText}>Form gönderirken kayıtlı bir adres seçebilir veya “Yeni e-posta” ile farklı bir adres yazabilirsiniz.</Text></View>
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      {open && <SafeAreaView style={styles.backdrop}><KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled"><View style={styles.panel} accessibilityViewIsModal>
        <Text style={styles.eyebrow}>ADRES DEFTERİ</Text><Text style={styles.modalTitle}>Mail ekle</Text><Text style={styles.description}>Bu adresi tüm ekip, form gönderiminde seçebilir.</Text>
        <View style={{marginTop: 24}}><Field label="Kişi / ekip adı (isteğe bağlı)" value={name} onChangeText={setName} maxLength={120} editable={!saving} /><Field label="E-posta adresi" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={254} editable={!saving} /></View>
        {!!formError && <Text accessibilityRole="alert" style={styles.error}>{formError}</Text>}
        <View style={styles.actions}><Button title="Vazgeç" outline onPress={close} disabled={saving} /><Button title={saving ? 'Kaydediliyor…' : 'E-postayı kaydet'} onPress={add} disabled={saving} /></View>
      </View></ScrollView></KeyboardAvoidingView></SafeAreaView>}
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  card: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5eaf3', borderRadius: 20, overflow: 'hidden', marginTop: 24},
  header: {padding: 24, flexDirection: 'row', gap: 18, alignItems: 'center', flexWrap: 'wrap'},
  eyebrow: {fontSize: 9, letterSpacing: 1.6, fontWeight: '800', color: '#315be8', marginBottom: 8}, title: {fontSize: 19, fontWeight: '800', color: '#263653'},
  description: {fontSize: 12, lineHeight: 20, color: '#8794aa', marginTop: 7},
  row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingVertical: 18, borderTopWidth: 1, borderColor: '#edf1f7'},
  icon: {width: 38, height: 38, borderRadius: 12, backgroundColor: '#edf2ff', alignItems: 'center', justifyContent: 'center'}, at: {fontSize: 18, fontWeight: '700', color: '#315be8'},
  nameRow: {flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap'}, name: {fontSize: 13, color: '#293a57', fontWeight: '700', flexShrink: 1},
  email: {fontSize: 12, color: '#8a98ae', marginTop: 4}, example: {fontSize: 9, color: '#9b8445', backgroundColor: '#fbf6e9', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, overflow: 'hidden'},
  remove: {minHeight: 36, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8}, feedback: {padding: 24, alignItems: 'center', gap: 12}, error: {fontSize: 13, color: '#b42338', lineHeight: 20, marginBottom: 12},
  footer: {backgroundColor: '#fcfdff', borderTopWidth: 1, borderColor: '#edf1f7', paddingHorizontal: 24, paddingVertical: 14}, footerText: {fontSize: 11, color: '#91a0b6', lineHeight: 18},
  backdrop: {flex: 1, backgroundColor: 'rgba(12,25,48,0.5)'}, modalScroll: {flexGrow: 1, justifyContent: 'center', padding: 20}, panel: {width: '100%', maxWidth: 500, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 24, padding: 28},
  modalTitle: {fontSize: 25, fontWeight: '800', color: '#223451', marginBottom: 4}, actions: {flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12},
});
