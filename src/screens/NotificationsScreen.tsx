import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import BottomNavBar from '../components/BottomNavBar';
import LivreurAvatar from '../components/LivreurAvatar';

type FilterType = 'Toutes' | 'Courses' | 'Paiements' | 'Infos';

const notifications = [
  {
    type: 'payment',
    icon: '🏍️',
    iconBg: Colors.darkGreen,
    iconColor: Colors.greenMid,
    title: 'Paiement reçu',
    timeLabel: "AUJOURD'HUI",
    amount: '47,300 FCFA',
    message: 'Le montant a été crédité sur votre portefeuille Malaw.',
    unread: true,
    borderColor: Colors.greenMid,
  },
  {
    type: 'delivery',
    icon: '✓',
    iconBg: Colors.darkGreen,
    iconColor: Colors.greenMid,
    title: 'Course terminée',
    timeLabel: 'IL Y A 3H',
    amount: null,
    message: 'Livraison réussie à Point E. Votre client a validé la réception.',
    unread: false,
    borderColor: 'transparent',
  },
  {
    type: 'review',
    icon: '⭐',
    iconBg: Colors.goldLight,
    iconColor: Colors.goldLight,
    title: 'Nouvel avis reçu',
    timeLabel: 'HIER',
    amount: null,
    message: '"Excellent service, très poli et rapide. Merci !"',
    unread: false,
    borderColor: 'transparent',
    stars: 5,
  },
  {
    type: 'document',
    icon: '📄',
    iconBg: 'rgb(57,55,45)',
    iconColor: 'rgb(203,198,185)',
    title: 'Rappel : Documents',
    timeLabel: 'HIER',
    amount: null,
    message: 'Votre assurance moto expire dans 5 jours. Veuillez mettre à jour vos documents.',
    unread: false,
    borderColor: 'transparent',
    action: 'Mettre à jour maintenant',
  },
];

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const [activeFilter, setActiveFilter] = useState<FilterType>('Toutes');
  const [allRead, setAllRead] = useState(false);
  const filters: FilterType[] = ['Toutes', 'Courses', 'Paiements', 'Infos'];

  return (
    <SafeAreaView style={styles.container}>
      {/* TopAppBar */}
      <View style={styles.topBar}>
        <LivreurAvatar size={40} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Notifications</Text>
          <TouchableOpacity onPress={() => setAllRead(true)}>
            <Text style={[styles.markAllRead, allRead && { opacity: 0.4 }]}>
              {allRead ? 'Tout lu ✓' : 'Tout marquer comme\nlu'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterPills}>
            {filters.map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterPill,
                  activeFilter === f ? styles.filterPillActive : styles.filterPillInactive,
                ]}
                onPress={() => setActiveFilter(f)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    activeFilter === f ? styles.filterPillTextActive : styles.filterPillTextInactive,
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Notifications list */}
        <View style={styles.notifList}>
          {notifications.map((notif, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.notifCard,
                notif.unread && !allRead ? styles.notifCardUnread : styles.notifCardRead,
                notif.unread && !allRead && { borderColor: Colors.greenMid },
              ]}
              onPress={() => {
                if (notif.type === 'payment') navigation.navigate('Wallet');
                else if (notif.type === 'delivery') navigation.navigate('RecuCourse');
                else if (notif.type === 'review') navigation.navigate('Evaluations');
                else if (notif.type === 'document') navigation.navigate('StatutDocuments');
              }}
              activeOpacity={0.8}
            >
              {/* Unread indicator */}
              {notif.unread && <View style={styles.unreadIndicator} />}

              {/* Icon */}
              <View style={[styles.notifIcon, { backgroundColor: notif.iconBg }]}>
                <Text style={{ fontSize: 18 }}>{notif.icon}</Text>
              </View>

              {/* Content */}
              <View style={styles.notifContent}>
                <View style={styles.notifHeader}>
                  <Text
                    style={[
                      styles.notifTitle,
                      { color: notif.unread ? Colors.nearBlack : Colors.greenLight },
                    ]}
                  >
                    {notif.title}
                  </Text>
                  <Text
                    style={[
                      styles.notifTime,
                      { color: notif.unread ? Colors.nearBlack : Colors.muted },
                    ]}
                  >
                    {notif.timeLabel}
                  </Text>
                </View>

                {notif.amount && (
                  <Text
                    style={[
                      styles.notifAmount,
                      { color: notif.unread ? Colors.darkGreen : Colors.greenLight },
                    ]}
                  >
                    {notif.amount}
                  </Text>
                )}

                {notif.stars && (
                  <View style={styles.starsRow}>
                    {[...Array(notif.stars)].map((_, s) => (
                      <Text key={s} style={styles.star}>⭐</Text>
                    ))}
                  </View>
                )}

                <Text
                  style={[
                    styles.notifMessage,
                    { color: notif.unread ? Colors.nearBlack : Colors.muted },
                  ]}
                >
                  {notif.message}
                </Text>

                {notif.action && (
                  <TouchableOpacity
                    style={styles.notifAction}
                    onPress={() => navigation.navigate('Documents')}
                  >
                    <Text style={styles.notifActionText}>{notif.action}</Text>
                    <Text style={{ color: Colors.goldLight, fontSize: 12 }}>→</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
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
  backBtn: {
    width: 34,
    height: 28,
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: Colors.cream,
    fontWeight: '600',
  },
  hamburger: {
    gap: 3,
  },
  hamburgerLine: {
    width: 18,
    height: 2,
    backgroundColor: Colors.cream,
    borderRadius: 1,
  },
  logoPlaceholder: {
    width: 66,
    height: 60,
    backgroundColor: 'rgba(217,217,217,0.2)',
    borderRadius: 4,
  },
  avatarBorder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.darkGreenTint,
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
    position: 'relative',
    overflow: 'hidden',
  },
  notifCardUnread: {
    backgroundColor: Colors.cream,
    borderWidth: 1,
  },
  notifCardRead: {
    backgroundColor: Colors.cardDark,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.successDark,
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
  },
  notifTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Manrope_500Medium',
  },
  notifTime: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
  },
  notifAmount: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Manrope_500Medium',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  star: {
    fontSize: 11,
  },
  notifMessage: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Manrope_500Medium',
    lineHeight: 20,
  },
  notifAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  notifActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
});
