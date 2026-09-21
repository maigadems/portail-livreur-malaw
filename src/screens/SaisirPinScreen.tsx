import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Fonts } from '../constants/theme';
import LivreurAvatar from '../components/LivreurAvatar';
import { login } from '../api/auth';

const PIN_LENGTH = 4;

const PAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

export default function SaisirPinScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const phone: string = route.params?.phone ?? '';
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleKey = (key: string) => {
    if (loading) return;
    setError('');
    if (key === '⌫') { setPin(p => p.slice(0, -1)); return; }
    if (key === '') return;
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + key;
    setPin(next);
    if (next.length === PIN_LENGTH) submitPin(next);
  };

  const submitPin = async (fullPin: string) => {
    setLoading(true);
    try {
      await login(phone, fullPin);
      // reset (pas replace) : le Dashboard devient la RACINE de la pile
      // authentifiée. Ainsi aucun "retour" depuis le dashboard ou le flux
      // de course ne peut revenir sur Connexion/SaisirPin.
      navigation.reset({ index: 0, routes: [{ name: 'DashboardEnLigne' }] });
    } catch (e: any) {
      setError(e?.message ?? 'Numéro ou code PIN incorrect');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <LivreurAvatar size={96} borderWidth={3} />

        <View style={styles.titleBlock}>
          <Text style={styles.welcomeBack}>BON RETOUR</Text>
          <Text style={styles.name}>{phone || 'Livreur'}</Text>
          <Text style={styles.subtitle}>Entrez votre code PIN pour accéder{'\n'}à votre espace livreur.</Text>
        </View>

        <View style={styles.dotsRow}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < pin.length ? styles.dotFilled : styles.dotEmpty,
                i === pin.length && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.goldLight} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <View style={{ height: 20 }} />
        )}

        <View style={styles.pad}>
          {PAD.map((row, ri) => (
            <View key={ri} style={styles.padRow}>
              {row.map((key, ki) => (
                <TouchableOpacity
                  key={ki}
                  style={[styles.padKey, key === '' && styles.padKeyEmpty]}
                  onPress={() => handleKey(key)}
                  activeOpacity={key ? 0.7 : 1}
                  disabled={key === '' || loading}
                >
                  <Text style={styles.padKeyText}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.forgotLink} onPress={() => navigation.navigate('Aide')}>
          <Text style={styles.forgotText}>Code oublié ? Contacter le support</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.deepBlack },
  header: { height: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24 },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { fontSize: 20, color: Colors.cream },
  content: {
    flex: 1, alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16,
    justifyContent: 'space-between',
  },
  titleBlock: { alignItems: 'center', gap: 6 },
  welcomeBack: {
    fontSize: 12, color: Colors.goldLight,
    fontFamily: Fonts.manrope.bold, letterSpacing: 1.5,
  },
  name: {
    fontSize: 24, color: Colors.cream,
    fontFamily: Fonts.epilogue.bold,
  },
  subtitle: {
    fontSize: 13, color: Colors.greenMid,
    fontFamily: Fonts.manrope.regular, textAlign: 'center',
    lineHeight: 20, marginTop: 4,
  },
  dotsRow: { flexDirection: 'row', gap: 20 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  dotEmpty: { borderWidth: 2, borderColor: 'rgba(169,208,182,0.3)', backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: Colors.goldLight, borderWidth: 0 },
  dotActive: { borderColor: Colors.goldLight, borderWidth: 2 },
  errorText: {
    fontSize: 13, color: Colors.errorLight,
    fontFamily: Fonts.manrope.semiBold, textAlign: 'center',
  },
  pad: { width: '100%', maxWidth: 300, gap: 10 },
  padRow: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  padKey: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.cardDark,
    borderWidth: 1, borderColor: 'rgba(169,208,182,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  padKeyEmpty: { backgroundColor: 'transparent', borderWidth: 0 },
  padKeyText: {
    fontSize: 26, color: Colors.cream,
    fontFamily: Fonts.epilogue.semiBold,
  },
  forgotLink: { paddingVertical: 4 },
  forgotText: {
    fontSize: 13, color: Colors.greenMid,
    fontFamily: Fonts.manrope.medium,
    textDecorationLine: 'underline',
  },
});
