import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import BottomNavBar from '../components/BottomNavBar';
import MalawLogo from '../components/MalawLogo';
import LivreurAvatar from '../components/LivreurAvatar';

const { width, height } = Dimensions.get('window');

export default function AlerteCourseScreen() {
  const navigation = useNavigation<any>();
  const [countdown, setCountdown] = useState(28);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          navigation.navigate('DashboardEnLigne');
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MalawLogo size={40} />
        </View>
        <LivreurAvatar size={40} />
      </View>

      {/* Map background placeholder */}
      <View style={styles.mapBg}>
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapEmoji}>🗺️</Text>
          <Text style={styles.mapLabel}>Dakar, Sénégal</Text>
        </View>

        {/* Dark overlay */}
        <View style={styles.mapOverlay} />

        {/* Alert card */}
        <View style={styles.alertCard}>
          {/* Countdown top right */}
          <View style={styles.countdownContainer}>
            <View style={styles.countdownCircle}>
              <Text style={styles.countdownText}>{countdown}s</Text>
            </View>
          </View>

          {/* Flashing badge */}
          <Animated.View style={[styles.flashingBadge, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>NOUVELLE COURSE DISPONIBLE</Text>
          </Animated.View>

          {/* Earnings */}
          <View style={styles.earningsBlock}>
            <Text style={styles.earningsLabel}>Gains estimés</Text>
            <View style={styles.earningsRow}>
              <Text style={styles.earningsValue}>3 200</Text>
              <Text style={styles.earningsCurrency}> FCFA</Text>
            </View>
          </View>

          {/* Trip details bento */}
          <View style={styles.tripBento}>
            <View style={styles.tripBentoCard}>
              <Text style={styles.tripBentoLabel}>DISTANCE</Text>
              <Text style={styles.tripBentoValue}>4.8 km</Text>
            </View>
            <View style={styles.tripBentoCard}>
              <Text style={styles.tripBentoLabel}>TEMPS EST.</Text>
              <Text style={styles.tripBentoValue}>18 min</Text>
            </View>
          </View>

          {/* Route path */}
          <View style={styles.routePath}>
            <View style={styles.routePathLine} />
            <View style={styles.routeStop}>
              <View style={styles.routeStopDot} />
              <View style={styles.routeStopInfo}>
                <Text style={styles.routeStopLabel}>PICKUP</Text>
                <Text style={styles.routeStopName}>Almadies, Rue 12</Text>
              </View>
            </View>
            <View style={styles.routeStop}>
              <View style={[styles.routeStopDot, styles.routeStopDotDest]} />
              <View style={styles.routeStopInfo}>
                <Text style={styles.routeStopLabel}>LIVRAISON</Text>
                <Text style={styles.routeStopName}>Plateau, Rue 10</Text>
              </View>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => navigation.navigate('EnRoutePickup')}
              activeOpacity={0.85}
            >
              <Text style={styles.acceptBtnText}>✓  Accepter la course</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.refuseBtn}
              onPress={() => navigation.navigate('DashboardEnLigne')}
              activeOpacity={0.85}
            >
              <Text style={styles.refuseBtnText}>✕  Refuser</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <BottomNavBar active="accueil" homeScreen="DashboardEnLigne" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.deepBlack,
  },
  header: {
    height: 80,
    backgroundColor: Colors.nearBlack,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  headerLeft: {
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
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  avatarBorder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.gold,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.darkGreenTint,
  },
  mapBg: {
    flex: 1,
    position: 'relative',
  },
  mapPlaceholder: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,18,7,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapEmoji: {
    fontSize: 80,
    opacity: 0.3,
  },
  mapLabel: {
    fontSize: 14,
    color: Colors.muted,
    opacity: 0.3,
  },
  mapOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.nearBlack,
    opacity: 0.7,
  },
  alertCard: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 28,
    backgroundColor: Colors.cream,
    padding: 24,
    gap: 16,
  },
  countdownContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  countdownCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: 'rgba(192,57,43,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cream,
  },
  countdownText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.error,
    fontFamily: 'Manrope_500Medium',
  },
  flashingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.successDark,
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  badgeDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.white,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  earningsBlock: {
    gap: 4,
    opacity: 0.6,
  },
  earningsLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  earningsValue: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  earningsCurrency: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    marginBottom: 4,
  },
  tripBento: {
    flexDirection: 'row',
    gap: 12,
  },
  tripBentoCard: {
    flex: 1,
    borderRadius: Radii.md,
    backgroundColor: Colors.darkGreen,
    padding: 12,
    gap: 4,
  },
  tripBentoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  tripBentoValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  routePath: {
    gap: 8,
    position: 'relative',
    paddingLeft: 16,
  },
  routePathLine: {
    position: 'absolute',
    left: 5,
    top: 16,
    width: 2,
    height: 32,
    backgroundColor: Colors.darkGreen,
    opacity: 0.2,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeStopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.darkGreen,
  },
  routeStopDotDest: {
    borderWidth: 2,
    borderColor: Colors.darkGreen,
    backgroundColor: 'transparent',
  },
  routeStopInfo: {
    gap: 2,
  },
  routeStopLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.6,
  },
  routeStopName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  actionButtons: {
    gap: 12,
  },
  acceptBtn: {
    height: 64,
    borderRadius: Radii.sm,
    backgroundColor: Colors.successDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
  },
  refuseBtn: {
    height: 64,
    borderRadius: Radii.sm,
    borderWidth: 2,
    borderColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refuseBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.error,
    fontFamily: 'Manrope_500Medium',
  },
});
