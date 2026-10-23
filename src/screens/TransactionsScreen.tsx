import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import BottomNavBar from '../components/BottomNavBar';
import { Alert } from '../components/AppAlert';
import { listEntries, LedgerEntry, LedgerEntryType } from '../api/wallet';

const PAGE_SIZE = 25;

type TxFilter = 'Tout' | 'Gains' | 'Retraits' | 'Espèces';

/** Regroupement des natures d'écriture derrière chaque filtre. */
const FILTER_TYPES: Record<Exclude<TxFilter, 'Tout'>, LedgerEntryType[]> = {
  Gains: ['DELIVERY_EARNING', 'ORDER_SALE'],
  Retraits: ['WITHDRAWAL', 'WITHDRAWAL_REVERSAL'],
  Espèces: ['CASH_COLLECTED'],
};

const ENTRY_ICONS: Record<LedgerEntryType, string> = {
  DELIVERY_EARNING: '🏍️',
  ORDER_SALE: '🧾',
  PLATFORM_COMMISSION: '🏷️',
  CASH_COLLECTED: '💵',
  WITHDRAWAL: '💳',
  WITHDRAWAL_REVERSAL: '↩️',
  ADJUSTMENT: '⚖️',
};

/**
 * Une baisse de solde inexpliquée inquiète : on dit pour chaque type de débit
 * d'où il vient, en particulier les espèces encaissées pour la plateforme.
 */
const ENTRY_NOTES: Partial<Record<LedgerEntryType, string>> = {
  CASH_COLLECTED: 'Espèces encaissées pour Malaw — à reverser',
  PLATFORM_COMMISSION: 'Commission de la plateforme',
  WITHDRAWAL: 'Retrait demandé',
  WITHDRAWAL_REVERSAL: 'Retrait annulé ou refusé, montant restitué',
  ADJUSTMENT: 'Régularisation',
};

const fmt = (n: number) => n.toLocaleString('fr-FR');

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

export default function TransactionsScreen() {
  const navigation = useNavigation<any>();
  const [activeFilter, setActiveFilter] = useState<TxFilter>('Tout');
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const filters: TxFilter[] = ['Tout', 'Gains', 'Retraits', 'Espèces'];

  useFocusEffect(useCallback(() => {
    let active = true;
    listEntries({ limit: PAGE_SIZE })
      .then((res) => {
        if (!active) return;
        setEntries(res.items);
        setCursor(res.nextCursor);
      })
      .catch((e: any) => {
        if (active) Alert.alert('Relevé indisponible', e?.message ?? 'Réessayez dans un instant.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  const loadMore = useCallback(() => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    listEntries({ limit: PAGE_SIZE, cursor })
      .then((res) => {
        setEntries((prev) => [...prev, ...res.items]);
        setCursor(res.nextCursor);
      })
      .catch((e: any) => {
        Alert.alert('Chargement interrompu', e?.message ?? 'Réessayez dans un instant.');
      })
      .finally(() => setLoadingMore(false));
  }, [cursor, loadingMore]);

  const filtered = activeFilter === 'Tout'
    ? entries
    : entries.filter((e) => FILTER_TYPES[activeFilter].includes(e.type));

  const totalIn = filtered.filter((e) => e.amountXof > 0).reduce((acc, e) => acc + e.amountXof, 0);
  const totalOut = filtered.filter((e) => e.amountXof < 0).reduce((acc, e) => acc - e.amountXof, 0);
  const hasCash = filtered.some((e) => e.type === 'CASH_COLLECTED');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Relevé</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>ENTRANTS</Text>
            <Text style={styles.summaryValueGreen}>+{fmt(totalIn)}</Text>
            <Text style={styles.summaryUnit}>FCFA</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>SORTANTS</Text>
            <Text style={styles.summaryValueRed}>−{fmt(totalOut)}</Text>
            <Text style={styles.summaryUnit}>FCFA</Text>
          </View>
        </View>
        {/* Les totaux ne portent que sur ce qui est chargé : le dire évite de
            les faire passer pour un cumul complet. */}
        <Text style={styles.summaryScope}>
          Calculé sur les {filtered.length} écriture{filtered.length > 1 ? 's' : ''} affichée
          {filtered.length > 1 ? 's' : ''}
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {filters.map((f) => (
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

        {hasCash && (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeIcon}>💵</Text>
            <Text style={styles.noticeText}>
              Les espèces encaissées auprès des clients appartiennent à Malaw : elles sont
              retirées de votre solde jusqu'à ce que vous les reversiez.
            </Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={Colors.goldLight} style={{ marginVertical: 32 }} />
        ) : (
          <View style={styles.txList}>
            {filtered.map((entry) => {
              const credit = entry.amountXof >= 0;
              const note = ENTRY_NOTES[entry.type];
              return (
                <View key={entry.id} style={styles.txItem}>
                  <View style={styles.txIconBg}>
                    <Text style={styles.txIcon}>{ENTRY_ICONS[entry.type] ?? '•'}</Text>
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txLabel} numberOfLines={2}>{entry.label}</Text>
                    {!!note && <Text style={styles.txSub}>{note}</Text>}
                    <Text style={styles.txDate}>{fmtDate(entry.createdAt)}</Text>
                  </View>
                  <View style={styles.txRight}>
                    <Text
                      style={[styles.txAmount, { color: credit ? Colors.successDark : Colors.errorLight }]}
                    >
                      {credit ? '+' : '−'}{fmt(Math.abs(entry.amountXof))}
                    </Text>
                    <Text style={styles.txCurrency}>FCFA</Text>
                    <Text style={styles.txBalance}>Solde {fmt(entry.balanceAfterXof)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {!loading && filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>Aucune écriture dans cette catégorie</Text>
          </View>
        )}

        {!loading && cursor && (
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={loadMore}
            disabled={loadingMore}
            activeOpacity={0.85}
          >
            {loadingMore ? (
              <ActivityIndicator color={Colors.goldLight} size="small" />
            ) : (
              <Text style={styles.moreBtnText}>Charger plus</Text>
            )}
          </TouchableOpacity>
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
  summaryScope: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.dimText,
    fontFamily: 'Manrope_500Medium',
    marginTop: -8,
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
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(244,189,97,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244,189,97,0.2)',
    padding: 14,
  },
  noticeIcon: { fontSize: 20 },
  noticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 18,
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
  txRight: { alignItems: 'flex-end' },
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
  txBalance: {
    fontSize: 10,
    fontWeight: '400',
    color: Colors.dimText,
    fontFamily: 'Manrope_500Medium',
    marginTop: 2,
  },
  moreBtn: {
    height: 52,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'rgba(244,189,97,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
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
