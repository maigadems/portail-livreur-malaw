import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';

export default function ApprobationReussieScreen() {
  const navigation = useNavigation<any>();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Background decorative */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <View style={styles.content}>
        {/* Success animation */}
        <Animated.View style={[styles.successRing, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.successRingInner}>
            <View style={styles.successCheck}>
              <Text style={styles.checkEmoji}>✓</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.textBlock, { opacity: fadeAnim }]}>
          <View style={styles.approvedBadge}>
            <Text style={styles.approvedBadgeText}>COMPTE APPROUVÉ</Text>
          </View>
          <Text style={styles.title}>Félicitations,{'\n'}vous êtes livreur !</Text>
          <Text style={styles.desc}>
            Votre dossier a été validé par l'équipe Malaw.
            Vous pouvez dès maintenant accepter des courses à Dakar.
          </Text>
        </Animated.View>

        {/* Ce qui attend le livreur — uniquement des règles réelles de la
            plateforme (gains crédités par course, retrait à la demande),
            pas d'horaires ni de zone que le serveur ne connaît pas. */}
        <Animated.View style={[styles.infoCards, { opacity: fadeAnim }]}>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardIcon}>💰</Text>
            <View style={styles.infoCardText}>
              <Text style={styles.infoCardTitle}>Vos gains</Text>
              <Text style={styles.infoCardValue}>100 % des frais de livraison, crédités à chaque course livrée</Text>
            </View>
          </View>
          <View style={styles.infoCardDivider} />
          <View style={styles.infoCard}>
            <Text style={styles.infoCardIcon}>🏦</Text>
            <View style={styles.infoCardText}>
              <Text style={styles.infoCardTitle}>Retraits</Text>
              <Text style={styles.infoCardValue}>À la demande dès 1 000 FCFA, validés par Malaw</Text>
            </View>
          </View>
          <View style={styles.infoCardDivider} />
          <View style={styles.infoCard}>
            <Text style={styles.infoCardIcon}>💬</Text>
            <View style={styles.infoCardText}>
              <Text style={styles.infoCardTitle}>Besoin d'aide</Text>
              <Text style={styles.infoCardValue}>Rubrique Aide, depuis votre profil</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* CTA */}
      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] })}
          activeOpacity={0.85}
        >
          <View style={styles.ctaBtnShadow} />
          <Text style={styles.ctaBtnText}>Voir le tutoriel</Text>
          <Text style={{ color: Colors.darkGreen, fontSize: 16 }}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'DashboardEnLigne' }] })}
          style={styles.skipLink}
        >
          <Text style={styles.skipLinkText}>Passer directement au tableau de bord</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkGreen,
  },
  decorCircle1: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: Colors.goldLight,
    opacity: 0.06,
    top: -100,
    right: -100,
  },
  decorCircle2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.cream,
    opacity: 0.04,
    bottom: -80,
    left: -80,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
    gap: 32,
  },
  successRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(244,189,97,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(244,189,97,0.25)',
  },
  successRingInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(244,189,97,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCheck: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkEmoji: {
    fontSize: 36,
    color: 'rgb(67,44,0)',
    fontWeight: '900',
  },
  textBlock: {
    alignItems: 'center',
    gap: 12,
  },
  approvedBadge: {
    borderRadius: 9999,
    backgroundColor: 'rgba(169,208,182,0.2)',
    borderWidth: 1,
    borderColor: Colors.greenMid,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  approvedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 40,
  },
  desc: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.75,
  },
  infoCards: {
    width: '100%',
    borderRadius: Radii.xl,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 4,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
  },
  infoCardIcon: {
    fontSize: 24,
  },
  infoCardText: {
    flex: 1,
    gap: 2,
  },
  infoCardTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
  infoCardValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 20,
  },
  infoCardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 16,
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
    alignItems: 'center',
  },
  ctaBtn: {
    width: '100%',
    height: 64,
    borderRadius: Radii.md,
    backgroundColor: Colors.goldLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  ctaBtnShadow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.white,
    opacity: 0.08,
  },
  ctaBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
  skipLink: {
    paddingVertical: 8,
  },
  skipLinkText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
    textDecorationLine: 'underline',
    opacity: 0.5,
  },
});
