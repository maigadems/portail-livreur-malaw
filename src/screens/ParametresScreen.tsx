import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch,
  ActivityIndicator, Modal, TextInput, Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';

import { Colors, Radii } from '../constants/theme';
import { Alert } from '../components/AppAlert';
import {
  getSettings, updateSettings, changePin, deleteAccount, UserSettings,
} from '../api/settings';
import { clearSession } from '../api/client';
import { hasLocationPermission } from '../services/locationTracking';

/**
 * Adresses publiques des documents légaux — À RENSEIGNER par l'équipe Malaw.
 *
 * Laissées vides, les lignes correspondantes ne s'affichent pas : un lien qui
 * ne mène nulle part vaut moins que pas de lien du tout (l'ancienne version
 * renvoyait vers l'écran d'aide, ce qui laissait croire que les documents
 * existaient).
 */
const PRIVACY_URL = '';
const TERMS_URL = '';

/** Langues réellement gérées côté serveur (champ `preferredLanguage`). */
const LANGUAGE_LABELS: Record<string, string> = {
  fr: 'Français',
  en: 'English',
};

// Défini au niveau module (PAS dans le composant) : sinon il serait recréé à
// chaque render, ce qui remonterait tous les Switch et provoquerait le "saut"
// visible des autres toggles quand on en actionne un.
function SettingSwitch({
  label, sub, value, onValueChange, disabled,
}: {
  label: string; sub?: string; value: boolean;
  onValueChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingText}>
        <Text style={styles.settingLabel}>{label}</Text>
        {sub && <Text style={styles.settingSub}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: 'rgba(65,72,67,0.5)', true: Colors.darkGreen }}
        thumbColor={value ? Colors.goldLight : Colors.dimText}
        ios_backgroundColor="rgba(65,72,67,0.5)"
      />
    </View>
  );
}

/** Champ de saisie d'un code à 4 chiffres, masqué. */
function PinField({
  label, value, onChangeText,
}: { label: string; value: string; onChangeText: (v: string) => void }) {
  return (
    <View style={styles.pinField}>
      <Text style={styles.pinFieldLabel}>{label}</Text>
      <TextInput
        style={styles.pinInput}
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
        placeholder="••••"
        placeholderTextColor={Colors.dimText}
      />
    </View>
  );
}

/**
 * Dialogue de changement de PIN.
 *
 * Monté seulement quand il est ouvert : l'état des champs repart donc vide à
 * chaque ouverture, on ne garde jamais un code saisi en mémoire.
 */
function ChangePinModal({ onClose }: { onClose: () => void }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(newPin)) {
      Alert.alert('Code invalide', 'Un code PIN comporte exactement 4 chiffres.');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('Codes différents', 'Le nouveau code et sa confirmation ne correspondent pas.');
      return;
    }
    if (newPin === currentPin) {
      Alert.alert('Code inchangé', 'Choisissez un code différent de votre code actuel.');
      return;
    }

    setBusy(true);
    try {
      await changePin({ currentPin, newPin });
      onClose();
      Alert.alert('Code modifié', 'Votre nouveau code PIN est actif dès maintenant.');
    } catch (e: any) {
      // Fermeture avant l'alerte : deux modales superposées se gênent sur iOS.
      onClose();
      Alert.alert('Changement impossible', e?.message ?? 'Réessayez dans un instant.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Changer le code PIN</Text>
          <Text style={styles.modalDesc}>
            Votre code protège l'accès à l'application et la validation de vos retraits.
          </Text>

          <PinField label="Code actuel" value={currentPin} onChangeText={setCurrentPin} />
          <PinField label="Nouveau code" value={newPin} onChangeText={setNewPin} />
          <PinField label="Confirmer le nouveau code" value={confirmPin} onChangeText={setConfirmPin} />

          <TouchableOpacity
            style={[styles.modalPrimaryBtn, busy && styles.btnDisabled]}
            onPress={submit}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color="rgb(67,44,0)" />
            ) : (
              <Text style={styles.modalPrimaryBtnText}>Enregistrer</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose} disabled={busy}>
            <Text style={styles.modalCancelBtnText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Dialogue de suppression définitive du compte.
 *
 * Le serveur est seul juge : il refuse tant qu'une course est en cours ou
 * qu'il reste de l'argent au portefeuille. On affiche son refus tel quel
 * plutôt que de deviner la règle côté app.
 */
function DeleteAccountModal({ onClose, onDeleted }: { onClose: () => void; onDeleted: () => void }) {
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    if (!/^\d{4}$/.test(pin)) {
      Alert.alert('Code requis', 'Saisissez votre code PIN à 4 chiffres pour confirmer.');
      return;
    }

    setBusy(true);
    try {
      await deleteAccount({ pin, reason: reason.trim() || undefined });
      await clearSession();
      onClose();
      onDeleted();
    } catch (e: any) {
      onClose();
      Alert.alert('Suppression refusée', e?.message ?? 'Réessayez dans un instant.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Supprimer mon compte</Text>
          <Text style={styles.modalDesc}>
            Cette action est irréversible : votre compte livreur, vos courses et vos gains
            ne seront plus accessibles.
          </Text>

          <PinField label="Code PIN" value={pin} onChangeText={setPin} />

          <View style={styles.pinField}>
            <Text style={styles.pinFieldLabel}>Motif (facultatif)</Text>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={setReason}
              placeholder="Dites-nous pourquoi vous partez"
              placeholderTextColor={Colors.dimText}
              multiline
              maxLength={300}
            />
          </View>

          <TouchableOpacity
            style={[styles.modalDangerBtn, busy && styles.btnDisabled]}
            onPress={submit}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color={Colors.errorLight} />
            ) : (
              <Text style={styles.modalDangerBtnText}>Supprimer définitivement</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose} disabled={busy}>
            <Text style={styles.modalCancelBtnText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ParametresScreen() {
  const navigation = useNavigation<any>();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  /** Une écriture en vol : on gèle les interrupteurs le temps de la réponse. */
  const [saving, setSaving] = useState(false);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [pinModal, setPinModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  useEffect(() => {
    let active = true;
    getSettings()
      .then((s) => { if (active) setSettings(s); })
      .catch((e: any) => {
        if (active) Alert.alert('Préférences indisponibles', e?.message ?? 'Réessayez plus tard.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  // Relu à chaque retour sur l'écran : le livreur peut avoir changé la
  // permission dans les réglages du téléphone entre-temps.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      hasLocationPermission()
        .then((granted) => { if (active) setLocationGranted(granted); })
        .catch(() => { if (active) setLocationGranted(false); });
      return () => { active = false; };
    }, []),
  );

  const toggle = async (key: keyof UserSettings, value: boolean) => {
    if (!settings || saving) return;
    const previous = settings;
    // Affichage optimiste : l'interrupteur doit suivre le doigt, pas le réseau.
    setSettings({ ...settings, [key]: value });
    setSaving(true);
    try {
      const updated = await updateSettings({ [key]: value } as Partial<UserSettings>);
      setSettings(updated);
    } catch (e: any) {
      setSettings(previous);
      Alert.alert('Enregistrement impossible', e?.message ?? 'Votre réglage n\'a pas été sauvegardé.');
    } finally {
      setSaving(false);
    }
  };

  const openSystemSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert(
        'Réglages inaccessibles',
        'Ouvrez les réglages de votre téléphone, puis autorisez la localisation pour Malaw Livreur.',
      );
    });
  };

  const openLegal = (url: string, label: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Ouverture impossible', `Impossible d'ouvrir ${label} depuis l'application.`);
    });
  };

  const confirmDelete = () => {
    Alert.alert(
      'Supprimer votre compte ?',
      'Vous perdrez définitivement l\'accès à votre compte livreur, à votre historique et à vos gains. Cette action ne peut pas être annulée.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Continuer', style: 'destructive', onPress: () => setDeleteModal(true) },
      ],
    );
  };

  const appVersion = Constants.expoConfig?.version ?? '—';

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.gold} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Paramètres</Text>
        <View style={{ width: 40 }}>{saving && <ActivityIndicator color={Colors.gold} size="small" />}</View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {settings ? (
          <>
            {/* Notifications — un interrupteur par canal réellement géré par le serveur */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
              <View style={styles.settingsGroup}>
                <SettingSwitch
                  label="Notifications push"
                  sub="Nouvelles courses, paiements, documents"
                  value={settings.pushEnabled}
                  disabled={saving}
                  onValueChange={(v) => toggle('pushEnabled', v)}
                />
                <View style={styles.divider} />
                <SettingSwitch
                  label="SMS"
                  sub="Alertes importantes par message"
                  value={settings.smsEnabled}
                  disabled={saving}
                  onValueChange={(v) => toggle('smsEnabled', v)}
                />
                <View style={styles.divider} />
                <SettingSwitch
                  label="E-mail"
                  sub="Récapitulatifs et justificatifs"
                  value={settings.emailEnabled}
                  disabled={saving}
                  onValueChange={(v) => toggle('emailEnabled', v)}
                />
                <View style={styles.divider} />
                <SettingSwitch
                  label="Offres & promotions"
                  sub="Primes spéciales, événements"
                  value={settings.promoOptIn}
                  disabled={saving}
                  onValueChange={(v) => toggle('promoOptIn', v)}
                />
              </View>
            </View>

            {/* Son & Vibration */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SON & VIBRATION</Text>
              <View style={styles.settingsGroup}>
                <SettingSwitch
                  label="Son d'alerte"
                  sub="Pour les nouvelles courses"
                  value={settings.soundEnabled}
                  disabled={saving}
                  onValueChange={(v) => toggle('soundEnabled', v)}
                />
                <View style={styles.divider} />
                <SettingSwitch
                  label="Vibration"
                  value={settings.vibrationEnabled}
                  disabled={saving}
                  onValueChange={(v) => toggle('vibrationEnabled', v)}
                />
              </View>
            </View>
          </>
        ) : (
          <View style={styles.settingsGroup}>
            <Text style={styles.unavailable}>
              Préférences indisponibles. Vérifiez votre connexion puis rouvrez cet écran.
            </Text>
          </View>
        )}

        {/* Confidentialité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONFIDENTIALITÉ & SÉCURITÉ</Text>
          <View style={styles.settingsGroup}>
            {/* Permission système, pas préférence de compte : l'app ne peut que
                la lire et renvoyer vers les réglages du téléphone. */}
            <TouchableOpacity style={styles.settingRow} onPress={openSystemSettings}>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Localisation</Text>
                <Text style={styles.settingSub}>
                  {locationGranted === null
                    ? 'Vérification…'
                    : locationGranted
                      ? 'Autorisée — nécessaire pour recevoir des courses'
                      : 'Refusée — vous ne recevrez pas de courses'}
                </Text>
              </View>
              <Text style={[styles.settingValue, !locationGranted && { color: Colors.errorLight }]}>
                Réglages ›
              </Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingRow} onPress={() => setPinModal(true)}>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Changer le code PIN</Text>
                <Text style={styles.settingSub}>Protection de l'application</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
            {!!PRIVACY_URL && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => openLegal(PRIVACY_URL, 'la politique de confidentialité')}
                >
                  <View style={styles.settingText}>
                    <Text style={styles.settingLabel}>Politique de confidentialité</Text>
                  </View>
                  <Text style={styles.arrow}>↗</Text>
                </TouchableOpacity>
              </>
            )}
            {!!TERMS_URL && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => openLegal(TERMS_URL, 'les conditions générales')}
                >
                  <View style={styles.settingText}>
                    <Text style={styles.settingLabel}>Conditions générales</Text>
                  </View>
                  <Text style={styles.arrow}>↗</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* App info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>À PROPOS</Text>
          <View style={styles.settingsGroup}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Version</Text>
              <Text style={styles.settingValue}>{appVersion}</Text>
            </View>
            {settings && (
              <>
                <View style={styles.divider} />
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Langue</Text>
                  <Text style={styles.settingValue}>
                    {LANGUAGE_LABELS[settings.preferredLanguage] ?? settings.preferredLanguage}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => navigation.navigate('ModalDeconnexion')}
        >
          <Text style={styles.logoutText}>🚪  Se déconnecter</Text>
        </TouchableOpacity>

        {/* Zone dangereuse */}
        <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete} activeOpacity={0.85}>
          <Text style={styles.deleteText}>Supprimer mon compte</Text>
        </TouchableOpacity>
      </ScrollView>

      {pinModal && <ChangePinModal onClose={() => setPinModal(false)} />}
      {deleteModal && (
        <DeleteAccountModal
          onClose={() => setDeleteModal(false)}
          onDeleted={() => {
            Alert.alert('Compte supprimé', 'Votre compte Malaw Livreur a été supprimé.');
            navigation.reset({ index: 0, routes: [{ name: 'Connexion' }] });
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.deepBlack },
  centered: { alignItems: 'center', justifyContent: 'center' },
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 20,
  },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  settingsGroup: {
    borderRadius: Radii.md,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    overflow: 'hidden',
  },
  unavailable: {
    padding: 16,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingText: { flex: 1, gap: 2, marginRight: 12 },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  settingSub: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(65,72,67,0.3)',
    marginHorizontal: 16,
  },
  arrow: {
    fontSize: 20,
    color: Colors.muted,
  },
  logoutBtn: {
    height: 56,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,180,171,0.2)',
    backgroundColor: 'rgba(192,57,43,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.85,
  },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
    textDecorationLine: 'underline',
    opacity: 0.7,
  },

  // ----- Modales -----
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  modalCard: {
    backgroundColor: Colors.cardDark,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 24,
    gap: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  modalDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 20,
  },
  pinField: { gap: 6 },
  pinFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.3,
  },
  pinInput: {
    height: 52,
    borderRadius: Radii.sm,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: 'rgba(169,208,182,0.15)',
    paddingHorizontal: 16,
    fontSize: 20,
    letterSpacing: 8,
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  reasonInput: {
    minHeight: 72,
    borderRadius: Radii.sm,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: 'rgba(169,208,182,0.15)',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
    textAlignVertical: 'top',
  },
  modalPrimaryBtn: {
    height: 52,
    borderRadius: Radii.md,
    backgroundColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  modalPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
  modalDangerBtn: {
    height: 52,
    borderRadius: Radii.md,
    backgroundColor: Colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  modalDangerBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
  },
  modalCancelBtn: {
    height: 48,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(245,240,226,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.creamText,
    fontFamily: 'Manrope_500Medium',
  },
  btnDisabled: { opacity: 0.6 },
});
