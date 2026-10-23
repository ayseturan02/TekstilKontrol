import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useApp} from '../context/AppContext';
import {Button, Field} from '../components/Form';
import {apiRequest, UserProfile} from '../services/auth';
import {API} from '../report';
import {s} from '../styles';
import RecipientSettings from '../components/RecipientSettings';

const emptyAccount = {firstName: '', lastName: '', email: '', password: ''};
export default function SettingsScreen({onBack}: {onBack: () => void}) {
  const {user, token, logout} = useApp();
  const {width} = useWindowDimensions();
  const [accounts, setAccounts] = useState<UserProfile[]>([]);
  const [form, setForm] = useState(emptyAccount);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);
  const [resetUser, setResetUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const creatingRef = useRef(false);
  const resettingRef = useRef(false);
  const mounted = useRef(true);
  const isAdmin = user?.role === 'admin';
  const fullName = (account: UserProfile) => [account.firstName, account.lastName].filter(Boolean).join(' ') || account.email;
  const handleSessionError = (error: any) => {
    if (error.status === 401) Alert.alert('Oturum sona erdi', 'Lütfen yeniden giriş yapın.', [{text: 'Tamam', onPress: logout}]);
  };
  const load = async () => {
    setLoading(true); setLoadError('');
    try {
      const data = await apiRequest(API, '/admin/users', {token});
      if (mounted.current) setAccounts(data.users);
    } catch (error: any) {
      if (mounted.current) {setLoadError(error.message); handleSessionError(error);}
    } finally {if (mounted.current) setLoading(false);}
  };
  useEffect(() => {
    mounted.current = true;
    if (isAdmin) load(); else setLoading(false);
    return () => {mounted.current = false;};
  }, [token, isAdmin]);
  const create = async () => {
    if (creatingRef.current) return;
    if (!form.firstName.trim() || !form.lastName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) || form.password.length < 8) {
      setFormError('Ad, soyad, geçerli e-posta ve en az 8 karakterli şifre girin.'); return;
    }
    creatingRef.current = true; setCreating(true); setFormError('');
    try {
      const {user: account} = await apiRequest(API, '/admin/users', {token, method: 'POST', body: form});
      if (!mounted.current) return;
      setAccounts(current => [...current, account]); setForm(emptyAccount); setShowPassword(false); setCreateOpen(false); setSearch(''); setRoleFilter('all');
      Alert.alert('Hesap oluşturuldu', fullName(account) + ' artık e-posta ve belirlediğiniz şifreyle giriş yapabilir.');
    } catch (error: any) {if (mounted.current) {setFormError(error.message); handleSessionError(error);}}
    finally {creatingRef.current = false; if (mounted.current) setCreating(false);}
  };
  const openReset = (account: UserProfile) => {setResetUser(account); setNewPassword(''); setResetError(''); setShowResetPassword(false);};
  const closeReset = () => {if (resettingRef.current) return; setResetUser(null); setNewPassword(''); setResetError('');};
  const resetPassword = async () => {
    if (resettingRef.current || !resetUser) return;
    if (newPassword.length < 8) {setResetError('Yeni şifre en az 8 karakter olmalı.'); return;}
    resettingRef.current = true; setResetting(true); setResetError('');
    try {
      await apiRequest(API, '/admin/users/' + encodeURIComponent(resetUser.id) + '/reset-password', {token, method: 'POST', body: {password: newPassword}});
      if (!mounted.current) return;
      const ownAccount = resetUser.id === user?.id;
      setResetUser(null); setNewPassword('');
      if (ownAccount) {
        await logout();
        Alert.alert('Şifre güncellendi', 'Yeni şifrenizle tekrar giriş yapın.');
      } else Alert.alert('Şifre güncellendi', fullName(resetUser) + ' yeni şifresiyle giriş yapabilir. Önceki oturumları kapatıldı.');
    } catch (error: any) {if (mounted.current) {setResetError(error.message); handleSessionError(error);}}
    finally {resettingRef.current = false; if (mounted.current) setResetting(false);}
  };
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const adminCount = accounts.filter(account => account.role === 'admin').length;
  const query = search.trim().toLocaleLowerCase('tr-TR');
  const visibleAccounts = accounts.filter(account => (roleFilter === 'all' || account.role === roleFilter) && (!query || (fullName(account) + ' ' + account.email).toLocaleLowerCase('tr-TR').includes(query)));
  const initials = (account: UserProfile) => ((account.firstName[0] || '') + (account.lastName[0] || '')).toLocaleUpperCase('tr-TR') || '?';
  const openCreate = () => {setCreateOpen(true); setFormError('');};
  const closeCreate = () => {if (creatingRef.current) return; setCreateOpen(false); setForm(emptyAccount); setFormError(''); setShowPassword(false);};
  const filters: {value: 'all' | 'user' | 'admin'; label: string; count: number}[] = [
    {value: 'all', label: 'Tümü', count: accounts.length},
    {value: 'user', label: 'Kullanıcılar', count: accounts.length - adminCount},
    {value: 'admin', label: 'Yöneticiler', count: adminCount},
  ];
  const wide = width >= 800;
  if (!isAdmin) return <View style={styles.denied}><Text style={s.heading}>Bu sayfa yalnızca yöneticiler içindir.</Text><Button title="Forma dön" onPress={onBack} /></View>;
  return <View style={styles.root}>
    <ScrollView contentContainerStyle={[styles.content, wide && {padding: 32}]} keyboardShouldPersistTaps="handled">
      <View style={styles.shell}>
        <TouchableOpacity accessibilityRole="button" onPress={onBack} style={styles.back}><Text style={styles.backText}>← Kontrol formuna dön</Text></TouchableOpacity>
        <View style={styles.hero}>
          <View style={styles.heroTop}><Text style={styles.heroEyebrow}>AYARLAR / EKİP</Text><View style={styles.heroBadge}><View style={styles.heroBadgeDot} /><Text style={styles.heroBadgeText}>Yönetici paneli</Text></View></View>
          <Text style={[styles.heroTitle, !wide && {fontSize: 27}]}>Kullanıcı yönetimi</Text>
          <Text style={styles.heroDescription}>Ekip hesaplarını oluşturun, kullanıcıları bulun ve şifre işlemlerini yönetin.</Text>
        </View>
        <View style={styles.stats}>
          {[{label: 'Toplam hesap', value: accounts.length, color: '#315be8', background: '#edf2ff'}, {label: 'Kullanıcı', value: accounts.length - adminCount, color: '#138b79', background: '#e9f7f3'}, {label: 'Yönetici', value: adminCount, color: '#8558c9', background: '#f3edfc'}].map(stat => <View key={stat.label} style={[styles.statCard, !wide && {padding: 14}]}>
            <View style={[styles.statIndicator, {backgroundColor: stat.background}]}><View style={[styles.statDot, {backgroundColor: stat.color}]} /></View>
            <Text style={styles.statValue}>{loading || loadError ? '—' : stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>)}
        </View>
        <View style={styles.directory}>
          <View style={styles.directoryHeader}>
            <View style={{flex: 1, minWidth: 160}}><Text style={styles.directoryTitle}>Ekip üyeleri</Text><Text style={styles.directoryDescription}>Hesap bilgileri ve şifre yönetimi</Text></View>
            <Button title="+ Yeni kullanıcı" onPress={openCreate} disabled={loading || !!loadError || creating} style={styles.createButton} />
          </View>
          <View style={styles.toolbar}>
            <View style={styles.searchBox}>
              <View accessible={false} style={styles.searchIcon}><View style={styles.searchRing} /><View style={styles.searchHandle} /></View>
              <TextInput accessibilityLabel="Kullanıcı ara" placeholder="İsim veya e-posta ile ara" placeholderTextColor="#96a0b3" value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} style={styles.searchInput} />
              {!!search && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Aramayı temizle" onPress={() => setSearch('')} style={styles.clearSearch}><Text style={{fontSize: 22, color: '#70809a'}}>×</Text></TouchableOpacity>}
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Listeyi yenile" onPress={load} disabled={loading || creating || resetting} style={[styles.refreshButton, loading && {opacity: 0.4}]}><Text style={styles.refreshIcon}>↻</Text></TouchableOpacity>
          </View>
          <View style={styles.filterBar}>
            <View style={styles.filters}>{filters.map(filter => <TouchableOpacity key={filter.value} accessibilityRole="button" accessibilityLabel={filter.label} accessibilityState={{selected: roleFilter === filter.value}} onPress={() => setRoleFilter(filter.value)} style={[styles.filter, roleFilter === filter.value && styles.filterSelected]}><Text style={[styles.filterLabel, roleFilter === filter.value && styles.filterLabelSelected]}>{filter.label}</Text><Text style={[styles.filterCount, roleFilter === filter.value && styles.filterCountSelected]}>{filter.count}</Text></TouchableOpacity>)}</View>
            {wide && <Text style={styles.resultCount}>{visibleAccounts.length} hesap gösteriliyor</Text>}
          </View>
          {wide && <View style={styles.tableHeader}><Text style={[styles.columnLabel, {flex: 1}]}>KULLANICI</Text><Text style={[styles.columnLabel, {width: 108}]}>YETKİ</Text><Text style={[styles.columnLabel, {width: 110}]}>KATILIM</Text><Text style={[styles.columnLabel, {width: 146, textAlign: 'right'}]}>İŞLEMLER</Text></View>}
          {loading ? <View style={styles.feedback}><ActivityIndicator accessibilityLabel="Kullanıcılar yükleniyor" color="#315be8" /><Text style={styles.feedbackText}>Ekip bilgileri yükleniyor…</Text></View> : loadError ? <View style={styles.feedback}><Text accessibilityRole="alert" style={styles.error}>{loadError}</Text><Button title="Tekrar dene" outline onPress={load} /></View> : visibleAccounts.length ? visibleAccounts.map(account => <View key={account.id} style={[styles.account, !wide && {flexDirection: 'column', alignItems: 'stretch', gap: 16}]}>
            <View style={styles.accountInfo}>
              <View style={[styles.avatar, account.role === 'admin' && styles.adminAvatar]}><Text style={[styles.avatarText, account.role === 'admin' && {color: '#7650b0'}]}>{initials(account)}</Text></View>
              <View style={{flex: 1, minWidth: 0}}><View style={styles.nameRow}><Text style={styles.accountName}>{fullName(account)}</Text>{account.id === user?.id && <Text style={styles.selfBadge}>Siz</Text>}</View><Text style={styles.email}>{account.email}</Text></View>
            </View>
            <View style={[styles.accountMeta, !wide && {justifyContent: 'space-between', flexWrap: 'wrap', gap: 12}]}>
              <View style={wide ? {width: 108} : undefined}><View style={[styles.badge, account.role === 'admin' && styles.adminBadge]}><View style={[styles.roleDot, account.role === 'admin' && {backgroundColor: '#8558c9'}]} /><Text style={[styles.badgeText, account.role === 'admin' && {color: '#7650b0'}]}>{account.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}</Text></View></View>
              {wide && <Text style={styles.date}>{account.createdAt ? new Date(account.createdAt).toLocaleDateString('tr-TR', {day: 'numeric', month: 'short', year: 'numeric'}) : '—'}</Text>}
              <Button title="Şifreyi sıfırla" outline onPress={() => openReset(account)} disabled={creating || resetting} style={styles.resetButton} textStyle={{fontSize: 12}} />
            </View>
          </View>) : <View style={styles.feedback}><View style={styles.emptyCircle}><Text style={styles.emptySymbol}>⌕</Text></View><Text style={styles.emptyTitle}>Kullanıcı bulunamadı</Text><Text style={styles.feedbackText}>İsim, e-posta veya seçtiğiniz filtreyi değiştirin.</Text><Button title="Filtreleri temizle" outline onPress={() => {setSearch(''); setRoleFilter('all');}} /></View>}
          <View style={styles.directoryFooter}><View style={styles.footerDot} /><Text style={styles.footerText}>Her kullanıcının kontrol formu kendi hesabına özeldir.</Text></View>
        </View>
        <RecipientSettings />
      </View>
    </ScrollView>
    <Modal visible={createOpen} transparent animationType="fade" onRequestClose={closeCreate}>
      {createOpen && <SafeAreaView style={styles.modalBackdrop}>
        <KeyboardAvoidingView style={styles.modalCenter} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalPanel} accessibilityViewIsModal>
              <Text style={styles.modalEyebrow}>YENİ HESAP</Text>
              <Text style={styles.modalTitle}>Yeni kullanıcı</Text>
              <Text style={styles.hint}>Hesap bilgilerini belirleyin. Kullanıcı kendi formuyla çalışmaya başlayacak.</Text>
              <View style={[styles.nameFields, width < 500 && {flexDirection: 'column', gap: 0}]}>
                <Field containerStyle={width >= 500 ? {flex: 1} : undefined} label="Ad" value={form.firstName} onChangeText={(value: string) => setForm({...form, firstName: value})} autoComplete="given-name" maxLength={80} editable={!creating} />
                <Field containerStyle={width >= 500 ? {flex: 1} : undefined} label="Soyad" value={form.lastName} onChangeText={(value: string) => setForm({...form, lastName: value})} autoComplete="family-name" maxLength={80} editable={!creating} />
              </View>
              <Field label="E-posta" value={form.email} onChangeText={(value: string) => setForm({...form, email: value})} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254} editable={!creating} />
              <Field label="Şifre" value={form.password} onChangeText={(value: string) => setForm({...form, password: value})} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={!creating} />
              <View style={styles.passwordHelp}><Text style={styles.passwordHint}>En az 8 karakter</Text><TouchableOpacity accessibilityRole="button" onPress={() => setShowPassword(value => !value)} style={styles.passwordToggle}><Text style={s.link}>{showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}</Text></TouchableOpacity></View>
              {!!formError && <Text accessibilityRole="alert" style={styles.error}>{formError}</Text>}
              <View style={styles.roleNotice}><View style={[styles.roleDot, {backgroundColor: '#315be8'}]} /><Text style={styles.roleNoticeText}>Bu hesap standart kullanıcı yetkisiyle oluşturulacak.</Text></View>
              <View style={styles.modalActions}><Button title="Vazgeç" outline onPress={closeCreate} disabled={creating} /><Button title={creating ? 'Oluşturuluyor…' : 'Hesap oluştur'} onPress={create} disabled={creating || loading || !!loadError} /></View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>}
    </Modal>
    <Modal visible={!!resetUser} transparent animationType="fade" onRequestClose={closeReset}>
      {resetUser && <SafeAreaView style={styles.modalBackdrop}>
        <KeyboardAvoidingView style={styles.modalCenter} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalPanel} accessibilityViewIsModal>
              <Text style={styles.modalEyebrow}>HESAP GÜVENLİĞİ</Text>
              <Text style={styles.modalTitle}>Şifreyi sıfırla</Text>
              <View style={styles.resetIdentity}><View style={styles.avatar}><Text style={styles.avatarText}>{initials(resetUser)}</Text></View><View style={{flex: 1}}><Text style={styles.accountName}>{fullName(resetUser)}</Text><Text style={styles.email}>{resetUser.email}</Text></View></View>
              <Text style={styles.hint}>Yeni bir şifre belirleyin. Kullanıcının önceki oturumları geçersiz olacak.</Text>
              <Field label="Yeni şifre" value={newPassword} onChangeText={setNewPassword} secureTextEntry={!showResetPassword} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={!resetting} />
              <View style={styles.passwordHelp}><Text style={styles.passwordHint}>En az 8 karakter</Text><TouchableOpacity accessibilityRole="button" onPress={() => setShowResetPassword(value => !value)} style={styles.passwordToggle}><Text style={s.link}>{showResetPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}</Text></TouchableOpacity></View>
              {!!resetError && <Text accessibilityRole="alert" style={styles.error}>{resetError}</Text>}
              <View style={styles.modalActions}><Button title="Vazgeç" outline onPress={closeReset} disabled={resetting} /><Button title={resetting ? 'Kaydediliyor…' : 'Şifreyi güncelle'} onPress={resetPassword} disabled={resetting} /></View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>}
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#f4f6fb'}, content: {padding: 20, paddingBottom: 40}, shell: {width: '100%', maxWidth: 1200, alignSelf: 'center'},
  back: {alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginBottom: 12}, backText: {fontSize: 13, fontWeight: '600', color: '#697b99'},
  hero: {backgroundColor: '#172a4c', padding: 28, borderRadius: 22}, heroTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'},
  heroEyebrow: {fontSize: 10, letterSpacing: 2, fontWeight: '800', color: '#9aadd2'}, heroBadge: {flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 20, borderWidth: 1, borderColor: '#415375', paddingHorizontal: 12, paddingVertical: 7},
  heroBadgeDot: {width: 6, height: 6, borderRadius: 3, backgroundColor: '#82c6ad'}, heroBadgeText: {fontSize: 11, color: '#dce6f8', fontWeight: '600'},
  heroTitle: {fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -0.7, marginTop: 20}, heroDescription: {fontSize: 13, lineHeight: 21, color: '#b5c3dc', marginTop: 9, maxWidth: 600},
  stats: {flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 24}, statCard: {flex: 1, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#e5eaf3', backgroundColor: '#fff'},
  statIndicator: {width: 26, height: 26, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginBottom: 14}, statDot: {width: 8, height: 8, borderRadius: 4},
  statValue: {fontSize: 27, color: '#223451', fontWeight: '800'}, statLabel: {fontSize: 12, color: '#8290a7', marginTop: 5},
  directory: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5eaf3', borderRadius: 20, overflow: 'hidden'},
  directoryHeader: {padding: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap'},
  directoryTitle: {fontSize: 19, fontWeight: '800', color: '#263653'}, directoryDescription: {fontSize: 12, color: '#8794aa', marginTop: 5}, createButton: {paddingHorizontal: 18, minHeight: 44, borderRadius: 10},
  toolbar: {paddingHorizontal: 24, flexDirection: 'row', gap: 10, marginBottom: 20}, searchBox: {flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7f9fc', borderWidth: 1, borderColor: '#e8edf5', borderRadius: 11, paddingLeft: 14, minHeight: 46},
  searchIcon: {width: 18, height: 20, marginRight: 10}, searchRing: {width: 12, height: 12, borderWidth: 1.5, borderColor: '#8e9cb2', borderRadius: 6, marginTop: 2}, searchHandle: {width: 7, height: 1.5, backgroundColor: '#8e9cb2', position: 'absolute', left: 10, top: 14, transform: [{rotate: '45deg'}]},
  searchInput: {flex: 1, minWidth: 0, minHeight: 44, paddingVertical: 10, paddingRight: 12, color: '#263653', fontSize: 13}, clearSearch: {width: 42, height: 44, alignItems: 'center', justifyContent: 'center'},
  refreshButton: {width: 46, height: 46, borderWidth: 1, borderColor: '#e5eaf3', borderRadius: 11, justifyContent: 'center', alignItems: 'center'}, refreshIcon: {fontSize: 24, color: '#73829b'},
  filterBar: {paddingHorizontal: 24, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12},
  filters: {flexDirection: 'row', flexWrap: 'wrap', gap: 6}, filter: {flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, minHeight: 38, borderRadius: 8}, filterSelected: {backgroundColor: '#edf2ff'},
  filterLabel: {fontSize: 12, color: '#8190a6', fontWeight: '600'}, filterLabelSelected: {color: '#315be8'}, filterCount: {fontSize: 10, color: '#8d9ab0', backgroundColor: '#f0f3f8', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5, overflow: 'hidden'}, filterCountSelected: {color: '#315be8', backgroundColor: '#dfe8ff'},
  resultCount: {fontSize: 11, color: '#97a2b4'}, tableHeader: {flexDirection: 'row', backgroundColor: '#f8fafd', paddingVertical: 13, paddingHorizontal: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#edf1f7'},
  columnLabel: {fontSize: 9, letterSpacing: 1.1, color: '#8b99b0', fontWeight: '700'},
  account: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderColor: '#edf1f7'},
  accountInfo: {flex: 1, minWidth: 0, flexDirection: 'row', gap: 12, alignItems: 'center', paddingRight: 12},
  avatar: {width: 42, height: 42, borderRadius: 14, backgroundColor: '#edf2ff', alignItems: 'center', justifyContent: 'center'}, adminAvatar: {backgroundColor: '#f3edfc'}, avatarText: {fontSize: 14, color: '#315be8', fontWeight: '800'},
  nameRow: {flexDirection: 'row', gap: 7, alignItems: 'center'}, accountName: {fontSize: 14, fontWeight: '700', color: '#293a57', flexShrink: 1}, selfBadge: {fontSize: 9, color: '#8897b0', backgroundColor: '#f2f5f9', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, overflow: 'hidden'},
  email: {fontSize: 12, color: '#8a98ae', marginTop: 5}, accountMeta: {flexDirection: 'row', alignItems: 'center'},
  badge: {flexDirection: 'row', gap: 5, alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#eaf7f2', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 7}, adminBadge: {backgroundColor: '#f3edfc'},
  roleDot: {width: 5, height: 5, borderRadius: 3, backgroundColor: '#20957b'}, badgeText: {fontSize: 10, fontWeight: '700', color: '#268571'},
  date: {width: 110, fontSize: 11, color: '#8b99af'}, resetButton: {minHeight: 38, width: 146, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9},
  directoryFooter: {paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#fcfdff', flexDirection: 'row', alignItems: 'center', gap: 8},
  footerDot: {width: 5, height: 5, borderRadius: 3, backgroundColor: '#92a4c3'}, footerText: {fontSize: 11, color: '#91a0b6', flex: 1, lineHeight: 17},
  feedback: {padding: 32, alignItems: 'center', gap: 16}, feedbackText: {fontSize: 13, color: '#8795ab', lineHeight: 20, textAlign: 'center'},
  emptyCircle: {width: 48, height: 48, borderRadius: 16, backgroundColor: '#f1f5fc', alignItems: 'center', justifyContent: 'center'}, emptySymbol: {fontSize: 30, color: '#93a4c0'}, emptyTitle: {fontSize: 16, color: '#384b69', fontWeight: '700'},
  denied: {flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center'},
  modalBackdrop: {flex: 1, backgroundColor: 'rgba(12,25,48,0.5)'}, modalCenter: {flex: 1}, modalScroll: {flexGrow: 1, justifyContent: 'center', padding: 20},
  modalPanel: {width: '100%', maxWidth: 540, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 24, padding: 28},
  modalEyebrow: {fontSize: 10, fontWeight: '800', letterSpacing: 1.8, color: '#315be8', marginBottom: 10}, modalTitle: {fontSize: 25, color: '#223451', fontWeight: '800', marginBottom: 10, letterSpacing: -0.4},
  hint: {fontSize: 13, color: '#8795ab', lineHeight: 21, marginBottom: 24}, nameFields: {flexDirection: 'row', gap: 16},
  passwordHelp: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: -8, marginBottom: 12}, passwordHint: {fontSize: 11, color: '#94a0b3'}, passwordToggle: {minHeight: 44, justifyContent: 'center'},
  error: {fontSize: 13, lineHeight: 20, color: '#b42338', marginBottom: 16}, roleNotice: {flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, backgroundColor: '#f3f6fe', borderRadius: 9}, roleNoticeText: {flex: 1, color: '#7889a7', fontSize: 11, lineHeight: 18},
  modalActions: {flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10, marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderColor: '#edf1f7'},
  resetIdentity: {flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16, backgroundColor: '#f8fafd', borderRadius: 12, marginTop: 12, marginBottom: 20},
});

