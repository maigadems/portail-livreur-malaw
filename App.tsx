import React, { useCallback } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  Epilogue_400Regular,
  Epilogue_500Medium,
  Epilogue_600SemiBold,
  Epilogue_700Bold,
  Epilogue_800ExtraBold,
  Epilogue_900Black,
} from '@expo-google-fonts/epilogue';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import Navigation from './src/navigation';
import SessionExpiredModal from './src/components/SessionExpiredModal';
import AppAlertHost from './src/components/AppAlert';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Epilogue_400Regular,
    Epilogue_500Medium,
    Epilogue_600SemiBold,
    Epilogue_700Bold,
    Epilogue_800ExtraBold,
    Epilogue_900Black,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  const onLayout = useCallback(async () => {
    if (fontsLoaded || fontError) await SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={onLayout}>
        <StatusBar style="light" />
        <Navigation />
        <SessionExpiredModal />
        {/* Hôte des boîtes de dialogue : monté après le navigateur pour
            s'afficher au-dessus de n'importe quel écran. */}
        <AppAlertHost />
      </View>
    </SafeAreaProvider>
  );
}
