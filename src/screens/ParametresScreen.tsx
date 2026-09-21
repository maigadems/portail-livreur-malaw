import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';

// Défini au niveau module (PAS dans le composant) : sinon il serait recréé à
// chaque render, ce qui remonterait tous les Switch et provoquerait le "saut"
// visible des autres toggles quand on en actionne un.
function SettingSwitch({
  label, sub, value, onValueChange,
}: { label: string; sub?: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingText}>
        <Text style={styles.settingLabel}>{label}</Text>
        {sub && <Text style={styles.settingSub}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: 'rgba(65,72,67,0.5)', true: Colors.darkGreen }}
        thumbColor={value ? Colors.goldLight : Colors.dimText}
        ios_backgroundColor="rgba(65,72,67,0.5)"
      />
    </View>
  );
}

export default function ParametresScreen() {
  const navigation = useNavigation<any>();
  const [notifCourses, setNotifCourses] = useState(true);
  const [notifPaiements, setNotifPaiements] = useState(true);
  const [notifPromo, setNotifPromo] = useState(false);
  const [notifDocs, setNotifDocs] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [locationAlways, setLocationAlways] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Paramètres</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
          <View style={styles.settingsGroup}>
            <SettingSwitch
              label="Nouvelles courses"
              sub="Alertes en temps réel"
              value={notifCourses}
              onValueChange={setNotifCourses}
            />
            <View style={styles.divider} />
            <SettingSwitch
              label="Paiements reçus"
              sub="Virements et transactions"
              value={notifPaiements}
              onValueChange={setNotifPaiements}
            />
            <View style={styles.divider} />
            <SettingSwitch
              label="Offres & promotions"
              sub="Primes spéciales, événements"
              value={notifPromo}
              onValueChange={setNotifPromo}
            />
            <View style={styles.divider} />
            <SettingSwitch
              label="Rappels documents"
              sub="Alertes d'expiration"
              value={notifDocs}
              onValueChange={setNotifDocs}
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
              value={soundEnabled}
              onValueChange={setSoundEnabled}
            />
            <View style={styles.divider} />
            <SettingSwitch
              label="Vibration"
              value={vibration}
              onValueChange={setVibration}
            />
          </View>
        </View>

        {/* Affichage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AFFICHAGE</Text>
          <View style={styles.settingsGroup}>
            <SettingSwitch
              label="Mode sombre"
              sub="Recommandé pour la conduite"
              value={darkMode}
              onValueChange={setDarkMode}
            />
          </View>
        </View>

        {/* Confidentialité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONFIDENTIALITÉ & SÉCURITÉ</Text>
          <View style={styles.settingsGroup}>
            <SettingSwitch
              label="Localisation permanente"
              sub="Nécessaire pour recevoir des courses"
              value={locationAlways}
              onValueChange={setLocationAlways}
            />
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('Aide')}>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Changer le code PIN</Text>
                <Text style={styles.settingSub}>Protection de l'application</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('Aide')}>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Politique de confidentialité</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('Aide')}>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Conditions générales</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>À PROPOS</Text>
          <View style={styles.settingsGroup}>
            {[
              { label: 'Version', value: '1.0.0' },
              { label: 'Région', value: 'Dakar, Sénégal' },
              { label: 'Langue', value: 'Français' },
            ].map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  <Text style={styles.settingValue}>{item.value}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => navigation.navigate('ModalDeconnexion')}
        >
          <Text style={styles.logoutText}>🚪  Se déconnecter</Text>
        </TouchableOpacity>
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
});
