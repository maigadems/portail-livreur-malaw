import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import BottomNavBar from '../components/BottomNavBar';
import { getMyDeliveries } from '../api/couriers';
import { listWithdrawals } from '../api/withdrawals';

type TxFilter = 'Tout' | 'Courses' | 'Retraits';
type Tx = {
  type: 'course' | 'retrait';
  icon: string;
  label: string;
  sub: string;
  date: string;
  amount: number; // signé (+ course, − retrait)
  ts: number;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function TransactionsScreen() {
  const navigation = useNavigation<any>();
  const [activeFilter, setActiveFilter] = useState<TxFilter>('Tout');
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const filters: TxFilter[] = ['Tout', 'Courses', 'Retraits'];

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([getMyDeliveries().catch(() => []), listWithdrawals().catch(() => [])])
      .then(([deliveries, withdrawals]) => {
        if (!active) return;
        // Chaque livraison LIVRÉE = un gain ; chaque retrait = une sortie.
        const courseTx: Tx[] = deliveries
          .filter((d) => d.status === 'DELIVERED')
          .map((d) => ({
            type: 'course' as const,
            icon: '🏍️',
            label: d.order.restaurant.name,
            sub: 'Course livrée',
            date: fmtDate(d.deliveredAt ?? d.createdAt),
            amount: d.order.deliveryFee,
            ts: Date.parse(d.deliveredAt ?? d.createdAt),
          }));
        const wdTx: Tx[] = withdrawals.map((w) => ({
          type: 'retrait' as const,
          icon: '💳',
          label: `Retrait ${w.method === 'orange' ? 'Orange Money' : 'Wave'}`,
          sub: w.phone ?? 'Traité',
          date: fmtDate(w.createdAt),
          amount: -w.amount,
          ts: Date.parse(w.createdAt),
        }));
        setTxs([...courseTx, ...wdTx].sort((a, b) => b.ts - a.ts));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  const filtered = txs.filter(tx => {
    if (activeFilter === 'Courses') return tx.type === 'course';
    if (activeFilter === 'Retraits') return tx.type === 'retrait';
    return true;
  });

  const totalIn = filtered.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
  const totalOut = filtered.filter(t => t.amount < 0).reduce((acc, t) => acc - t.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Transactions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary mini */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>ENTRANTS</Text>
            <Text style={styles.summaryValueGreen}>+{totalIn.toLocaleString('fr-FR')}</Text>
            <Text style={styles.summaryUnit}>FCFA</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>SORTANTS</Text>
            <Text style={styles.summaryValueRed}>-{totalOut.toLocaleString('fr-FR')}</Text>
            <Text style={styles.summaryUnit}>FCFA</Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {filters.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
                onPress={() => setActiveFilter(f)}
              >
                <Text style={[styles.filterPillText, activeFilter === f && styles.filterPillTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* TX list */}
        {loading ? (
          <ActivityIndicator color={Colors.goldLight} style={{ marginVertical: 32 }} />
        ) : (
          <View style={styles.txList}>
            {filtered.map((tx, i) => (
              <View key={i} style={styles.txItem}>
                <View style={styles.txIconBg}>
                  <Text style={styles.txIcon}>{tx.icon}</Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txLabel} numberOfLines={1}>{tx.label}</Text>
                  <Text style={styles.txSub}>{tx.sub}</Text>
                  <Text style={styles.txDate}>{tx.date}</Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={[styles.txAmount, { color: tx.amount >= 0 ? Colors.successDark : Colors.errorLight }]}>
                    {tx.amount >= 0 ? '+' : '-'}{Math.abs(tx.amount).toLocaleString('fr-FR')}
                  </Text>
                  <Text style={styles.txCurrency}>FCFA</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {!loading && filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>Aucune transaction dans cette catégorie</Text>
          </View>
        )}
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
    fontSize: 18,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  scrollArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: Radii.md,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 14,
    gap: 2,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  summaryValueGreen: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.successDark,
    fontFamily: 'Manrope_500Medium',
  },
  summaryValueRed: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
  },
  summaryUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
  },
  filterPillActive: {
    backgroundColor: Colors.goldLight,
    borderColor: Colors.goldLight,
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  filterPillTextActive: {
    fontWeight: '700',
    color: 'rgb(67,44,0)',
  },
  txList: { gap: 8 },
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIcon: { fontSize: 20 },
  txInfo: { flex: 1, gap: 2 },
  txLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  txSub: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  txDate: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.dimText,
    fontFamily: 'Manrope_500Medium',
  },
  txRight: { alignItems: 'flex-end', gap: 0 },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Manrope_500Medium',
  },
  txCurrency: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  txArrow: {
    fontSize: 16,
    color: Colors.dimText,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    opacity: 0.6,
  },
});
