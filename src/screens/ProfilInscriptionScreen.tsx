import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Fonts } from '../constants/theme';
import Button from '../components/ui/Button';
import Input, { FieldLabel } from '../components/ui/Input';
import { pickAvatar } from '../utils/pickAvatar';
import { Alert } from '../components/AppAlert';

const VEHICLES: { id: string; label: string; icon: string }[] = [
  { id: 'moto', label: 'Moto', icon: '🏍️' },
  { id: 'velo', label: 'Vélo', icon: '🚲' },
  { id: 'voiture', label: 'Voiture', icon: '🚗' },
];

export default function ProfilInscriptionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { phone, otp } = route.params ?? {};
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [vehicleType, setVehicleType] = useState('moto');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handlePickAvatar = async () => {
    try {
      const uri = await pickAvatar();
      if (uri) setAvatar(uri);
    } catch (e: any) {
      Alert.alert('Photo de profil', e?.message ?? "Impossible de choisir la photo.");
    }
  };

  const handleContinue = () => {
    const name = `${prenom.trim()} ${nom.trim()}`.trim();
    if (name.length < 2) {
      setError('Entrez votre prénom et votre nom.');
      return;
    }
    navigation.navigate('CreerPin', {
      phone, otp, name, vehicleType,
      vehicleBrand: vehicleBrand.trim() || undefined,
      vehiclePlate: vehiclePlate.trim() || undefined,
      avatarUrl: avatar || undefined,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressStep}>VOTRE PROFIL</Text>
              <Text style={styles.progressPct}>60%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '60%' }]} />
            </View>
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.title}>Votre profil</Text>
            <Text style={styles.subtitle}>Ces informations permettront aux clients de vous identifier.</Text>
          </View>

          {/* Photo de profil (optionnelle) */}
          <View style={styles.avatarBlock}>
            <TouchableOpacity style={styles.avatarPicker} onPress={handlePickAvatar} activeOpacity={0.8}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarIcon}>📷</Text>
              )}
              <View style={styles.avatarBadge}>
                <Text style={styles.avatarBadgeText}>{avatar ? '✎' : '+'}</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>{avatar ? 'Photo ajoutée' : 'Ajouter une photo (optionnel)'}</Text>
          </View>

          <View style={styles.fieldsBlock}>
            <Input label="PRÉNOM" placeholder="Ex : Ibrahima" value={prenom} onChangeText={(v) => { setPrenom(v); setError(''); }} autoComplete="name-given" textContentType="givenName" />
            <Input label="NOM DE FAMILLE" placeholder="Ex : Diallo" value={nom} onChangeText={(v) => { setNom(v); setError(''); }} autoComplete="name-family" textContentType="familyName" />
          </View>

          {/* Véhicule */}
          <View style={styles.vehicleBlock}>
            <FieldLabel>TYPE DE VÉHICULE</FieldLabel>
            <View style={styles.vehicleRow}>
              {VEHICLES.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.vehicleChip, vehicleType === v.id && styles.vehicleChipActive]}
                  onPress={() => setVehicleType(v.id)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.vehicleChipIcon}>{v.icon}</Text>
                  <Text style={[styles.vehicleChipLabel, vehicleType === v.id && styles.vehicleChipLabelActive]}>{v.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input label="MARQUE (OPTIONNEL)" placeholder="Ex : Yamaha" value={vehicleBrand} onChangeText={setVehicleBrand} />
            <Input label="IMMATRICULATION (OPTIONNEL)" placeholder="Ex : DK 4521 AB" value={vehiclePlate} onChangeText={setVehiclePlate} autoCapitalize="characters" />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button label="Continuer" onPress={handleContinue} />

          <Text style={styles.legalNote}>Vos données sont protégées et ne seront jamais partagées sans votre consentement.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.deepBlack },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24 },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { fontSize: 20, color: Colors.cream },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40, gap: 24 },
  progressSection: { gap: 10 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressStep: { fontSize: 12, color: Colors.goldLight, fontFamily: Fonts.manrope.bold, letterSpacing: 0.5 },
  progressPct: { fontSize: 18, color: Colors.cream, fontFamily: Fonts.epilogue.bold },
  progressTrack: { height: 6, borderRadius: 9999, backgroundColor: 'rgba(169,208,182,0.15)', overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 9999, backgroundColor: Colors.goldLight },
  titleBlock: { gap: 8 },
  title: { fontSize: 28, color: Colors.cream, fontFamily: Fonts.epilogue.bold },
  subtitle: { fontSize: 14, color: Colors.greenMid, fontFamily: Fonts.manrope.medium, lineHeight: 21 },
  avatarBlock: { alignItems: 'center', gap: 8 },
  avatarPicker: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.darkCard,
    borderWidth: 2,
    borderColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarIcon: { fontSize: 32 },
  avatarBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.deepBlack,
  },
  avatarBadgeText: { fontSize: 14, color: '#13351F', fontFamily: Fonts.epilogue.bold },
  avatarHint: { fontSize: 13, color: Colors.greenMid, fontFamily: Fonts.manrope.medium },
  fieldsBlock: { gap: 16 },
  vehicleBlock: { gap: 12 },
  vehicleRow: { flexDirection: 'row', gap: 10 },
  vehicleChip: {
    flex: 1, height: 76, borderRadius: 16,
    backgroundColor: Colors.darkCard,
    borderWidth: 1.5, borderColor: 'rgba(169,208,182,0.15)',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  vehicleChipActive: { borderColor: Colors.goldLight, backgroundColor: 'rgba(244,189,97,0.1)' },
  vehicleChipIcon: { fontSize: 24 },
  vehicleChipLabel: { fontSize: 13, color: Colors.greenMid, fontFamily: Fonts.manrope.semiBold },
  vehicleChipLabelActive: { color: Colors.goldLight, fontFamily: Fonts.manrope.bold },
  errorText: { fontSize: 13, color: Colors.errorLight, fontFamily: Fonts.manrope.semiBold },
  legalNote: { fontSize: 12, color: Colors.dimText, fontFamily: Fonts.manrope.regular, textAlign: 'center', lineHeight: 18 },
});
