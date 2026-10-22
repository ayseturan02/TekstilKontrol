import {SafeAreaView} from 'react-native-safe-area-context';
import React, {useState} from 'react';
import {KeyboardAvoidingView, Platform, ScrollView, StatusBar, Text, TouchableOpacity, useWindowDimensions, View} from 'react-native';
import {Field, Button} from '../components/Form';
import {useApp} from '../context/AppContext';
import {s} from '../styles';

export default function LoginScreen() {
  const {email, setEmail, password, setPassword, busy, login, loginError} = useApp();
  const {width} = useWindowDimensions();
  const tablet = width >= 600;
  const inputStyle = tablet ? {minHeight: 76, fontSize: 22, paddingHorizontal: 22, borderRadius: 14} : {minHeight: 56, fontSize: 17};
  const labelStyle = tablet ? {fontSize: 17, marginBottom: 12} : {fontSize: 14};
  const [showPassword, setShowPassword] = useState(false);
  const canLogin = !busy && !!email.trim() && !!password;

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f5fa" />
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.login} keyboardShouldPersistTaps="handled">
          <View style={s.loginShell}>
            <View style={[s.loginForm, !tablet && {paddingHorizontal: 24, paddingVertical: 32}]}>
              <View style={s.loginAccent} />
              <Text style={[s.loginCompany, !tablet && {fontSize: 24}]}>İNTERNET TEKSTİL</Text>
              <Text style={[s.loginCompanyDetail, !tablet && {fontSize: 12}]}>SANAYİ VE TİCARET A.Ş.</Text>
              <View style={s.loginFields}>
                <Field inputStyle={inputStyle} labelStyle={labelStyle} containerStyle={{marginBottom: tablet ? 28 : 18}} label="E-posta adresi" value={email} onChangeText={setEmail}
                  keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
                <Field inputStyle={inputStyle} labelStyle={labelStyle} label="Şifre" value={password} onChangeText={setPassword}
                  secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false}
                  autoComplete="current-password" returnKeyType="go" onSubmitEditing={canLogin ? login : undefined} />
                <TouchableOpacity style={[s.passwordToggle, tablet && {minHeight: 56, marginBottom: 16}]} accessibilityRole="button"
                  onPress={() => setShowPassword(value => !value)}>
                  <Text style={[s.link, tablet && {fontSize: 16}]}>{showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}</Text>
                </TouchableOpacity>
                {!!loginError && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{color: '#b42338', fontSize: tablet ? 17 : 14, lineHeight: tablet ? 25 : 21, marginBottom: 20}}>{loginError}</Text>}
                <Button style={{minHeight: tablet ? 76 : 56, borderRadius: 14}} textStyle={{fontSize: tablet ? 21 : 17}} title={busy ? 'Giriş yapılıyor…' : 'Giriş yap'} onPress={login} disabled={!canLogin} />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
