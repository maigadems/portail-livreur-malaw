import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import LivreurAvatar from '../components/LivreurAvatar';
import { getProfile } from '../api/couriers';
import { updateProfile } from '../api/auth';
import { pickAvatar } from '../utils/pickAvatar';
import { uploadAvatar } from '../api/uploads';
import { Alert } from '../components/AppAlert';

export default function ModifierProfilScreen() {
  const navigation = useNavigation<any>();
  const [nom, setNom] = useState('');
  const [phone, setPhone] = useState('');
  const [urgPhone, setUrgPhone] = useState('');
  const [vehicule, setVehicule] = useState('');
  const [immat, setImmat] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  // Charge le profil réel du livreur.
  useFocusEffect(useCallback(() => {
    let active = true;
    getProfile().then((p) => {
      if (!active) return;
      setNom(p.name ?? '');
      setPhone(p.phone ?? '');
      setAvatarUrl(p.avatarUrl ?? null);
      const parts = [p.vehicleType, p.vehicleBrand, p.vehicleColor].filter(Boolean);
      setVehicule(parts.join(' • '));
      setImmat(p.vehiclePlate ?? '');
    }).catch(() => {});
    return () => { active = false; };
  }, []));

  const handleChangeAvatar = async () => {
    if (savingAvatar) return;
    try {
      const dataUrl = await pickAvatar();
      if (!dataUrl) return;
      setSavingAvatar(true);
      // La photo part sur le service d'hébergement : on enregistre l'URL
      // renvoyée, pas la data-URL, qui pèserait en base et serait rechargée
      // en entier à chaque affichage.
      const url = await uploadAvatar(dataUrl);
      await updateProfile({ avatarUrl: url });
      setAvatarUrl(url);
    } catch (e: any) {
      Alert.alert('Photo de profil', e?.message ?? "Impossible de mettre à jour la photo.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Seul le nom est modifiable côté backend pour l'instant (téléphone
      // verrouillé, véhicule non encore éditable via l'API).
      if (nom.trim()) await updateProfile({ name: nom.trim() });
      setSaved(true);
      setTimeout(() => { setSaved(false); navigation.goBack(); }, 1200);
    } catch (e: any) {
      Alert.alert('Profil', e?.message ?? "Impossible d'enregistrer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Modifier le profil</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving}>
          {saving ? <ActivityIndicator color={Colors.goldLight} size="small" /> : <Text style={styles.saveBtnText}>{saved ? '✓' : 'Sauv.'}</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handleChangeAvatar} activeOpacity={0.8} disabled={savingAvatar}>
            <LivreurAvatar size={96} borderWidth={3} uri={avatarUrl} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.changePhotoBtn} onPress={handleChangeAvatar} disabled={savingAvatar}>
            <Text style={styles.changePhotoText}>{savingAvatar ? 'Envoi…' : 'Changer la photo'}</Text>
          </TouchableOpacity>
        </View>

        {/* Infos personnelles */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>INFORMATIONS PERSONNELLES</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nom complet</Text>
            <TextInput
              style={styles.fieldInput}
              value={nom}
              onChangeText={setNom}
              autoComplete="name"
              textContentType="name"
              placeholderTextColor={Colors.muted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Numéro de téléphone</Text>
            <View style={[styles.fieldInput, styles.fieldInputDisabled]}>
              <Text style={styles.fieldValueDisabled}>{phone}</Text>
              <Text style={styles.fieldLockedIcon}>🔒</Text>
            </View>
            <Text style={styles.fieldHint}>Contactez le support pour modifier votre numéro</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Numéro d'urgence</Text>
            <TextInput
              style={styles.fieldInput}
              value={urgPhone}
              onChangeText={setUrgPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              placeholderTextColor={Colors.muted}
            />
            <Text style={styles.fieldHint}>Utilisé uniquement en cas d'accident</Text>
          </View>
        </View>

        {/* Véhicule */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>VÉHICULE DE LIVRAISON</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Description véhicule</Text>
            <TextInput
              style={styles.fieldInput}
              value={vehicule}
              onChangeText={setVehicule}
              placeholderTextColor={Colors.muted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Immatriculation</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputPlate]}
              value={immat}
              onChangeText={setImmat}
              autoCapitalize="characters"
              placeholderTextColor={Colors.muted}
            />
          </View>
        </View>

        {/* Zone de livraison */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>PRÉFÉRENCES</Text>
          <View style={styles.zoneCard}>
            <View style={styles.zoneCardLeft}>
              <Text style={styles.zoneIcon}>📍</Text>
              <View style={styles.zoneText}>
                <Text style={styles.zoneLabel}>Zone de livraison préférée</Text>
                <Text style={styles.zoneValue}>Dakar Centre & Banlieue</Text>
              </View>
            </View>
            <Text style={styles.zoneArrow}>›</Text>
          </View>
        </View>

        {/* Danger zone */}
        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>ZONE SENSIBLE</Text>
          <TouchableOpacity style={styles.dangerBtn}>
            <Text style={styles.dangerBtnText}>🗑️  Supprimer mon compte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.deepBlack },
  topBar: {
    height: 72,
    backgroundColor: Colors.nearBlack,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(169,208,182,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 18, color: Colors.gold, fontWeight: '700' },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  saveBtn: {
    borderRadius: 9999,
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 24,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 12,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.darkGreenTint,
  },
  avatarInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoBtn: {
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: Colors.goldLight,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  formSection: { gap: 12 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  field: { gap: 6 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
  fieldInput: {
    height: 54,
    borderRadius: Radii.md,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(169,208,182,0.2)',
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldInputDisabled: {
    borderColor: 'rgba(65,72,67,0.4)',
    backgroundColor: 'rgba(65,72,67,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  fieldValueDisabled: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  fieldLockedIcon: { fontSize: 14 },
  fieldInputPlate: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  fieldHint: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.7,
  },
  zoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.md,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 16,
  },
  zoneCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zoneIcon: { fontSize: 20 },
  zoneText: { gap: 2 },
  zoneLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  zoneValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  zoneArrow: {
    fontSize: 20,
    color: Colors.muted,
  },
  dangerSection: { gap: 10 },
  dangerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
    opacity: 0.6,
  },
  dangerBtn: {
    height: 52,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.25)',
    backgroundColor: 'rgba(192,57,43,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.8,
  },
});
