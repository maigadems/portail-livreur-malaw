import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Dimensions, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Fonts, Radii } from '../constants/theme';
import Button from '../components/ui/Button';
import { sendOtp } from '../api/auth';

const { width } = Dimensions.get('window');
const OTP_LENGTH = 6;

// Inscription livreur : on ne vérifie PAS l'OTP ici (register-courier le fera
// avec le nom + PIN). On collecte juste le code et on l'emmène en param.
export default function OTPScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const phone: string = route.params?.phone ?? '';
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(59);
  const [canResend, setCanResend] = useState(false);
  const [devOtp, setDevOtp] = useState<string | undefined>(route.params?.devOtp);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown === 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (val: string, idx: number) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < OTP_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleResend = async () => {
    setOtp(Array(OTP_LENGTH).fill(''));
    setCountdown(59);
    setCanResend(false);
    inputRefs.current[0]?.focus();
    try {
      const res = await sendOtp(phone);
      setDevOtp(res?.devOtp);
    } catch { /* silencieux */ }
  };

  const filled = otp.every(d => d !== '');

  const submit = () => {
    if (!filled) return;
    navigation.replace('ProfilInscription', { phone, otp: otp.join('') });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerBlock}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>📱</Text>
            </View>
            <Text style={styles.title}>Vérification SMS</Text>
            <Text style={styles.subtitle}>
              Un code à 6 chiffres a été envoyé au{'\n'}
              <Text style={styles.phoneHighlight}>{phone || '+221 77 XXX XX XX'}</Text>
            </Text>
            {devOtp ? (
              <View style={styles.devOtpBadge}>
                <Text style={styles.devOtpText}>Code (démo) : {devOtp}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.otpRow}>
            {otp.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={r => { inputRefs.current[idx] = r; }}
                style={[
                  styles.otpInput,
                  digit ? styles.otpInputFilled : styles.otpInputEmpty,
                  idx === otp.findIndex(d => !d) && styles.otpInputActive,
                ]}
                value={digit}
                onChangeText={v => handleChange(v, idx)}
                onKeyPress={e => handleKeyPress(e, idx)}
                keyboardType="numeric"
                maxLength={1}
                textAlign="center"
                autoFocus={idx === 0}
                selectTextOnFocus
                // Autofill du code reçu par SMS (proposé sur la 1re case).
                autoComplete={idx === 0 ? 'sms-otp' : 'off'}
                textContentType={idx === 0 ? 'oneTimeCode' : 'none'}
              />
            ))}
          </View>

          <View style={styles.resendRow}>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendActive}>Renvoyer le code</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendCountdown}>
                Renvoyer dans <Text style={styles.resendTimer}>00:{countdown.toString().padStart(2, '0')}</Text>
              </Text>
            )}
          </View>

          <Button label="Confirmer le code" onPress={submit} disabled={!filled} />

          <View style={styles.securityNote}>
            <Text style={styles.securityIcon}>🔒</Text>
            <Text style={styles.securityText}>Code valable 10 minutes — Ne partagez jamais votre code</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.deepBlack },
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, gap: 28 },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { fontSize: 20, color: Colors.cream },
  headerBlock: { alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.cardDark,
    borderWidth: 1, borderColor: 'rgba(244,189,97,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconEmoji: { fontSize: 34 },
  title: { fontSize: 26, color: Colors.cream, fontFamily: Fonts.epilogue.bold, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.greenMid, fontFamily: Fonts.manrope.medium, textAlign: 'center', lineHeight: 21 },
  phoneHighlight: { fontFamily: Fonts.manrope.bold, color: Colors.cream },
  devOtpBadge: {
    marginTop: 4, backgroundColor: 'rgba(244,189,97,0.15)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  devOtpText: { fontSize: 13, fontFamily: Fonts.manrope.bold, color: Colors.goldLight },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  otpInput: {
    width: (width - 48 - 50) / OTP_LENGTH, height: 60,
    borderRadius: 12, fontSize: 24,
    fontFamily: Fonts.epilogue.bold,
  },
  otpInputEmpty: {
    backgroundColor: Colors.cardDark, borderWidth: 1.5,
    borderColor: 'rgba(169,208,182,0.2)', color: Colors.cream,
  },
  otpInputFilled: {
    backgroundColor: Colors.goldLight, borderWidth: 1.5,
    borderColor: Colors.goldLight, color: '#13351F',
  },
  otpInputActive: { borderColor: Colors.goldLight, borderWidth: 2, backgroundColor: Colors.cardDark, color: Colors.cream },
  resendRow: { alignItems: 'center' },
  resendCountdown: { fontSize: 14, color: Colors.greenMid, fontFamily: Fonts.manrope.medium },
  resendTimer: { fontFamily: Fonts.manrope.bold, color: Colors.cream },
  resendActive: { fontSize: 15, color: Colors.goldLight, fontFamily: Fonts.manrope.bold, textDecorationLine: 'underline' },
  securityNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0.7 },
  securityIcon: { fontSize: 12 },
  securityText: { fontSize: 12, color: Colors.greenMid, fontFamily: Fonts.manrope.medium, textAlign: 'center' },
});
