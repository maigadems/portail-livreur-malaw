import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Dimensions, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import { confirmDelivery, getOrder } from '../api/orders';

const { width } = Dimensions.get('window');
const CODE_LENGTH = 4;

export default function CodeConfirmationLivraisonScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { orderId } = route.params ?? {};
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!orderId) return;
    getOrder(orderId).then((o: any) => { if (active) setOrder(o); }).catch(() => {});
    return () => { active = false; };
  }, [orderId]));

  const clientName = order?.customer?.name ?? 'Client';
  const clientAddress = order?.deliveryAddress?.line ?? '';

  const handleChange = (val: string, idx: number) => {
    if (!/^\d*$/.test(val)) return;
    setError(false);
    const next = [...code];
    next[idx] = val.slice(-1);
    setCode(next);
    if (val && idx < CODE_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleConfirm = async () => {
    if (verifying) return;
    const entered = code.join('');
    setVerifying(true);
    try {
      // Vérifié côté serveur (bcrypt contre le hash généré à
      // READY_FOR_PICKUP) — jamais comparé en clair côté client.
      await confirmDelivery(orderId, entered);
      navigation.replace('ConfirmationLivraison');
    } catch (e: any) {
      setError(true);
      setErrorMessage(e?.status === 401 ? 'Code incorrect' : (e?.message ?? 'Code incorrect'));
      setAttempts(a => a + 1);
      setCode(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const filled = code.every(d => d !== '');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* TopBar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('DashboardEnLigne'))} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Code de livraison</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Step indicator */}
          <View style={styles.stepIndicator}>
            <View style={styles.stepDot} />
            <Text style={styles.stepText}>ÉTAPE 2/2 · LIVRAISON</Text>
          </View>

          {/* Client card */}
          <View style={styles.clientCard}>
            <View style={styles.clientAvatar}>
              <Text style={{ fontSize: 28 }}>👤</Text>
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{clientName}</Text>
              {clientAddress ? <Text style={styles.clientAddress}>{clientAddress}</Text> : null}
            </View>
            <View style={styles.deliveredTag}>
              <Text style={styles.deliveredTagText}>EN ATTENTE</Text>
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructionBlock}>
            <Text style={styles.instructionTitle}>Demandez le code au client</Text>
            <Text style={styles.instructionDesc}>
              Le client a reçu un code à 4 chiffres sur son application.
              Saisissez-le ici pour confirmer la livraison.
            </Text>
          </View>

          {/* Code inputs */}
          <View style={styles.codeRow}>
            {code.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={r => { inputRefs.current[idx] = r; }}
                style={[
                  styles.codeInput,
                  digit ? styles.codeInputFilled : styles.codeInputEmpty,
                  error && styles.codeInputError,
                  idx === code.findIndex(d => !d) && !error && styles.codeInputActive,
                ]}
                value={digit}
                onChangeText={v => handleChange(v, idx)}
                onKeyPress={e => handleKeyPress(e, idx)}
                keyboardType="numeric"
                maxLength={1}
                textAlign="center"
                autoFocus={idx === 0}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Error message */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMessage} — Réessayez</Text>
            </View>
          )}

          {/* Security note */}
          <View style={styles.secNote}>
            <Text style={styles.secNoteIcon}>🔒</Text>
            <Text style={styles.secNoteText}>
              Ce code garantit que la commande est bien remise au bon client
            </Text>
          </View>

          {/* Bottom buttons inside scroll so they stay visible above keyboard */}
          <View style={styles.bottomArea}>
            <TouchableOpacity
              style={[styles.confirmBtn, (!filled || verifying) && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              activeOpacity={filled ? 0.85 : 1}
              disabled={!filled || verifying}
            >
              <View style={styles.confirmBtnShadow} />
              {verifying ? (
                <ActivityIndicator color="rgb(67,44,0)" />
              ) : (
                <>
                  <Text style={[styles.confirmBtnText, !filled && { opacity: 0.4 }]}>
                    Valider la livraison
                  </Text>
                  {filled && <Text style={{ color: 'rgb(67,44,0)', fontSize: 18 }}>✓</Text>}
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cantGetCodeBtn}
              onPress={() => navigation.navigate('ClientIntrouvable')}
            >
              <Text style={styles.cantGetCodeText}>Le client ne me donne pas le code</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.nearBlack },
  inner: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 20,
  },
  topBar: {
    height: 72,
    backgroundColor: Colors.darkCard,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(65,72,67,0.3)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(169,208,182,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 18, color: Colors.gold, fontWeight: '700' },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: Colors.successDark,
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  stepText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: Radii.xl,
    backgroundColor: Colors.darkGreen,
    borderWidth: 1,
    borderColor: Colors.goldLight,
    padding: 18,
  },
  clientAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientInfo: { flex: 1, gap: 3 },
  clientName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  clientAddress: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  deliveredTag: {
    borderRadius: 9999,
    backgroundColor: 'rgba(244,189,97,0.2)',
    borderWidth: 1,
    borderColor: Colors.goldLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deliveredTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  instructionBlock: {
    gap: 8,
    alignItems: 'center',
  },
  instructionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  instructionDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 22,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  codeInput: {
    width: (width - 48 - 42) / CODE_LENGTH,
    height: 80,
    borderRadius: Radii.md,
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'Manrope_500Medium',
  },
  codeInputEmpty: {
    backgroundColor: Colors.darkCard,
    borderWidth: 2,
    borderColor: 'rgba(169,208,182,0.2)',
    color: Colors.greenLight,
  },
  codeInputFilled: {
    backgroundColor: Colors.darkGreen,
    borderWidth: 2,
    borderColor: Colors.greenMid,
    color: Colors.cream,
  },
  codeInputActive: {
    borderColor: Colors.goldLight,
    borderWidth: 2,
  },
  codeInputError: {
    borderColor: Colors.error,
    backgroundColor: 'rgba(192,57,43,0.15)',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  errorIcon: { fontSize: 16 },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
  },
  secNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    opacity: 0.5,
  },
  secNoteIcon: { fontSize: 12 },
  secNoteText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  bottomArea: {
    gap: 10,
    marginTop: 8,
  },
  confirmBtn: {
    height: 72,
    borderRadius: Radii.xl,
    backgroundColor: Colors.goldLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  confirmBtnDisabled: {
    backgroundColor: 'rgba(244,189,97,0.25)',
  },
  confirmBtnShadow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.white,
    opacity: 0.08,
  },
  confirmBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
  cantGetCodeBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cantGetCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
    textDecorationLine: 'underline',
  },
});
