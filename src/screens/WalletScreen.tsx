import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import BottomNavBar from '../components/BottomNavBar';
import { getEarnings, getMyDeliveries, Earnings, CourierDelivery } from '../api/couriers';
import { totalWithdrawn } from '../api/withdrawals';

const { width } = Dimensions.get('window');

const fmt = (n: number) => n.toLocaleString('fr-FR');

export default function WalletScreen() {
  const navigation = useNavigation<any>();
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [recent, setRecent] = useState<CourierDelivery[]>([]);
  const [withdrawn, setWithdrawn] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([getEarnings(), getMyDeliveries(), totalWithdrawn()])
      .then(([e, d, wd]) => {
        if (!active) return;
        setEarnings(e);
        // Seules les livraisons livrées ont généré un gain.
        setRecent(d.filter((x) => x.status === 'DELIVERED').slice(0, 5));
        setWithdrawn(wd);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  const allTime = earnings?.allTime.totalXof ?? 0;
  const balance = Math.max(0, allTime - withdrawn); // solde disponible
  const weekTotal = earnings?.week.totalXof ?? 0;
  const todayTotal = earnings?.today.totalXof ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* TopBar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Mon Wallet</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
          <Text style={styles.historyLink}>Tout voir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceCardDecor} />
          <View style={styles.balanceCardDecor2} />
          <Text style={styles.balanceLabel}>SOLDE DISPONIBLE</Text>
          <Text style={styles.balanceValue}>{loading ? '—' : fmt(balance)}</Text>
          <Text style={styles.balanceCurrency}>FCFA</Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatLabel}>Aujourd'hui</Text>
              <Text style={styles.balanceStatValue}>+{fmt(todayTotal)} FCFA</Text>
            </View>
            <View style={styles.balanceStatDivider} />
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatLabel}>Cette semaine</Text>
              <Text style={styles.balanceStatValue}>+{fmt(weekTotal)} FCFA</Text>
            </View>
          </View>
          {/* Nombre de courses livrées */}
          <View style={styles.paymentMethodBadge}>
            <Text style={styles.paymentMethodIcon}>🏍️</Text>
            <Text style={styles.paymentMethodText}>
              {earnings?.allTime.count ?? 0} course{(earnings?.allTime.count ?? 0) > 1 ? 's' : ''} livrée{(earnings?.allTime.count ?? 0) > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Retrait')}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconBg, { backgroundColor: Colors.goldLight }]}>
              <Text style={styles.actionIcon}>💸</Text>
            </View>
            <Text style={styles.actionLabel}>Retirer</Text>
            <Text style={styles.actionSub}>Wave / Orange Money</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Transactions')}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconBg, { backgroundColor: 'rgba(169,208,182,0.2)' }]}>
              <Text style={styles.actionIcon}>📊</Text>
            </View>
            <Text style={styles.actionLabel}>Transactions</Text>
            <Text style={styles.actionSub}>Historique complet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('DetailsHebdos')}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconBg, { backgroundColor: 'rgba(244,189,97,0.12)' }]}>
              <Text style={styles.actionIcon}>📅</Text>
            </View>
            <Text style={styles.actionLabel}>Gains hebdos</Text>
            <Text style={styles.actionSub}>Détails & bonus</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Transactions')}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconBg, { backgroundColor: 'rgba(255,180,171,0.12)' }]}>
              <Text style={styles.actionIcon}>📄</Text>
            </View>
            <Text style={styles.actionLabel}>Reçus</Text>
            <Text style={styles.actionSub}>Courses & paiements</Text>
          </TouchableOpacity>
        </View>

        {/* Gains de la semaine */}
        <View style={styles.nextPayoutCard}>
          <View style={styles.nextPayoutLeft}>
            <Text style={styles.nextPayoutIcon}>📅</Text>
            <View style={styles.nextPayoutText}>
              <Text style={styles.nextPayoutLabel}>Cette semaine</Text>
              <Text style={styles.nextPayoutDate}>
                {earnings?.week.count ?? 0} course{(earnings?.week.count ?? 0) > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <View style={styles.nextPayoutAmount}>
            <Text style={styles.nextPayoutAmountValue}>{fmt(weekTotal)}</Text>
            <Text style={styles.nextPayoutAmountCurrency}>FCFA</Text>
          </View>
        </View>

        {/* Recent transactions */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>RÉCENTS</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={styles.recentSeeAll}>Voir tout →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.txList}>
            {loading ? (
              <ActivityIndicator color={Colors.goldLight} style={{ paddingVertical: 20 }} />
            ) : recent.length === 0 ? (
              <Text style={styles.emptyText}>Aucune course livrée pour le moment.</Text>
            ) : (
              recent.map((d) => (
                <View key={d.id} style={styles.txItem}>
                  <View style={styles.txIconBg}>
                    <Text style={styles.txIcon}>🏍️</Text>
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txLabel} numberOfLines={1}>{d.order.restaurant.name}</Text>
                    <Text style={styles.txDate}>
                      {d.deliveredAt ? new Date(d.deliveredAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: Colors.successDark }]}>
                    +{fmt(d.order.deliveryFee)} FCFA
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <BottomNavBar active="gains" homeScreen="DashboardEnLigne" />
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
  backBtn: { width: 34, height: 28, justifyContent: 'center' },
  backArrow: { fontSize: 22, color: Colors.cream, fontWeight: '600' },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  historyLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  scrollArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 20,
  },
  balanceCard: {
    borderRadius: Radii.xxl,
    backgroundColor: Colors.darkGreen,
    padding: 28,
    gap: 6,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
  },
  balanceCardDecor: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.goldLight,
    opacity: 0.05,
    top: -60,
    right: -40,
  },
  balanceCardDecor2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: Colors.greenMid,
    opacity: 0.06,
    bottom: -40,
    left: -20,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1.5,
  },
  balanceValue: {
    fontSize: 52,
    fontWeight: '900',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 60,
  },
  balanceCurrency: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
    marginTop: -4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    width: '100%',
    justifyContent: 'center',
  },
  balanceStat: { alignItems: 'center', gap: 2 },
  balanceStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  balanceStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  balanceStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.1)' },
  paymentMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  paymentMethodIcon: { fontSize: 14 },
  paymentMethodText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
    flex: 1,
  },
  paymentMethodStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.successDark,
    fontFamily: 'Manrope_500Medium',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 48 - 12) / 2,
    borderRadius: Radii.xl,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 18,
    gap: 8,
    alignItems: 'flex-start',
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: { fontSize: 24 },
  actionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  actionSub: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  nextPayoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.md,
    backgroundColor: 'rgba(244,189,97,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244,189,97,0.2)',
    padding: 16,
  },
  nextPayoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextPayoutIcon: { fontSize: 24 },
  nextPayoutText: { gap: 2 },
  nextPayoutLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.8,
  },
  nextPayoutDate: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  nextPayoutAmount: { alignItems: 'flex-end' },
  nextPayoutAmountValue: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  nextPayoutAmountCurrency: {
    fontSize: 12,
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.7,
  },
  recentSection: { gap: 12 },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  recentSeeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  txList: { gap: 8 },
  emptyText: {
    fontSize: 13,
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    paddingVertical: 20,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: Radii.md,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.3)',
    padding: 14,
  },
  txIconBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIcon: { fontSize: 18 },
  txInfo: { flex: 1, gap: 2 },
  txLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  txDate: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Manrope_500Medium',
  },
});
