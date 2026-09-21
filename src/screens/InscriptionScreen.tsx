import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MalawLogo from '../components/MalawLogo';
import { Colors, Fonts } from '../constants/theme';
import Button from '../components/ui/Button';
import { FieldLabel } from '../components/ui/Input';
import { sendOtp } from '../api/auth';

export default function InscriptionScreen() {
  const navigation = useNavigation<any>();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const raw = phone.replace(/\D/g, '');
    const local = raw.startsWith('221') ? raw.slice(3) : raw;
    if (!/^7[0-8]\d{7}$/.test(local)) {
      setError('Entrez un numéro de mobile sénégalais valide (ex : 77 123 45 67).');
      return;
    }
    const fullPhone = `+221${local}`;
    setError('');
    setLoading(true);
    try {
      const res = await sendOtp(fullPhone);
      navigation.navigate('OTP', { phone: fullPhone, isNewUser: true, devOtp: res?.devOtp });
    } catch (e: any) {
      setError(e?.message ?? "Impossible d'envoyer le code. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoBlock}>
            <View style={styles.logoBg}>
              <MalawLogo size={64} />
            </View>
            <Text style={styles.brandSub}>Espace Livreur</Text>
          </View>

          {/* Heading */}
          <View style={styles.headingBlock}>
            <Text style={styles.heading}>Rejoignez l'équipe Malaw</Text>
            <Text style={styles.subheading}>
              Livrez avec nous à Dakar. Créez votre compte livreur en quelques étapes.
            </Text>
          </View>

          {/* Form card */}
          <View style={styles.formCard}>
            <View style={styles.fieldGroup}>
              <FieldLabel>NUMÉRO DE TÉLÉPHONE</FieldLabel>
              <View style={styles.phoneRow}>
                <View style={styles.prefixBox}>
                  <View style={styles.flagContainer}>
                    <View style={[styles.flagStripe, { backgroundColor: '#00853F' }]} />
                    <View style={[styles.flagStripe, { backgroundColor: '#FDEF42' }]} />
                    <View style={[styles.flagStripe, { backgroundColor: '#E31B23' }]} />
                    <Text style={styles.flagStar}>★</Text>
                  </View>
                  <Text style={styles.dialCode}>+221</Text>
                </View>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={(v) => { setPhone(v); setError(''); }}
                    placeholder="7X XXX XX XX"
                    placeholderTextColor={Colors.dimText}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    maxLength={9}
                  />
                </View>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button label="Recevoir le code" onPress={handleSendOtp} loading={loading} />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà partenaire ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Connexion')}>
              <Text style={styles.footerLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.deepBlack },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  logoBlock: { alignItems: 'center', gap: 8, marginBottom: 28 },
  logoBg: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.cardDark,
    borderWidth: 1, borderColor: 'rgba(244,189,97,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  brandSub: {
    fontSize: 13, color: Colors.goldLight,
    fontFamily: Fonts.manrope.semiBold,
  },
  headingBlock: { gap: 10, marginBottom: 24, alignItems: 'center' },
  heading: {
    fontSize: 28, color: Colors.cream,
    fontFamily: Fonts.epilogue.bold, textAlign: 'center',
  },
  subheading: {
    fontSize: 14, color: Colors.greenMid,
    fontFamily: Fonts.manrope.medium, textAlign: 'center', lineHeight: 21,
  },
  formCard: {
    backgroundColor: Colors.cardDark,
    borderRadius: 24,
    padding: 24,
    gap: 20,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
  },
  fieldGroup: { gap: 8 },
  phoneRow: { flexDirection: 'row', gap: 8 },
  prefixBox: {
    height: 56, backgroundColor: Colors.darkCard,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(169,208,182,0.15)',
    paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  flagContainer: {
    width: 28, height: 20, borderRadius: 2, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  flagStripe: { flex: 1, height: '100%' },
  flagStar: { position: 'absolute', color: '#00853F', fontSize: 10, lineHeight: 10, textAlign: 'center' },
  dialCode: { fontSize: 15, fontFamily: Fonts.manrope.bold, color: Colors.cream },
  inputBox: {
    flex: 1, height: 56, backgroundColor: Colors.darkCard,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(169,208,182,0.15)',
    justifyContent: 'center', paddingHorizontal: 16,
  },
  input: { fontSize: 16, fontFamily: Fonts.manrope.regular, color: Colors.cream },
  errorText: { fontSize: 13, fontFamily: Fonts.manrope.semiBold, color: Colors.errorLight },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 28 },
  footerText: { fontSize: 15, fontFamily: Fonts.manrope.medium, color: Colors.greenMid },
  footerLink: { fontSize: 15, fontFamily: Fonts.manrope.bold, color: Colors.goldLight },
});
