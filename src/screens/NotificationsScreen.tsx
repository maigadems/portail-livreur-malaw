import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { Colors, Radii } from '../constants/theme';
import BottomNavBar from '../components/BottomNavBar';
import LivreurAvatar from '../components/LivreurAvatar';
import { Alert } from '../components/AppAlert';
import {
  listNotifications, markRead, markAllRead, removeNotification,
  filterNotifications, AppNotification, NotificationFilter,
} from '../api/notifications';

const FILTERS: { key: NotificationFilter; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'courses', label: 'Courses' },
  { key: 'paiements', label: 'Paiements' },
  { key: 'infos', label: 'Infos' },
];

/**
 * Le serveur émet des types précis (`courier_delivery_available`,
 * `payout_paid`, `courier_kyc_rejected`…) tandis que `filterNotifications`
 * raisonne par familles. On traduit ici, sans quoi les pastilles de filtre ne
 * retiendraient jamais rien. Tout type inconnu tombe dans « Infos » plutôt que
 * de disparaître de l'écran.
 */
function canonicalType(type: string): string {
  const t = (type ?? '').toLowerCase();
  if (t.startsWith('order_')) return 'order_status';
  if (t.includes('delivery_available')) return 'delivery_available';
  if (t.includes('delivery_cancelled')) return 'delivery_cancelled';
  if (t.includes('kyc')) return 'kyc_decision';
  if (t.startsWith('payout')) return 'payout_processed';
  if (t.includes('dispute')) return 'dispute_resolved';
  if (t.includes('review')) return 'review_received';
  if (t.includes('promo')) return 'promo';
  return 'system';
}

const ICONS: Record<string, { icon: string; bg: string }> = {
  order_status: { icon: '📦', bg: Colors.darkGreen },
  delivery_available: { icon: '🏍️', bg: Colors.darkGreen },
  delivery_cancelled: { icon: '✕', bg: 'rgba(192,57,43,0.25)' },
  kyc_decision: { icon: '📄', bg: 'rgb(57,55,45)' },
  dispute_resolved: { icon: '🛠️', bg: 'rgb(57,55,45)' },
  payout_processed: { icon: '💰', bg: Colors.darkGreen },
  review_received: { icon: '⭐', bg: Colors.goldLight },
  promo: { icon: '🎁', bg: Colors.goldLight },
  system: { icon: 'ℹ️', bg: 'rgb(57,55,45)' },
};

/** Écran à ouvrir au tap, déduit du type et de la charge `data` du serveur. */
function routeFor(n: AppNotification): { screen: string; params?: object } | null {
  const data = (n.data ?? {}) as Record<string, unknown>;
  const orderId = typeof data.orderId === 'string' ? data.orderId : undefined;

  switch (canonicalType(n.type)) {
    case 'delivery_available':
      // La course peut avoir été prise entre-temps : on renvoie vers la liste
      // des courses réellement disponibles, jamais vers une alerte périmée.
      return { screen: 'CoursesDisponibles' };
    case 'delivery_cancelled':
      return { screen: 'MesCourses' };
    case 'payout_processed':
      return { screen: 'Wallet' };
    case 'kyc_decision':
      return { screen: 'StatutDocuments' };
    case 'review_received':
      return { screen: 'Evaluations' };
    case 'dispute_resolved':
      return orderId ? { screen: 'Historique' } : null;
    default:
      return null;
  }
}

/** Ancienneté lisible, sans dépendance à une librairie de dates. */
function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const minutes = Math.floor((Date.now() - d.getTime()) / 60000);
  if (minutes < 1) return "À L'INSTANT";
  if (minutes < 60) return `IL Y A ${minutes} MIN`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `IL Y A ${hours}H`;
  if (hours < 48) return 'HIER';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase();
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  // Rechargé à chaque affichage : une notification lue ailleurs (push ouvert,
  // autre écran) ne doit pas rester en gras ici.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      listNotifications(50)
        .then((list) => { if (active) setItems(list); })
        .catch((e: any) => {
          if (active) Alert.alert('Notifications indisponibles', e?.message ?? 'Réessayez plus tard.');
        })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, []),
  );

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      setItems(await listNotifications(50));
    } catch (e: any) {
      Alert.alert('Actualisation impossible', e?.message ?? 'Réessayez plus tard.');
    } finally {
      setRefreshing(false);
    }
  };

  const unread = items.filter((n) => !n.readAt).length;

  const onMarkAll = async () => {
    if (markingAll || unread === 0) return;
    const previous = items;
    const now = new Date().toISOString();
    setItems(items.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    setMarkingAll(true);
    try {
      await markAllRead();
    } catch (e: any) {
      setItems(previous);
      Alert.alert('Action impossible', e?.message ?? 'Réessayez dans un instant.');
    } finally {
      setMarkingAll(false);
    }
  };

  const onOpen = async (n: AppNotification) => {
    if (!n.readAt) {
      const now = new Date().toISOString();
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: now } : x)));
      // Le marquage ne doit jamais retarder l'ouverture de l'écran visé :
      // s'il échoue, la notification réapparaîtra non lue au prochain chargement.
      markRead(n.id).catch(() => {
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: null } : x)));
      });
    }
    const route = routeFor(n);
    if (route) navigation.navigate(route.screen, route.params);
  };

  const onDelete = async (n: AppNotification) => {
    const previous = items;
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    try {
      await removeNotification(n.id);
    } catch (e: any) {
      setItems(previous);
      Alert.alert('Suppression impossible', e?.message ?? 'Réessayez dans un instant.');
    }
  };

  // `filterNotifications` travaille sur les familles : on lui passe une copie
  // normalisée, puis on retient les notifications d'origine correspondantes.
  const keptIds = new Set(
    filterNotifications(
      items.map((n) => ({ ...n, type: canonicalType(n.type) })),
      activeFilter,
    ).map((n) => n.id),
  );
  const visible = items.filter((n) => keptIds.has(n.id));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <LivreurAvatar size={40} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.goldLight} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Notifications</Text>
          <TouchableOpacity onPress={onMarkAll} disabled={unread === 0 || markingAll}>
            {markingAll ? (
              <ActivityIndicator color={Colors.goldLight} size="small" />
            ) : (
              <Text style={[styles.markAllRead, unread === 0 && { opacity: 0.4 }]}>
                {unread === 0 ? 'Tout lu ✓' : 'Tout marquer comme\nlu'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Filtres */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterPills}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterPill,
                  activeFilter === f.key ? styles.filterPillActive : styles.filterPillInactive,
                ]}
                onPress={() => setActiveFilter(f.key)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    activeFilter === f.key ? styles.filterPillTextActive : styles.filterPillTextInactive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
        ) : visible.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>
              {items.length === 0 ? 'Aucune notification' : 'Rien dans cette catégorie'}
            </Text>
            <Text style={styles.emptyDesc}>
              {items.length === 0
                ? 'Vos alertes de courses, paiements et documents apparaîtront ici.'
                : 'Changez de filtre pour voir vos autres notifications.'}
            </Text>
          </View>
        ) : (
          <View style={styles.notifList}>
            {visible.map((n) => {
              const unreadItem = !n.readAt;
              const visuals = ICONS[canonicalType(n.type)] ?? ICONS.system;
              return (
                <TouchableOpacity
                  key={n.id}
                  style={[
                    styles.notifCard,
                    unreadItem ? styles.notifCardUnread : styles.notifCardRead,
                    unreadItem && { borderColor: Colors.greenMid },
                  ]}
                  onPress={() => onOpen(n)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.notifIcon, { backgroundColor: visuals.bg }]}>
                    <Text style={{ fontSize: 18 }}>{visuals.icon}</Text>
                  </View>

                  <View style={styles.notifContent}>
                    <View style={styles.notifHeader}>
                      <View style={styles.titleRow}>
                        {unreadItem && <View style={styles.unreadDot} />}
                        <Text
                          style={[
                            styles.notifTitle,
                            { color: unreadItem ? Colors.nearBlack : Colors.greenLight },
                          ]}
                          numberOfLines={2}
                        >
                          {n.title}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.notifTime,
                          { color: unreadItem ? Colors.nearBlack : Colors.muted },
                        ]}
                      >
                        {timeLabel(n.createdAt)}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.notifMessage,
                        { color: unreadItem ? Colors.nearBlack : Colors.muted },
                      ]}
                    >
                      {n.body}
                    </Text>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => onDelete(n)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text
                        style={[
                          styles.deleteBtnText,
                          { color: unreadItem ? 'rgba(0,18,7,0.6)' : Colors.dimText },
                        ]}
                      >
                        Supprimer
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <BottomNavBar active="livraisons" homeScreen="DashboardEnLigne" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.nearBlack,
  },
  topBar: {
    height: 80,
    backgroundColor: Colors.nearBlack,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  scrollArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 96,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  markAllRead: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'right',
    lineHeight: 20,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    height: 44,
    borderRadius: 9999,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: Colors.goldLight,
  },
  filterPillInactive: {
    backgroundColor: Colors.cardDark,
  },
  filterPillText: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
  },
  filterPillTextActive: {
    fontWeight: '700',
    color: 'rgb(67,44,0)',
  },
  filterPillTextInactive: {
    fontWeight: '500',
    color: Colors.muted,
  },
  notifList: {
    gap: 10,
  },
  notifCard: {
    borderRadius: Radii.sm,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    overflow: 'hidden',
  },
  notifCardUnread: {
    backgroundColor: Colors.cream,
    borderWidth: 1,
  },
  notifCardRead: {
    backgroundColor: Colors.cardDark,
  },
  notifIcon: {
    width: 46,
    height: 44,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: {
    flex: 1,
    gap: 6,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.successDark,
  },
  notifTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Manrope_500Medium',
  },
  notifTime: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
  },
  notifMessage: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Manrope_500Medium',
    lineHeight: 20,
  },
  deleteBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope_500Medium',
    textDecorationLine: 'underline',
  },
  emptyCard: {
    borderRadius: Radii.md,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 32,
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 22,
  },
});
