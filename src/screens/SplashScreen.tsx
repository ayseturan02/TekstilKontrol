import React from 'react';
import {Image, StatusBar, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

export default function SplashScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Image
        source={require('../assets/itg-logo.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="internet tekstil"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: '100%',
    maxWidth: 300,
    aspectRatio: 1,
  },
});
