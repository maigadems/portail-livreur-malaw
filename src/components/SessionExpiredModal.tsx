import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Colors, Radii } from '../constants/theme';
import { onSessionExpired } from '../api/sessionEvents';
import { navigationRef } from '../navigation';

/**
 * Montée une seule fois à la racine (App.tsx). Affiche une invite de
 * reconnexion quand un refresh de token échoue, au lieu de laisser chaque
 * écran échouer avec "Unauthorized". Même pattern que le portail-client.
 */
export default function SessionExpiredModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => onSessionExpired(() => setVisible(true)), []);

  const handleReconnect = () => {
    setVisible(false);
    if (navigationRef.isReady()) {
      navigationRef.reset({ index: 0, routes: [{ name: 'Connexion' }] });
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.icon}>🔒</Text>
          <Text style={styles.title}>Session expirée</Text>
          <Text style={styles.message}>
            Votre session a expiré. Reconnectez-vous pour continuer.
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleReconnect} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Se reconnecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.cardDark,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
  },
  icon: { fontSize: 40, marginBottom: 4 },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: Radii.md,
    backgroundColor: Colors.goldLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
});
