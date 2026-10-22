import React from 'react';
import {SafeAreaProvider, initialWindowMetrics} from 'react-native-safe-area-context';
import {AppProvider} from './context/AppContext';
import AppRouter from './navigation/AppRouter';
export default function App() {
  return <SafeAreaProvider initialMetrics={initialWindowMetrics}><AppProvider><AppRouter /></AppProvider></SafeAreaProvider>;
}
