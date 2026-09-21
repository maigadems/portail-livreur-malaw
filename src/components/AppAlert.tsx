import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert as RNAlert } from 'react-native';
import { Colors, Radii } from '../constants/theme';

/**
 * Boîtes de dialogue aux couleurs de Malaw Livreur.
 *
 * `Alert.alert` de React Native affiche la boîte native du système, qui
 * ignore complètement l'identité de l'app — texte blanc sur gris foncé sur
 * Android. On la remplace par cette modale, montée une fois à la racine
 * (App.tsx), calquée sur SessionExpiredModal : carte sombre, bouton or.
 *
 * L'API imite `Alert.alert(titre, message, boutons)` pour que les écrans
 * n'aient qu'à changer leur import :
 *
 *     import { Alert } from '../components/AppAlert';
 *
 * Styles de bouton respectés :
 *   - `cancel`      → bouton discret
 *   - `destructive` → bouton rouge
 *   - défaut        → bouton or plein
 */

export type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertOptions = { cancelable?: boolean };

type AlertState = {
  title?: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
};

let show: ((state: AlertState) => void) | null = null;

export const Alert = {
  alert(title?: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    // Modale pas encore montée (tout début du démarrage) : on ne perd pas
    // l'information, on retombe sur la boîte native.
    if (!show) {
      RNAlert.alert(title ?? '', message, buttons, options);
      return;
    }
    show({
      title,
      message,
      buttons: buttons?.length ? buttons : [{ text: 'OK' }],
      options,
    });
  },
};

function defaultIcon(buttons: AlertButton[]): string {
  return buttons.some((b) => b.style === 'destructive') ? '⚠️' : 'ℹ️';
}

export default function AppAlertHost() {
  const [state, setState] = useState<AlertState | null>(null);

  useEffect(() => {
    show = setState;
    return () => {
      show = null;
    };
  }, []);

  if (!state) return null;

  const { title, message, buttons, options } = state;
  const close = () => setState(null);
  const press = (button: AlertButton) => {
    // Fermeture AVANT le retour : un onPress qui navigue ne doit pas rester
    // masqué par la modale.
    close();
    button.onPress?.();
  };

  // Deux libellés courts tiennent côte à côte ; au-delà on empile.
  const inline = buttons.length === 2 && buttons.every((b) => (b.text ?? '').length <= 14);

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={() => {
        if (options?.cancelable === false) return;
        close();
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.icon}>{defaultIcon(buttons)}</Text>
          {!!title && <Text style={styles.title}>{title}</Text>}
          {!!message && <Text style={styles.message}>{message}</Text>}

          <View style={[styles.actions, inline && styles.actionsInline]}>
            {buttons.map((b, i) => {
              const isCancel = b.style === 'cancel';
              const isDestructive = b.style === 'destructive';
              return (
                <TouchableOpacity
                  key={`${b.text}-${i}`}
                  style={[
                    styles.button,
                    inline && styles.buttonInline,
                    isCancel && styles.buttonCancel,
                    isDestructive && styles.buttonDestructive,
                  ]}
                  onPress={() => press(b)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isCancel && styles.buttonTextCancel,
                      isDestructive && styles.buttonTextDestructive,
                    ]}
                  >
                    {b.text ?? 'OK'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
  actions: { width: '100%', gap: 10 },
  actionsInline: { flexDirection: 'row-reverse' },
  button: {
    width: '100%',
    height: 52,
    borderRadius: Radii.md,
    backgroundColor: Colors.goldLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonInline: { flex: 1, width: undefined },
  buttonCancel: { backgroundColor: 'rgba(245,240,226,0.08)' },
  buttonDestructive: { backgroundColor: Colors.error },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
  buttonTextCancel: { color: Colors.creamText },
  buttonTextDestructive: { color: '#FFFFFF' },
});
