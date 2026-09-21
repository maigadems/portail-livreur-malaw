import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import BottomNavBar from '../components/BottomNavBar';
import LivreurAvatar from '../components/LivreurAvatar';
import { getProfile, CourierProfile } from '../api/couriers';
import { updateProfile } from '../api/auth';
import { pickAvatar } from '../utils/pickAvatar';
import { Alert } from '../components/AppAlert';

const { width } = Dimensions.get('window');

const VEHICLE_LABEL: Record<string, string> = { moto: 'Moto', velo: 'Vélo', voiture: 'Voiture' };

export default function ProfilScreen() {
  const navigation = useNavigation<any>();
  const [profile, setProfile] = useState<CourierProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    getProfile().then((p) => {
      if (!active) return;
      setProfile(p);
      setAvatarUrl(p.avatarUrl ?? null);
    }).catch(() => {});
    return () => { active = false; };
  }, []));

  const handleChangeAvatar = async () => {
    if (savingAvatar) return;
    try {
      const uri = await pickAvatar();
      if (!uri) return;
      setSavingAvatar(true);
      await updateProfile({ avatarUrl: uri });
      setAvatarUrl(uri);
    } catch (e: any) {
      Alert.alert('Photo de profil', e?.message ?? "Impossible de mettre à jour la photo.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const completion = profile?.stats.completionRate;
  const vehicleParts = [
    profile?.vehicleType ? VEHICLE_LABEL[profile.vehicleType] ?? profile.vehicleType : null,
    profile?.vehicleBrand,
    profile?.vehicleColor,
  ].filter(Boolean);

  const menuItems = [
    { label: 'Documents', icon: '📄', screen: 'StatutDocuments', badge: null, status: 'ok' },
    { label: 'Wallet & paiements', icon: '💳', screen: 'Wallet', badge: null, status: null },
    { label: 'Mes évaluations', icon: '⭐', screen: 'Evaluations', badge: null, status: null },
    { label: 'Historique', icon: '📋', screen: 'Historique', badge: null, status: null },
    { label: 'Notifications', icon: '🔔', screen: 'Notifications', badge: '3', status: null },
    { label: 'Paramètres', icon: '⚙️', screen: 'Parametres', badge: null, status: null },
    { label: 'Aide & Support', icon: '❓', screen: 'Aide', badge: null, status: null },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* TopAppBar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.pageTitle}>Mon profil</Text>
        </View>
        <LivreurAvatar size={40} uri={avatarUrl} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <View style={styles.heroCard}>
          {/* Profile info */}
          <View style={styles.profileRow}>
            {/* Avatar — cliquable pour changer la photo */}
            <TouchableOpacity onPress={handleChangeAvatar} activeOpacity={0.8} disabled={savingAvatar}>
              <LivreurAvatar size={80} borderWidth={3} uri={avatarUrl} />
              <View style={styles.avatarEditBadge}>
                <Text style={styles.avatarEditIcon}>{savingAvatar ? '…' : '✎'}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileInfo}
              onPress={() => navigation.navigate('ModifierProfil')}
              activeOpacity={0.8}
            >
              <Text style={styles.profileName}>{profile?.name ?? '—'}</Text>
              <Text style={styles.profilePhone}>{profile?.phone ?? ''}</Text>
              <Text style={[styles.profilePhone, { color: Colors.goldLight, fontSize: 12, marginTop: 2 }]}>
                ✏️ Modifier le profil
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reliability card */}
        <TouchableOpacity style={styles.reliabilityCard} onPress={() => navigation.navigate('Evaluations')} activeOpacity={0.85}>
          <View style={styles.reliabilityHeader}>
            <Text style={styles.reliabilityTitle}>Fiabilité du Livreur</Text>
            <View style={styles.reliabilityScore}>
              <Text style={styles.reliabilityScoreMain}>{completion != null ? completion : '—'}</Text>
              <Text style={styles.reliabilityScoreSub}>/100</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${completion ?? 0}%` }]} />
          </View>

          {/* Stats */}
          <View style={styles.reliabilityStats}>
            <View style={styles.reliabilityStatItem}>
              <Text style={styles.reliabilityStatLabel}>LIVRÉES</Text>
              <Text style={styles.reliabilityStatValue}>{profile?.stats.totalDeliveries ?? 0}</Text>
            </View>
            <View style={styles.reliabilityStatBorder}>
              <Text style={styles.reliabilityStatLabel}>ANNULÉES</Text>
              <Text style={[styles.reliabilityStatValue, { color: Colors.error }]}>{profile?.stats.cancelled ?? 0}</Text>
            </View>
            <View style={styles.reliabilityStatItem}>
              <Text style={styles.reliabilityStatLabel}>NOTE</Text>
              <Text style={styles.reliabilityStatValue}>⭐ {profile?.rating ?? '—'}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Vehicle card */}
        <TouchableOpacity style={styles.vehicleCard} onPress={() => navigation.navigate('ModifierProfil')} activeOpacity={0.85}>
          <View style={styles.vehicleHeader}>
            <View style={styles.vehicleIconBg}>
              <Text style={styles.vehicleIcon}>🏍️</Text>
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleTitle}>Véhicule de livraison</Text>
              <Text style={styles.vehicleSub}>{vehicleParts.length ? vehicleParts.join(' • ') : 'Non renseigné'}</Text>
            </View>
          </View>
          {profile?.vehiclePlate ? (
            <View style={styles.vehiclePlate}>
              <Text style={styles.vehiclePlateLabel}>IMMATRICULATION</Text>
              <Text style={styles.vehiclePlateValue}>{profile.vehiclePlate}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {/* Menu items */}
        <View style={styles.menuList}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.menuItem}
              onPress={() => item.screen && navigation.navigate(item.screen)}
              activeOpacity={0.8}
            >
              <View style={styles.menuItemLeft}>
                <Text style={styles.menuItemIcon}>{item.icon}</Text>
                <Text style={styles.menuItemLabel}>{item.label}</Text>
              </View>
              <View style={styles.menuItemRight}>
                {item.status === 'ok' && (
                  <View style={styles.statusDot}>
                    <Text style={styles.statusDotText}>✓</Text>
                  </View>
                )}
                {item.badge && (
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>{item.badge}</Text>
                  </View>
                )}
                <Text style={styles.menuArrow}>›</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Logout */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => navigation.navigate('ModalDeconnexion')}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomNavBar active="profil" homeScreen="DashboardEnLigne" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.deepBlack,
  },
  topBar: {
    height: 80,
    backgroundColor: Colors.nearBlack,
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
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.gold,
    fontFamily: 'Manrope_500Medium',
  },
  avatarBorder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.goldLight,
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
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 12,
  },
  heroCard: {
    borderRadius: Radii.xl,
    backgroundColor: Colors.darkGreen,
    padding: 24,
    gap: 20,
    position: 'relative',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarLarge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeBorder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: Colors.darkGreenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.darkGreen,
  },
  avatarEditIcon: {
    fontSize: 13,
    color: '#13351F',
  },
  profileInfo: {
    gap: 6,
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
  },
  profilePhone: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.8,
  },
  reliabilityCard: {
    borderRadius: Radii.xl,
    backgroundColor: Colors.cream,
    padding: 24,
    gap: 16,
  },
  reliabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reliabilityTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgb(43,78,59)',
    fontFamily: 'Manrope_500Medium',
  },
  reliabilityScore: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  reliabilityScoreMain: {
    fontSize: 30,
    fontWeight: '900',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  reliabilityScoreSub: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgb(43,78,59)',
    fontFamily: 'Manrope_500Medium',
    marginBottom: 2,
  },
  progressBar: {
    height: 12,
    borderRadius: 9999,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  progressFill: {
    height: 12,
    borderRadius: 9999,
    backgroundColor: Colors.darkGreen,
  },
  reliabilityStats: {
    flexDirection: 'row',
  },
  reliabilityStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  reliabilityStatBorder: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgb(43,78,59)',
  },
  reliabilityStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgb(43,78,59)',
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  reliabilityStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  vehicleCard: {
    borderRadius: Radii.xl,
    backgroundColor: Colors.cream,
    padding: 24,
    gap: 16,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  vehicleIconBg: {
    width: 48,
    height: 38,
    borderRadius: Radii.md,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIcon: {
    fontSize: 20,
  },
  vehicleInfo: {
    gap: 4,
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgb(43,78,59)',
    fontFamily: 'Manrope_500Medium',
  },
  vehicleSub: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgb(43,78,59)',
    fontFamily: 'Manrope_500Medium',
  },
  vehiclePlate: {
    borderRadius: Radii.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgb(43,78,59)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  vehiclePlateLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgb(43,78,59)',
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  vehiclePlateValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'right',
  },
  menuList: {
    gap: 8,
  },
  menuItem: {
    height: 64,
    borderRadius: Radii.lg,
    backgroundColor: Colors.cream,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemIcon: {
    fontSize: 18,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgb(43,78,59)',
    fontFamily: 'Manrope_500Medium',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDotText: {
    color: Colors.white,
    fontSize: 7,
    fontWeight: '900',
  },
  badgePill: {
    width: 22,
    height: 19,
    borderRadius: 9999,
    backgroundColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
  menuArrow: {
    fontSize: 18,
    color: 'rgb(43,78,59)',
  },
  logoutBtn: {
    height: 66,
    borderRadius: Radii.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgb(255,180,171)',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoutIcon: {
    fontSize: 18,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgb(255,180,171)',
    fontFamily: 'Manrope_500Medium',
  },
});
