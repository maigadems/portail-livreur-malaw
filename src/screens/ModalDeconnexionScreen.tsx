import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import { logout } from '../api/auth';

export default function ModalDeconnexionScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    // logout() efface la session locale même si l'appel serveur échoue —
    // on quitte donc toujours vers Connexion.
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Connexion' }] });
  };

  return (
    <SafeAreaView style={styles.overlay}>
      <TouchableOpacity style={styles.dismissArea} onPress={() => navigation.goBack()} activeOpacity={1} />
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Icon */}
        <View style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>🚪</Text>
        </View>

        <Text style={styles.title}>Se déconnecter ?</Text>
        <Text style={styles.desc}>
          Vous serez déconnecté de votre compte Malaw. Vos données et historique seront conservés.
        </Text>

        {/* Status warning */}
        <View style={styles.warningBanner}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            Si vous avez une course en cours, terminez-la avant de vous déconnecter.
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonsBlock}>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleLogout}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.errorLight} />
            ) : (
              <Text style={styles.confirmBtnText}>Oui, me déconnecter</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelBtnText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: Colors.cardDark,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingBottom: 40,
    paddingTop: 16,
    alignItems: 'center',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(65,72,67,0.4)',
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(169,208,182,0.2)',
    marginBottom: 8,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(192,57,43,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(192,57,43,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 36 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  desc: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 24,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(244,189,97,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244,189,97,0.2)',
    padding: 12,
    width: '100%',
  },
  warningIcon: { fontSize: 16 },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.8,
    lineHeight: 20,
  },
  buttonsBlock: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  confirmBtn: {
    height: 60,
    borderRadius: Radii.md,
    backgroundColor: Colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
  },
  cancelBtn: {
    height: 56,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(169,208,182,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(169,208,182,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
});
