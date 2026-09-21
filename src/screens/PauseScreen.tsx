import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import { setAvailability } from '../api/deliveries';

// duration: 0 = pause à durée indéterminée (pas de minuteur).
const PAUSE_OPTIONS = [
  { duration: 0, label: 'Indéterminée', sub: 'Sans limite de temps' },
  { duration: 15, label: '15 min', sub: 'Courte pause' },
  { duration: 30, label: '30 min', sub: 'Pause repas' },
  { duration: 60, label: '1 heure', sub: 'Longue pause' },
  { duration: 120, label: '2 heures', sub: 'Demi-journée' },
];

const REASONS = ['Repas', 'Carburant', 'Repos', 'Terminer la journée', 'Autre'];

const { width } = Dimensions.get('window');

export default function PauseScreen() {
  const navigation = useNavigation<any>();
  // "Indéterminée" (0) sélectionnée par défaut.
  const [selected, setSelected] = useState<number>(0);
  const [reason, setReason] = useState<string | null>(null);
  const [pauseActive, setPauseActive] = useState(false);
  const [remainingMin, setRemainingMin] = useState(0);

  const isIndefinite = selected === 0;

  const handleStartPause = () => {
    setRemainingMin(selected);
    setPauseActive(true);
    // C'est ICI que le livreur passe réellement hors ligne (validation de la
    // pause) — pas au clic sur INACTIF depuis le dashboard.
    setAvailability(false).catch(() => {});
  };

  const handleEndPause = () => {
    setPauseActive(false);
    // Fin de pause : remise en ligne.
    setAvailability(true).catch(() => {});
    navigation.navigate('DashboardEnLigne');
  };

  if (pauseActive) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <View style={{ width: 40 }} />
          <Text style={styles.topBarTitle}>En pause</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.pauseActiveContent}>
          {/* Animated pause indicator */}
          <View style={styles.pauseCircle}>
            <View style={styles.pauseCircleInner}>
              <Text style={styles.pauseIcon}>⏸️</Text>
            </View>
          </View>

          <Text style={styles.pauseTitle}>Vous êtes en pause</Text>
          <Text style={styles.pauseDesc}>
            Aucune course ne vous sera proposée pendant votre pause.{'\n'}
            Votre score de fiabilité n'est pas affecté.
          </Text>

          {/* Timer — masqué pour une pause à durée indéterminée */}
          <View style={styles.timerCard}>
            {isIndefinite ? (
              <>
                <Text style={styles.timerLabel}>DURÉE</Text>
                <Text style={styles.timerValue}>Indéterminée</Text>
              </>
            ) : (
              <>
                <Text style={styles.timerLabel}>TEMPS RESTANT</Text>
                <Text style={styles.timerValue}>{remainingMin} min</Text>
                <View style={styles.timerTrack}>
                  <View style={[styles.timerFill, { width: `${(remainingMin / selected) * 100}%` as any }]} />
                </View>
              </>
            )}
          </View>

          {/* Info */}
          <View style={styles.pauseInfoRow}>
            <View style={styles.pauseInfo}>
              <Text style={styles.pauseInfoIcon}>📍</Text>
              <Text style={styles.pauseInfoText}>Localisation suspendue</Text>
            </View>
            <View style={styles.pauseInfo}>
              <Text style={styles.pauseInfoIcon}>🔔</Text>
              <Text style={styles.pauseInfoText}>Alertes désactivées</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomArea}>
          <TouchableOpacity style={styles.endPauseBtn} onPress={handleEndPause} activeOpacity={0.85}>
            <View style={styles.endPauseBtnShadow} />
            <Text style={styles.endPauseBtnText}>Terminer la pause maintenant</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Prendre une pause</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardIcon}>💡</Text>
          <Text style={styles.infoCardText}>
            Pendant votre pause, vous ne recevrez aucune alerte de course. Votre score de fiabilité reste intact.
          </Text>
        </View>

        {/* Duration selector */}
        <Text style={styles.sectionTitle}>DURÉE DE LA PAUSE</Text>
        <View style={styles.optionsGrid}>
          {PAUSE_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.duration}
              style={[styles.optionCard, selected === opt.duration && styles.optionCardSelected]}
              onPress={() => setSelected(opt.duration)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.optionLabel, selected === opt.duration && styles.optionLabelSelected]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {opt.label}
              </Text>
              <Text
                style={[styles.optionSub, selected === opt.duration && styles.optionSubSelected]}
                numberOfLines={1}
              >
                {opt.sub}
              </Text>
              {selected === opt.duration && (
                <View style={styles.optionCheckmark}>
                  <Text style={styles.optionCheckmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Raison (optionnel) */}
        <Text style={styles.sectionTitle}>RAISON (OPTIONNEL)</Text>
        <View style={styles.reasonRow}>
          {REASONS.map(r => {
            const active = reason === r;
            return (
              <TouchableOpacity
                key={r}
                style={[styles.reasonChip, active && styles.reasonChipActive]}
                onPress={() => setReason(active ? null : r)}
                activeOpacity={0.8}
              >
                <Text style={[styles.reasonChipText, active && styles.reasonChipTextActive]}>{r}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.bottomArea}>
        <TouchableOpacity style={styles.startPauseBtn} onPress={handleStartPause} activeOpacity={0.85}>
          <Text style={styles.startPauseBtnText}>Se mettre hors ligne</Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    gap: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(169,208,182,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(169,208,182,0.15)',
    padding: 14,
  },
  infoCardIcon: { fontSize: 18 },
  infoCardText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    width: (width - 48 - 12) / 2,
    borderRadius: Radii.md,
    backgroundColor: Colors.cardDark,
    borderWidth: 2,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 16,
    gap: 4,
    position: 'relative',
  },
  optionCardSelected: {
    borderColor: Colors.goldLight,
    backgroundColor: 'rgba(244,189,97,0.08)',
  },
  optionLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    paddingRight: 24,
  },
  optionLabelSelected: {
    color: Colors.goldLight,
  },
  optionSub: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.dimText,
    fontFamily: 'Manrope_500Medium',
  },
  optionSubSelected: {
    color: Colors.goldLight,
    opacity: 0.75,
  },
  optionCheckmark: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckmarkText: {
    fontSize: 11,
    fontWeight: '900',
    color: 'rgb(67,44,0)',
  },
  reasonRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  reasonChip: {
    borderRadius: 9999,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  reasonChipActive: {
    backgroundColor: 'rgba(244,189,97,0.12)',
    borderColor: Colors.goldLight,
  },
  reasonChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  reasonChipTextActive: {
    color: Colors.goldLight,
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 12,
  },
  startPauseBtn: {
    height: 60,
    borderRadius: Radii.md,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startPauseBtnDisabled: {
    backgroundColor: 'rgba(192,57,43,0.4)',
  },
  startPauseBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
  },
  // Pause active styles
  pauseActiveContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: 'center',
    gap: 24,
  },
  pauseCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(169,208,182,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(169,208,182,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseCircleInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(169,208,182,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseIcon: { fontSize: 56 },
  pauseTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  pauseDesc: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 24,
  },
  timerCard: {
    width: '100%',
    borderRadius: Radii.md,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 16,
    gap: 10,
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  timerValue: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  timerTrack: {
    width: '100%',
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
  pauseInfoRow: {
    flexDirection: 'row',
    gap: 20,
  },
  pauseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pauseInfoIcon: { fontSize: 16 },
  pauseInfoText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  endPauseBtn: {
    height: 60,
    borderRadius: Radii.md,
    backgroundColor: Colors.successDark,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  endPauseBtnShadow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.white,
    opacity: 0.06,
  },
  endPauseBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
  },
});
