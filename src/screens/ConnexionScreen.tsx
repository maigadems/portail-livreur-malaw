import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts, Radii } from '../constants/theme';
import Button from '../components/ui/Button';
import { FieldLabel } from '../components/ui/Input';
import { courierExists } from '../api/auth';

export default function ConnexionScreen() {
  const navigation = useNavigation<any>();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const raw = phone.replace(/\D/g, '');
    const local = raw.startsWith('221') ? raw.slice(3) : raw;
    // Mobile sénégalais : 9 chiffres commençant par 7 (70/75/76/77/78).
    if (!/^7[0-8]\d{7}$/.test(local)) {
      setNotFound(false);
      setError('Entrez un numéro de mobile sénégalais valide (ex : 77 123 45 67).');
      return;
    }
    const fullPhone = `+221${local}`;
    setError('');
    setNotFound(false);
    setLoading(true);
    try {
      // Vérifie qu'un compte livreur existe avant de demander le PIN.
      const { exists } = await courierExists(fullPhone);
      if (!exists) {
        setNotFound(true);
        return;
      }
      navigation.navigate('SaisirPin', { phone: fullPhone });
    } catch (e: any) {
      setError(e?.message ?? 'Impossible de vérifier le numéro. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero image livreur */}
          <View style={styles.heroSection}>
            <View style={styles.heroImageContainer}>
              <Image
                source={require('../../assets/images/livreur-hero.jpg')}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', Colors.deepBlack]}
                style={styles.heroGradient}
              />
            </View>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroTitle}>Bon retour !</Text>
              <Text style={styles.heroSubtitle}>
                Connectez-vous pour commencer vos courses aujourd'hui à Dakar.
              </Text>
            </View>
          </View>

          {/* Form card */}
          <View style={styles.formCard}>
            <View style={styles.fieldGroup}>
              <FieldLabel>NUMÉRO DE TÉLÉPHONE</FieldLabel>
              <View style={styles.phoneRow}>
                {/* Préfixe drapeau + indicatif */}
                <View style={styles.prefixBox}>
                  <View style={styles.flagContainer}>
                    <View style={[styles.flagStripe, { backgroundColor: '#00853F' }]} />
                    <View style={[styles.flagStripe, { backgroundColor: '#FDEF42' }]} />
                    <View style={[styles.flagStripe, { backgroundColor: '#E31B23' }]} />
                    <Text style={styles.flagStar}>★</Text>
                  </View>
                  <Text style={styles.dialCode}>+221</Text>
                </View>
                {/* Champ numéro */}
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={(v) => { setPhone(v); setError(''); setNotFound(false); }}
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

            {/* Compte introuvable → invite à s'inscrire */}
            {notFound ? (
              <View style={styles.notFoundCard}>
                <Text style={styles.notFoundTitle}>Compte introuvable</Text>
                <Text style={styles.notFoundText}>
                  Aucun compte livreur n'est associé à ce numéro. Inscrivez-vous pour rejoindre Malaw.
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Inscription')} style={styles.notFoundBtn}>
                  <Text style={styles.notFoundBtnText}>S'inscrire →</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Button label="Continuer" onPress={handleContinue} loading={loading} />

            {/* Lien inscription */}
            <View style={styles.signupLink}>
              <Text style={styles.signupText}>Pas encore livreur ? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Inscription')}>
                <Text style={styles.signupUnderlineText}>S'inscrire</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.securedText}>SÉCURISÉ PAR MALAW CORP.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.deepBlack },
  scrollContent: { paddingBottom: 40 },
  heroSection: { paddingHorizontal: 24, paddingTop: 8 },
  heroImageContainer: {
    height: 240,
    borderRadius: Radii.xxl,
    overflow: 'hidden',
    backgroundColor: Colors.cardDark,
  },
  heroImage: { width: '100%', height: '100%' },
  heroGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 100,
  },
  heroTextBlock: { marginTop: 20, gap: 8 },
  heroTitle: {
    fontSize: 30,
    fontFamily: Fonts.epilogue.bold,
    color: Colors.cream,
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: Fonts.manrope.medium,
    color: Colors.greenMid,
    lineHeight: 22,
  },
  formCard: {
    marginTop: 28,
    marginHorizontal: 24,
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
    height: 56,
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(169,208,182,0.15)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flagContainer: {
    width: 28,
    height: 20,
    borderRadius: 2,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagStripe: { flex: 1, height: '100%' },
  flagStar: {
    position: 'absolute',
    color: '#00853F',
    fontSize: 10,
    lineHeight: 10,
    textAlign: 'center',
  },
  dialCode: {
    fontSize: 15,
    fontFamily: Fonts.manrope.bold,
    color: Colors.cream,
  },
  inputBox: {
    flex: 1,
    height: 56,
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(169,208,182,0.15)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  input: {
    fontSize: 16,
    fontFamily: Fonts.manrope.regular,
    color: Colors.cream,
  },
  errorText: {
    fontSize: 13,
    fontFamily: Fonts.manrope.semiBold,
    color: Colors.errorLight,
  },
  notFoundCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.35)',
    padding: 16,
    gap: 8,
  },
  notFoundTitle: {
    fontSize: 15,
    fontFamily: Fonts.epilogue.bold,
    color: Colors.errorLight,
  },
  notFoundText: {
    fontSize: 13,
    fontFamily: Fonts.manrope.regular,
    color: Colors.greenMid,
    lineHeight: 19,
  },
  notFoundBtn: { alignSelf: 'flex-start', marginTop: 2 },
  notFoundBtnText: {
    fontSize: 15,
    fontFamily: Fonts.manrope.bold,
    color: Colors.goldLight,
  },
  signupLink: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signupText: {
    fontSize: 15,
    fontFamily: Fonts.manrope.medium,
    color: Colors.greenMid,
  },
  signupUnderlineText: {
    fontSize: 15,
    fontFamily: Fonts.manrope.bold,
    color: Colors.goldLight,
  },
  securedText: {
    fontSize: 10,
    fontFamily: Fonts.manrope.bold,
    color: Colors.dimText,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 28,
  },
});
