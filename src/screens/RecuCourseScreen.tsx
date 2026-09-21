import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MalawLogo from '../components/MalawLogo';
import { Colors, Radii } from '../constants/theme';

export default function RecuCourseScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Reçu de course</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={() => navigation.navigate('Litige')}>
          <Text style={styles.shareIcon}>⬆️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header receipt */}
        <View style={styles.receiptHeader}>
          <View style={styles.receiptBrand}>
            <MalawLogo size={48} />
            <Text style={styles.receiptSub}>Reçu de livraison</Text>
          </View>
          <View style={styles.receiptStatusBadge}>
            <Text style={styles.receiptStatusText}>✓ LIVRÉ</Text>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>Gains nets de cette course</Text>
          <Text style={styles.amountValue}>2 300 FCFA</Text>
          <Text style={styles.amountDate}>Mercredi 4 juin 2026 · 14h32</Text>
        </View>

        {/* Route */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TRAJET</Text>
          <View style={styles.routeBlock}>
            <View style={styles.routeStop}>
              <View style={[styles.routeStopDot, { backgroundColor: Colors.goldLight }]} />
              <View style={styles.routeStopInfo}>
                <Text style={styles.routeStopLabel}>DÉPART · RESTAURANT</Text>
                <Text style={styles.routeStopName}>Maquis Teranga, Médina</Text>
              </View>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeStop}>
              <View style={[styles.routeStopDot, styles.routeStopDotDest]} />
              <View style={styles.routeStopInfo}>
                <Text style={styles.routeStopLabel}>ARRIVÉE · CLIENT</Text>
                <Text style={styles.routeStopName}>Plateau, Rue 10 — Aminata S.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DÉTAILS</Text>
          <View style={styles.detailsCard}>
            {[
              { label: 'Distance parcourue', value: '4.8 km' },
              { label: 'Durée de la course', value: '22 min' },
              { label: 'Articles livrés', value: '3 items' },
              { label: 'Heure de pickup', value: '14h10' },
              { label: 'Heure de livraison', value: '14h32' },
            ].map((row, i) => (
              <View key={i} style={[styles.detailRow, i > 0 && styles.detailRowBorder]}>
                <Text style={styles.detailLabel}>{row.label}</Text>
                <Text style={styles.detailValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Earnings breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VENTILATION DES GAINS</Text>
          <View style={styles.detailsCard}>
            {[
              { label: 'Course de base', value: '+2 100 FCFA', color: Colors.greenLight },
              { label: 'Prime de distance', value: '+200 FCFA', color: Colors.greenLight },
              { label: 'Déductions', value: '0 FCFA', color: Colors.muted },
            ].map((row, i) => (
              <View key={i} style={[styles.detailRow, i > 0 && styles.detailRowBorder]}>
                <Text style={styles.detailLabel}>{row.label}</Text>
                <Text style={[styles.detailValue, { color: row.color }]}>{row.value}</Text>
              </View>
            ))}
            <View style={[styles.detailRow, styles.detailRowBorder, styles.totalRow]}>
              <Text style={styles.totalLabel}>TOTAL NET</Text>
              <Text style={styles.totalValue}>2 300 FCFA</Text>
            </View>
          </View>
        </View>

        {/* Reference */}
        <View style={styles.refBlock}>
          <Text style={styles.refLabel}>Référence course</Text>
          <Text style={styles.refValue}>#MAL-2847</Text>
          <Text style={styles.refNote}>Conservez ce reçu pour tout litige</Text>
        </View>
      </ScrollView>
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
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(169,208,182,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIcon: { fontSize: 16 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 24,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptBrand: { gap: 2 },
  receiptLogo: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 2,
  },
  receiptSub: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  receiptStatusBadge: {
    borderRadius: 9999,
    backgroundColor: Colors.successDark,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  receiptStatusText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  amountBlock: {
    alignItems: 'center',
    gap: 6,
    borderRadius: Radii.xl,
    backgroundColor: Colors.darkGreen,
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 42,
    fontWeight: '900',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  amountDate: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  routeBlock: {
    borderRadius: Radii.md,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 16,
    gap: 8,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  routeStopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
  },
  routeStopDotDest: {
    borderWidth: 2,
    borderColor: Colors.greenMid,
    backgroundColor: 'transparent',
  },
  routeStopInfo: { gap: 2 },
  routeStopLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  routeStopName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: Colors.goldLight,
    marginLeft: 5,
    opacity: 0.3,
  },
  detailsCard: {
    borderRadius: Radii.md,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  detailRowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(65,72,67,0.3)',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  totalRow: {
    backgroundColor: 'rgba(26,61,43,0.4)',
    paddingVertical: 16,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  refBlock: {
    alignItems: 'center',
    gap: 4,
    opacity: 0.6,
  },
  refLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  refValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  refNote: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
});
