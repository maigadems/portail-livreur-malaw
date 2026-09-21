import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Fonts } from '../constants/theme';
import { registerCourier } from '../api/auth';
import { Alert } from '../components/AppAlert';

const PIN_LENGTH = 4;

const PAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

export default function CreerPinScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = route.params ?? {};
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const current = pin;

  const finishSignup = async (fullPin: string) => {
    setLoading(true);
    try {
      // Inscription réelle : register-courier vérifie l'OTP, crée le compte
      // COURIER (+ véhicule) et pose la session.
      await registerCourier({
        phone: params.phone,
        otp: params.otp,
        name: params.name,
        pin: fullPin,
        vehicleType: params.vehicleType,
        vehicleBrand: params.vehicleBrand,
        vehiclePlate: params.vehiclePlate,
        avatarUrl: params.avatarUrl,
      });
      navigation.reset({ index: 0, routes: [{ name: 'DashboardEnLigne' }] });
    } catch (e: any) {
      // Compte livreur déjà existant (409) : on propose d'aller se connecter
      // plutôt que de laisser réessayer une inscription qui échouera toujours.
      if (e?.status === 409) {
        Alert.alert(
          'Compte déjà existant',
          e?.message ?? 'Un compte livreur existe déjà avec ce numéro.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Se connecter', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Connexion' }] }) },
          ],
        );
      } else {
        setError(e?.message ?? "L'inscription a échoué. Réessayez.");
      }
      setPin('');
      setStep('create');
      setFirstPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (key: string) => {
    if (loading) return;
    setError('');
    if (key === '⌫') { setPin(p => p.slice(0, -1)); return; }
    if (key === '') return;
    if (current.length >= PIN_LENGTH) return;
    const next = current + key;
    setPin(next);
    if (next.length === PIN_LENGTH) {
      setTimeout(() => {
        if (step === 'create') {
          setFirstPin(next);
          setPin('');
          setStep('confirm');
        } else if (next === firstPin) {
          finishSignup(next);
        } else {
          setError('Les codes ne correspondent pas. Réessayez.');
          setPin('');
          setStep('create');
          setFirstPin('');
        }
      }, 180);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressStep}>DERNIÈRE ÉTAPE</Text>
          <Text style={styles.progressPct}>{step === 'create' ? '80%' : '95%'}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: step === 'create' ? '80%' : '95%' }]} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.iconRing}>
          <Text style={styles.iconEmoji}>🔒</Text>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>
            {step === 'create' ? 'Créez votre code PIN' : 'Confirmez votre PIN'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'create'
              ? 'Ce code de 4 chiffres sécurise\nvotre accès à l\'application.'
              : 'Saisissez à nouveau votre PIN\npour le confirmer.'}
          </Text>
        </View>

        <View style={styles.dotsRow}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < current.length ? styles.dotFilled : styles.dotEmpty,
                i === current.length && styles.dotActive,
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
  progressSection: { paddingHorizontal: 24, gap: 10, marginBottom: 8 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressStep: {
    fontSize: 12, color: Colors.goldLight,
    fontFamily: Fonts.manrope.bold, letterSpacing: 0.5,
  },
  progressPct: {
    fontSize: 18, color: Colors.cream,
    fontFamily: Fonts.epilogue.bold,
  },
  progressTrack: {
    height: 6, borderRadius: 9999,
    backgroundColor: 'rgba(169,208,182,0.15)', overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 9999, backgroundColor: Colors.goldLight },
  content: {
    flex: 1, alignItems: 'center', paddingHorizontal: 24,
    paddingTop: 8, paddingBottom: 16, justifyContent: 'space-between',
  },
  iconRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.cardDark,
    borderWidth: 1, borderColor: 'rgba(244,189,97,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconEmoji: { fontSize: 32 },
  titleBlock: { alignItems: 'center', gap: 6 },
  title: {
    fontSize: 24, color: Colors.cream,
    fontFamily: Fonts.epilogue.bold, textAlign: 'center',
  },
  subtitle: {
    fontSize: 13, color: Colors.greenMid,
    fontFamily: Fonts.manrope.regular, textAlign: 'center', lineHeight: 20,
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
});
