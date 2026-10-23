import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import BottomNavBar from '../components/BottomNavBar';
import MalawLogo from '../components/MalawLogo';
import { getEarnings, Earnings } from '../api/couriers';
import { ApiError } from '../api/client';
import { useCourse } from '../context/CourseContext';
import { Alert } from '../components/AppAlert';

const { width } = Dimensions.get('window');
const fmt = (n: number) => n.toLocaleString('fr-FR');

/**
 * Tableau de bord hors service.
 *
 * C'est ici qu'atterrit le livreur dont le serveur dit qu'il n'est pas
 * disponible. Son bouton changeait autrefois d'écran sans rien dire au
 * serveur : le livreur se croyait en ligne, aucune course ne lui arrivait,
 * et il n'avait aucun moyen de comprendre pourquoi.
 */
export default function DashboardHorsLigneScreen() {
  const navigation = useNavigation<any>();
  const { online, goOnline } = useCourse();
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [going, setGoing] = useState(false);

  const load = useCallback(async () => {
    try {
      setEarnings(await getEarnings());
    } catch {
      // Hors-ligne ou session expirée : on n'affiche simplement aucun chiffre.
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleGoOnline = async () => {
    if (going) return;
    setGoing(true);
    try {
      await goOnline();
      navigation.replace('DashboardEnLigne');
    } catch (e: any) {
      // Le serveur refuse la mise en ligne tant que le dossier de validation
      // n'est pas approuvé ; son message précise où en est le dossier.
      const refused = e instanceof ApiError && e.status === 403;
      Alert.alert(
        refused ? 'Mise en ligne impossible' : 'Disponibilité',
        e?.message ?? "Impossible de vous mettre en ligne pour le moment.",
        refused
          ? [
              { text: 'Plus tard', style: 'cancel' },
              { text: 'Voir mon dossier', onPress: () => navigation.navigate('StatutDocuments') },
            ]
          : [{ text: 'Compris' }],
      );
    } finally {
      setGoing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* TopAppBar - green */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.menuLines}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={[styles.menuLine, { width: 12 }]} />
          </View>
          <MalawLogo size={40} />
        </View>
        <TouchableOpacity style={styles.avatarArea} onPress={() => navigation.navigate('Profil')} activeOpacity={0.8}>
          <View style={styles.avatarCircle}>
            <Text style={{ fontSize: 16 }}>👤</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Offline status section */}
        <View style={styles.offlineSection}>
          <View style={styles.offlineDecor} pointerEvents="none">
            <View style={styles.offlineDecorIcon} />
          </View>
          <View style={styles.offlineIconContainer}>
            <View style={styles.offlineIconBg}>
              <Text style={styles.offlineEmoji}>🔴</Text>
            </View>
          </View>
          <View style={styles.offlineTextBlock}>
            <Text style={styles.offlineTitle}>Vous êtes hors ligne</Text>
            <Text style={styles.offlineDesc}>
              Activez votre disponibilité pour{'\n'}commencer à recevoir des courses à{'\n'}Dakar.
            </Text>
          </View>
        </View>

        {/* Résumé de la semaine — chiffres réels. Masqué tant qu'on ne les a
            pas : mieux vaut rien qu'un montant plausible. */}
        {loading ? (
          <ActivityIndicator color={Colors.darkGreen} style={{ marginVertical: 16 }} />
        ) : earnings ? (
          <TouchableOpacity style={styles.weeklySummary} onPress={() => navigation.navigate('DetailsHebdos')} activeOpacity={0.85}>
            <View style={styles.weeklySummaryInner}>
              <View style={styles.weeklyLeft}>
                <Text style={styles.weeklyTotal}>{fmt(earnings.week.totalXof)} FCFA</Text>
                <Text style={styles.weeklyLabel}>Cette semaine</Text>
              </View>
              <View style={styles.weeklyRight}>
                <View style={styles.weeklyStatsIcon} />
              </View>
            </View>
            <View style={styles.weeklyFooter}>
              <Text style={styles.weeklyFooterIcon}>🏍️</Text>
              <Text style={styles.weeklyFooterText}>
                {earnings.week.count} livraison{earnings.week.count > 1 ? 's' : ''} effectuée{earnings.week.count > 1 ? 's' : ''}
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Le passage en ligne va au serveur via le contexte : changer d'écran
            sans lui parler laissait le livreur croire qu'il était en service. */}
        <TouchableOpacity
          style={[styles.goOnlineBtn, going && { opacity: 0.7 }]}
          onPress={handleGoOnline}
          disabled={going}
          activeOpacity={0.85}
        >
          <View style={styles.goOnlineBtnShadow} />
          {going ? (
            <ActivityIndicator color={Colors.cream} />
          ) : (
            <>
              <Text style={styles.goOnlineText}>Me mettre en ligne</Text>
              <Text style={{ color: Colors.cream, fontSize: 16 }}>→</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <BottomNavBar active="accueil" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  topBar: {
    height: 80,
    backgroundColor: Colors.darkGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuLines: {
    gap: 3,
  },
  menuLine: {
    width: 18,
    height: 2,
    backgroundColor: Colors.gold,
    borderRadius: 1,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  avatarArea: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0,
    backgroundColor: Colors.cream,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    gap: 20,
  },
  offlineSection: {
    alignItems: 'center',
    gap: 16,
    position: 'relative',
  },
  offlineDecor: {
    position: 'absolute',
    width: 225,
    height: 225,
    opacity: 0.10,
    alignSelf: 'center',
  },
  offlineDecorIcon: {
    flex: 1,
    backgroundColor: Colors.darkGreen,
    borderRadius: 8,
  },
  offlineIconContainer: {
    alignItems: 'center',
  },
  offlineIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineEmoji: {
    fontSize: 40,
  },
  offlineTextBlock: {
    alignItems: 'center',
    gap: 8,
  },
  offlineTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  offlineDesc: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  weeklySummary: {
    borderRadius: Radii.xl,
    backgroundColor: 'rgb(234,227,209)',
    padding: 24,
    gap: 12,
  },
  weeklySummaryInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weeklyLeft: {
    gap: 4,
  },
  weeklyTotal: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  weeklyLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.7,
  },
  weeklyRight: {
    width: 80,
    height: 80,
    opacity: 0.05,
    backgroundColor: Colors.darkGreen,
    borderRadius: 8,
  },
  weeklyStatsIcon: {
    flex: 1,
  },
  weeklyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26,61,43,0.1)',
  },
  weeklyFooterIcon: {
    fontSize: 16,
  },
  weeklyFooterText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  goOnlineBtn: {
    height: 64,
    borderRadius: Radii.sm,
    backgroundColor: Colors.darkGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  goOnlineBtnShadow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.white,
    opacity: 0.06,
  },
  goOnlineText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
});
