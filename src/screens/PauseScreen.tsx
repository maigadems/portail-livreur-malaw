import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Radii } from '../constants/theme';
import { ApiError } from '../api/client';
import { useCourse } from '../context/CourseContext';
import { Alert } from '../components/AppAlert';
import { hasLocationPermission, requestLocationPermission } from '../services/locationTracking';

// duration: 0 = pause à durée indéterminée (pas de minuteur).
const PAUSE_OPTIONS = [
  { duration: 0, label: 'Indéterminée', sub: 'Sans limite de temps' },
  { duration: 15, label: '15 min', sub: 'Courte pause' },
  { duration: 30, label: '30 min', sub: 'Pause repas' },
  { duration: 60, label: '1 heure', sub: 'Longue pause' },
  { duration: 120, label: '2 heures', sub: 'Demi-journée' },
];

/**
 * La pause ne vit que dans l'app : le serveur ne connaît qu'un livreur hors
 * ligne. Pour qu'une fermeture de l'app ne perde pas le minuteur, on
 * mémorise l'échéance (et la durée choisie, pour la barre de progression).
 * `until = 0` signifie « durée indéterminée ».
 */
const PAUSE_KEY = '@malaw-livreur/pauseUntil';

type StoredPause = { until: number; durationMin: number };

const { width } = Dimensions.get('window');

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function PauseScreen() {
  const navigation = useNavigation<any>();
  // Le passage hors ligne / en ligne appartient au contexte : c'est lui qui
  // arrête et relance le suivi GPS. Un appel direct au serveur depuis ici
  // laisserait le suivi tourner pendant la pause.
  const { online, loading: serviceLoading, goOffline, goOnline } = useCourse();

  // "Indéterminée" (0) sélectionnée par défaut.
  const [selected, setSelected] = useState<number>(0);
  const [pause, setPause] = useState<StoredPause | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [saving, setSaving] = useState(false);
  const [resuming, setResuming] = useState(false);
  const resumingRef = useRef(false);

  /**
   * Reprise d'une pause laissée en cours. Si le serveur dit que le livreur
   * est déjà en ligne (remis en service depuis un autre écran, ou autre
   * téléphone), la pause mémorisée est périmée : on l'efface.
   */
  useEffect(() => {
    if (serviceLoading || hydrated) return;
    let alive = true;
    (async () => {
      const raw = await AsyncStorage.getItem(PAUSE_KEY).catch(() => null);
      if (!alive) return;
      if (raw) {
        if (online) {
          await AsyncStorage.removeItem(PAUSE_KEY).catch(() => {});
        } else {
          try {
            const parsed = JSON.parse(raw) as StoredPause;
            if (typeof parsed?.until === 'number') setPause(parsed);
          } catch {
            await AsyncStorage.removeItem(PAUSE_KEY).catch(() => {});
          }
        }
      }
      setHydrated(true);
    })();
    return () => { alive = false; };
  }, [serviceLoading, online, hydrated]);

  // Décompte réel, nettoyé au démontage. Basé sur l'horloge et non sur un
  // compteur : un intervalle suspendu en arrière-plan reprend au bon endroit.
  useEffect(() => {
    if (!pause || pause.until === 0) return;
    const tick = () => setRemainingMs(pause.until - Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [pause]);

  const isIndefinite = selected === 0;
  const expired = pause != null && pause.until !== 0 && remainingMs <= 0;

  const handleStartPause = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // C'est ICI que le livreur passe réellement hors ligne (validation de
      // la pause) — pas au clic sur INACTIF depuis le dashboard.
      await goOffline();
      const stored: StoredPause = {
        until: selected === 0 ? 0 : Date.now() + selected * 60_000,
        durationMin: selected,
      };
      await AsyncStorage.setItem(PAUSE_KEY, JSON.stringify(stored)).catch(() => {});
      setPause(stored);
    } catch (e: any) {
      Alert.alert('Pause impossible', e?.message ?? 'Impossible de vous mettre hors ligne pour le moment.');
    } finally {
      setSaving(false);
    }
  };

  const clearPause = useCallback(async () => {
    await AsyncStorage.removeItem(PAUSE_KEY).catch(() => {});
    setPause(null);
  }, []);

  /**
   * Reprise du service. Toujours à l'initiative du livreur, jamais à
   * l'expiration du minuteur : se remettre en ligne, c'est s'engager à
   * accepter des courses, et il faut être là pour ça.
   */
  const handleResume = async () => {
    if (resumingRef.current) return;
    resumingRef.current = true;
    setResuming(true);
    try {
      if (!(await hasLocationPermission())) await requestLocationPermission();
      await goOnline();
      await clearPause();
      navigation.replace('DashboardEnLigne');
    } catch (e: any) {
      // 403 : dossier de validation non approuvé, le message du serveur dit
      // où il en est.
      const refused = e instanceof ApiError && e.status === 403;
      Alert.alert(
        refused ? 'Mise en ligne impossible' : 'Reprise impossible',
        e?.message ?? 'Impossible de vous remettre en ligne pour le moment.',
        refused
          ? [
              { text: 'Plus tard', style: 'cancel' },
              { text: 'Voir mon dossier', onPress: () => navigation.navigate('StatutDocuments') },
            ]
          : [{ text: 'Compris' }],
      );
    } finally {
      resumingRef.current = false;
      setResuming(false);
    }
  };

  /** Rester hors ligne sans reprendre : on retourne au tableau de bord hors ligne. */
  const handleStayOffline = async () => {
    if (resuming) return;
    await clearPause();
    navigation.replace('DashboardHorsLigne');
  };

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={Colors.goldLight} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (pause) {
    const progress = pause.until === 0 || pause.durationMin <= 0
      ? 0
      : Math.min(1, Math.max(0, remainingMs / (pause.durationMin * 60_000)));

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <View style={{ width: 40 }} />
          <Text style={styles.topBarTitle}>{expired ? 'Pause terminée' : 'En pause'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.pauseActiveContent}>
          <View style={styles.pauseCircle}>
            <View style={styles.pauseCircleInner}>
              <Text style={styles.pauseIcon}>{expired ? '⏰' : '⏸️'}</Text>
            </View>
          </View>

          <Text style={styles.pauseTitle}>
            {expired ? 'Votre pause est terminée' : 'Vous êtes en pause'}
          </Text>
          <Text style={styles.pauseDesc}>
            {expired
              ? 'Vous êtes toujours hors ligne. Reprenez le service quand vous êtes prêt.'
              : 'Aucune course ne vous sera proposée pendant votre pause.'}
          </Text>

          {/* Minuteur — masqué pour une pause à durée indéterminée */}
          <View style={styles.timerCard}>
            {pause.until === 0 ? (
              <>
                <Text style={styles.timerLabel}>DURÉE</Text>
                <Text style={styles.timerValue}>Indéterminée</Text>
              </>
            ) : (
              <>
                <Text style={styles.timerLabel}>{expired ? 'ÉCOULÉE' : 'TEMPS RESTANT'}</Text>
                <Text style={styles.timerValue}>{formatRemaining(remainingMs)}</Text>
                <View style={styles.timerTrack}>
                  <View style={[styles.timerFill, { width: `${progress * 100}%` as any }]} />
                </View>
              </>
            )}
          </View>

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
          <TouchableOpacity
            style={[styles.endPauseBtn, resuming && { opacity: 0.7 }]}
            onPress={handleResume}
            disabled={resuming}
            activeOpacity={0.85}
          >
            <View style={styles.endPauseBtnShadow} />
            {resuming ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.endPauseBtnText}>
                {expired ? 'Reprendre le service' : 'Terminer la pause maintenant'}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.stayOfflineBtn} onPress={handleStayOffline} disabled={resuming}>
            <Text style={styles.stayOfflineText}>Rester hors ligne</Text>
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
        <View style={styles.infoCard}>
          <Text style={styles.infoCardIcon}>💡</Text>
          <Text style={styles.infoCardText}>
            Pendant votre pause, vous ne recevrez aucune alerte de course. À la fin du minuteur, vous restez hors ligne tant que vous n'avez pas repris le service.
          </Text>
        </View>

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
      </ScrollView>

      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={[styles.startPauseBtn, saving && styles.startPauseBtnDisabled]}
          onPress={handleStartPause}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.startPauseBtnText}>
              {isIndefinite ? 'Se mettre hors ligne' : `Se mettre hors ligne ${PAUSE_OPTIONS.find(o => o.duration === selected)?.label ?? ''}`}
            </Text>
          )}
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
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 12,
    gap: 10,
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
    fontVariant: ['tabular-nums'],
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
  stayOfflineBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stayOfflineText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textDecorationLine: 'underline',
  },
});
