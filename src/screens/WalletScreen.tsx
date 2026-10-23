import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions, ActivityIndicator, Modal, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import BottomNavBar from '../components/BottomNavBar';
import { Alert } from '../components/AppAlert';
import { getEarnings, Earnings } from '../api/couriers';
import {
  getWallet, listEntries, listPayouts,
  Wallet, LedgerEntry, LedgerEntryType, Payout,
  PAYOUT_STATUS_LABELS, PAYOUT_METHOD_LABELS, isSettled,
} from '../api/wallet';

const { width } = Dimensions.get('window');

const fmt = (n: number) => n.toLocaleString('fr-FR');

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

/** Pictogramme par nature d'écriture, pour distinguer gain, reversement et retrait. */
const ENTRY_ICONS: Record<LedgerEntryType, string> = {
  DELIVERY_EARNING: '🏍️',
  ORDER_SALE: '🧾',
  PLATFORM_COMMISSION: '🏷️',
  CASH_COLLECTED: '💵',
  WITHDRAWAL: '💳',
  WITHDRAWAL_REVERSAL: '↩️',
  ADJUSTMENT: '⚖️',
};

export default function WalletScreen() {
  const navigation = useNavigation<any>();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [recent, setRecent] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Historique des demandes de retrait : chargé à la demande, dans une modale,
  // faute de route dédiée dans la navigation.
  const [payoutsOpen, setPayoutsOpen] = useState(false);
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [payoutsLoading, setPayoutsLoading] = useState(false);

  const load = useCallback(async (isActive: () => boolean) => {
    // Le portefeuille fait foi pour le solde ; les gains du jour et de la
    // semaine restent l'indicateur d'activité, ils ne s'additionnent pas.
    const [w, e, entries] = await Promise.all([
      getWallet(),
      getEarnings().catch(() => null),
      listEntries({ limit: 5 }).catch(() => ({ items: [], nextCursor: null })),
    ]);
    if (!isActive()) return;
    setWallet(w);
    setEarnings(e);
    setRecent(entries.items);
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    const isActive = () => active;
    load(isActive)
      .catch((e: any) => {
        if (active) Alert.alert('Portefeuille indisponible', e?.message ?? 'Réessayez dans un instant.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(() => true)
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }, [load]);

  const openPayouts = useCallback(() => {
    setPayoutsOpen(true);
    setPayoutsLoading(true);
    listPayouts({ limit: 30 })
      .then((res) => setPayouts(res.items))
      .catch((e: any) => {
        setPayoutsOpen(false);
        Alert.alert('Historique indisponible', e?.message ?? 'Réessayez dans un instant.');
      })
      .finally(() => setPayoutsLoading(false));
  }, []);

  const balance = wallet?.balanceXof ?? 0;
  const pending = wallet?.pendingXof ?? 0;
  const pendingCount = wallet?.pendingPayoutCount ?? 0;
  const lifetime = wallet?.lifetimeEarnedXof ?? 0;
  const weekTotal = earnings?.week.totalXof ?? 0;
  const todayTotal = earnings?.today.totalXof ?? 0;

  return (
    <SafeAreaView style={styles.container}>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.goldLight} />
        }
      >
        {/* Solde du portefeuille serveur */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceCardDecor} />
          <View style={styles.balanceCardDecor2} />
          <Text style={styles.balanceLabel}>SOLDE DISPONIBLE</Text>
          <Text style={styles.balanceValue}>{loading ? '—' : fmt(balance)}</Text>
          <Text style={styles.balanceCurrency}>FCFA</Text>

          {earnings && (
            <View style={styles.balanceRow}>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>Gagné aujourd'hui</Text>
                <Text style={styles.balanceStatValue}>+{fmt(todayTotal)} FCFA</Text>
              </View>
              <View style={styles.balanceStatDivider} />
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>Gagné cette semaine</Text>
                <Text style={styles.balanceStatValue}>+{fmt(weekTotal)} FCFA</Text>
              </View>
            </View>
          )}

          <View style={styles.paymentMethodBadge}>
            <Text style={styles.paymentMethodIcon}>💰</Text>
            <Text style={styles.paymentMethodText}>
              {loading ? 'Chargement…' : `${fmt(lifetime)} FCFA gagnés depuis le début`}
            </Text>
          </View>
        </View>

        {/* Ce qui est immobilisé par une demande en cours : ce n'est ni
            disponible, ni encore versé. */}
        {pendingCount > 0 && (
          <TouchableOpacity style={styles.pendingCard} onPress={openPayouts} activeOpacity={0.85}>
            <View style={styles.pendingLeft}>
              <Text style={styles.pendingIcon}>⏳</Text>
              <View style={styles.pendingText}>
                <Text style={styles.pendingLabel}>En cours de versement</Text>
                <Text style={styles.pendingSub}>
                  {pendingCount} demande{pendingCount > 1 ? 's' : ''} en attente de traitement
                </Text>
              </View>
            </View>
            <View style={styles.pendingAmount}>
              <Text style={styles.pendingAmountValue}>{fmt(pending)}</Text>
              <Text style={styles.pendingAmountCurrency}>FCFA</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Retrait')}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconBg, { backgroundColor: Colors.goldLight }]}>
              <Text style={styles.actionIcon}>💸</Text>
            </View>
            <Text style={styles.actionLabel}>Demander un retrait</Text>
            <Text style={styles.actionSub}>Wave / Orange Money</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={openPayouts} activeOpacity={0.85}>
            <View style={[styles.actionIconBg, { backgroundColor: 'rgba(244,189,97,0.12)' }]}>
              <Text style={styles.actionIcon}>📥</Text>
            </View>
            <Text style={styles.actionLabel}>Mes retraits</Text>
            <Text style={styles.actionSub}>Suivi des demandes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Transactions')}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconBg, { backgroundColor: 'rgba(169,208,182,0.2)' }]}>
              <Text style={styles.actionIcon}>📊</Text>
            </View>
            <Text style={styles.actionLabel}>Relevé</Text>
            <Text style={styles.actionSub}>Toutes les écritures</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('DetailsHebdos')}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconBg, { backgroundColor: 'rgba(255,180,171,0.12)' }]}>
              <Text style={styles.actionIcon}>📅</Text>
            </View>
            <Text style={styles.actionLabel}>Gains hebdos</Text>
            <Text style={styles.actionSub}>Semaine par semaine</Text>
          </TouchableOpacity>
        </View>

        {/* Dernières écritures du relevé */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>DERNIÈRES ÉCRITURES</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={styles.recentSeeAll}>Voir tout →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.txList}>
            {loading ? (
              <ActivityIndicator color={Colors.goldLight} style={{ paddingVertical: 20 }} />
            ) : recent.length === 0 ? (
              <Text style={styles.emptyText}>Aucun mouvement sur votre portefeuille.</Text>
            ) : (
              recent.map((entry) => (
                <View key={entry.id} style={styles.txItem}>
                  <View style={styles.txIconBg}>
                    <Text style={styles.txIcon}>{ENTRY_ICONS[entry.type] ?? '•'}</Text>
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txLabel} numberOfLines={1}>{entry.label}</Text>
                    <Text style={styles.txDate}>{fmtDate(entry.createdAt)}</Text>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: entry.amountXof >= 0 ? Colors.successDark : Colors.errorLight },
                    ]}
                  >
                    {entry.amountXof >= 0 ? '+' : '−'}{fmt(Math.abs(entry.amountXof))} FCFA
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Historique des demandes de retrait */}
      <Modal
        visible={payoutsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPayoutsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mes demandes de retrait</Text>
              <TouchableOpacity onPress={() => setPayoutsOpen(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {payoutsLoading ? (
              <ActivityIndicator color={Colors.goldLight} style={{ paddingVertical: 32 }} />
            ) : !payouts?.length ? (
              <Text style={styles.emptyText}>Vous n'avez encore demandé aucun retrait.</Text>
            ) : (
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 8 }}>
                  {payouts.map((p) => (
                    <View key={p.id} style={styles.payoutItem}>
                      <View style={styles.payoutTop}>
                        <Text style={styles.payoutAmount}>{fmt(p.amountXof)} FCFA</Text>
                        <View
                          style={[
                            styles.payoutBadge,
                            isSettled(p.status) && p.status !== 'PAID' && styles.payoutBadgeMuted,
                            p.status === 'PAID' && styles.payoutBadgePaid,
                          ]}
                        >
                          <Text style={styles.payoutBadgeText}>{PAYOUT_STATUS_LABELS[p.status]}</Text>
                        </View>
                      </View>
                      <Text style={styles.payoutMeta}>
                        {PAYOUT_METHOD_LABELS[p.method]} · {p.destination}
                      </Text>
                      <Text style={styles.payoutMeta}>
                        Demandé le {fmtDate(p.createdAt)}
                        {p.paidAt ? ` · versé le ${fmtDate(p.paidAt)}` : ''}
                      </Text>
                      {p.feeXof > 0 && (
                        <Text style={styles.payoutMeta}>
                          Frais {fmt(p.feeXof)} FCFA · net {fmt(p.netXof)} FCFA
                        </Text>
                      )}
                      {!!p.reference && (
                        <Text style={styles.payoutMeta}>Référence {p.reference}</Text>
                      )}
                      {!!p.rejectionReason && (
                        <Text style={styles.payoutReason}>{p.rejectionReason}</Text>
                      )}
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.md,
    backgroundColor: 'rgba(244,189,97,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244,189,97,0.2)',
    padding: 16,
  },
  pendingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  pendingIcon: { fontSize: 24 },
  pendingText: { gap: 2, flex: 1 },
  pendingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  pendingSub: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  pendingAmount: { alignItems: 'flex-end' },
  pendingAmountValue: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  pendingAmountCurrency: {
    fontSize: 12,
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.7,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '82%',
    backgroundColor: Colors.cardDark,
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    padding: 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(169,208,182,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { fontSize: 16, color: Colors.gold, fontWeight: '700' },
  modalList: { flexGrow: 0 },
  payoutItem: {
    borderRadius: Radii.md,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 14,
    gap: 4,
  },
  payoutTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  payoutAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  payoutBadge: {
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(244,189,97,0.15)',
  },
  payoutBadgeMuted: { backgroundColor: 'rgba(255,180,171,0.15)' },
  payoutBadgePaid: { backgroundColor: 'rgba(39,174,96,0.2)' },
  payoutBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  payoutMeta: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  payoutReason: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
    marginTop: 2,
  },
});
