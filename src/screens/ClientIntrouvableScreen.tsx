import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';

const { width } = Dimensions.get('window');
const WAIT_SECONDS = 300; // 5 min

export default function ClientIntrouvableScreen() {
  const navigation = useNavigation<any>();
  const [elapsed, setElapsed] = useState(0);
  const [callAttempts, setCallAttempts] = useState(0);
  const [photoTaken, setPhotoTaken] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const waitPct = Math.min((elapsed / WAIT_SECONDS) * 100, 100);
  const remainSec = Math.max(WAIT_SECONDS - elapsed, 0);
  const canCancel = elapsed >= WAIT_SECONDS || callAttempts >= 3;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Client introuvable</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Warning icon */}
        <View style={styles.warningCircle}>
          <View style={styles.warningInner}>
            <Text style={styles.warningEmoji}>⏳</Text>
          </View>
        </View>

        {/* Status */}
        <View style={styles.statusBlock}>
          <Text style={styles.statusTitle}>En attente du client</Text>
          <Text style={styles.statusDesc}>
            Aminata S. · Plateau, Rue 10{'\n'}
            Tentatives d'appel : {callAttempts}/3
          </Text>
        </View>

        {/* Wait timer */}
        <View style={styles.timerCard}>
          <View style={styles.timerHeader}>
            <Text style={styles.timerLabel}>TEMPS D'ATTENTE ÉCOULÉ</Text>
            <Text style={[styles.timerValue, elapsed >= WAIT_SECONDS && styles.timerValueDone]}>
              {formatTime(elapsed)}
            </Text>
          </View>
          <View style={styles.timerTrack}>
            <View style={[styles.timerFill, { width: `${waitPct}%` as any }]} />
          </View>
          {!canCancel && (
            <Text style={styles.timerHint}>
              Annulation possible dans {formatTime(remainSec)}
            </Text>
          )}
          {canCancel && (
            <Text style={styles.timerDone}>
              ✓ Vous pouvez maintenant annuler sans pénalité
            </Text>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actionsBlock}>
          <Text style={styles.actionsTitle}>QUE FAIRE ?</Text>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => setCallAttempts(a => Math.min(a + 1, 3))}
          >
            <View style={styles.actionIcon}>
              <Text style={{ fontSize: 22 }}>📞</Text>
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionLabel}>Appeler le client</Text>
              <Text style={styles.actionDesc}>{callAttempts}/3 appels</Text>
            </View>
            {callAttempts < 3 && (
              <View style={styles.actionBadge}>
                <Text style={styles.actionBadgeText}>Appeler</Text>
              </View>
            )}
            {callAttempts >= 3 && (
              <View style={[styles.actionBadge, { backgroundColor: 'rgba(169,208,182,0.2)' }]}>
                <Text style={[styles.actionBadgeText, { color: Colors.greenMid }]}>✓</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionItem, photoTaken && styles.actionItemDone]}
            onPress={() => setPhotoTaken(true)}
          >
            <View style={styles.actionIcon}>
              <Text style={{ fontSize: 22 }}>📸</Text>
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionLabel}>Prendre une photo de preuve</Text>
              <Text style={styles.actionDesc}>Photo de l'adresse ou de la tentative de livraison</Text>
            </View>
            {!photoTaken ? (
              <View style={styles.actionBadge}>
                <Text style={styles.actionBadgeText}>Photo</Text>
              </View>
            ) : (
              <View style={[styles.actionBadge, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                <Text style={[styles.actionBadgeText, { color: Colors.success }]}>✓</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('Aide')}
          >
            <View style={styles.actionIcon}>
              <Text style={{ fontSize: 22 }}>💬</Text>
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionLabel}>Contacter le support</Text>
              <Text style={styles.actionDesc}>Un agent prend en charge sous 2 min</Text>
            </View>
            <Text style={{ color: Colors.muted, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom */}
      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={[styles.cancelBtn, !canCancel && styles.cancelBtnDisabled]}
          onPress={() => canCancel && navigation.navigate('DashboardEnLigne')}
          activeOpacity={canCancel ? 0.85 : 1}
        >
          <Text style={[styles.cancelBtnText, !canCancel && { opacity: 0.35 }]}>
            {canCancel ? 'Annuler sans pénalité →' : `Annuler dans ${formatTime(remainSec)}`}
          </Text>
        </TouchableOpacity>
        <Text style={styles.bottomNote}>
          Sans pénalité sur votre score si les conditions sont remplies
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.nearBlack },
  topBar: {
    height: 72,
    backgroundColor: Colors.darkCard,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(65,72,67,0.3)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(169,208,182,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 18, color: Colors.gold, fontWeight: '700' },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 20,
  },
  warningCircle: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(244,189,97,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(244,189,97,0.2)',
  },
  warningInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(244,189,97,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningEmoji: { fontSize: 36 },
  statusBlock: { alignItems: 'center', gap: 6 },
  statusTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  statusDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 22,
  },
  timerCard: {
    borderRadius: Radii.md,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 16,
    gap: 10,
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  timerValue: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  timerValueDone: { color: Colors.successDark },
  timerTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(65,72,67,0.5)',
    overflow: 'hidden',
  },
  timerFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.goldLight,
  },
  timerHint: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  timerDone: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.successDark,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  actionsBlock: { gap: 10 },
  actionsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: Radii.md,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 14,
  },
  actionItemDone: {
    borderColor: 'rgba(34,197,94,0.2)',
    backgroundColor: 'rgba(26,61,43,0.4)',
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { flex: 1, gap: 3 },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  actionDesc: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  actionBadge: {
    borderRadius: 9999,
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  actionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 12,
    gap: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    width: '100%',
    height: 60,
    borderRadius: Radii.md,
    backgroundColor: Colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnDisabled: {
    backgroundColor: 'rgba(147,0,10,0.25)',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
  },
  bottomNote: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    opacity: 0.6,
  },
});
