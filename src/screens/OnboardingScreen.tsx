import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';

const { height } = Dimensions.get('window');

// L'accueil n'a de sens qu'une seule fois : l'indicateur est local à
// l'appareil (même motif que ignoredDeliveries.ts), le serveur n'a pas à le
// connaître. Une réinstallation le rejoue, ce qui est acceptable.
const ONBOARDING_SEEN_KEY = '@malaw-livreur/onboardingSeen';

const SLIDES = [
  {
    key: '1',
    emoji: '🏍️',
    badge: 'BIENVENUE',
    title: 'Livrez à Dakar\navec Malaw',
    desc: 'Rejoignez la flotte de livreurs la plus fiable de Dakar. Gagnez à votre rythme, en toute flexibilité.',
    bg: Colors.darkGreen,
    textColor: Colors.cream,
    accentColor: Colors.goldLight,
    btnBg: Colors.goldLight,
    btnText: 'rgb(67,44,0)',
  },
  {
    key: '2',
    emoji: '📲',
    badge: 'ÉTAPE 1',
    title: 'Acceptez les\ncourses en un tap',
    desc: 'Vous recevez une alerte avec les détails complets : trajet, gains estimés, temps. Acceptez ou refusez librement.',
    bg: Colors.cream,
    textColor: Colors.darkGreen,
    accentColor: Colors.gold,
    btnBg: Colors.darkGreen,
    btnText: Colors.cream,
  },
  {
    key: '3',
    emoji: '📦',
    badge: 'ÉTAPE 2',
    title: 'Récupérez &\nlivrez en sécurité',
    desc: 'Naviguez jusqu\'au restaurant, confirmez la prise en charge, puis livrez au client avec un code de validation.',
    bg: Colors.deepBlack,
    textColor: Colors.greenLight,
    accentColor: Colors.goldLight,
    btnBg: Colors.goldLight,
    btnText: 'rgb(67,44,0)',
  },
  {
    key: '4',
    emoji: '💰',
    badge: 'ÉTAPE 3',
    title: 'Gagnez à\nchaque course',
    desc: 'Vos gains sont crédités à chaque course livrée. Vous demandez un retrait quand vous voulez, dès 1 000 FCFA, sur Wave ou Orange Money.',
    bg: Colors.darkGreen,
    textColor: Colors.cream,
    accentColor: Colors.goldLight,
    btnBg: Colors.goldLight,
    btnText: 'rgb(67,44,0)',
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const [current, setCurrent] = useState(0);
  // Tant qu'on ne sait pas si l'accueil a déjà été vu, on n'affiche rien :
  // sinon la première diapositive clignote avant la redirection.
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY)
      .then((seen) => {
        if (cancelled) return;
        if (seen === '1') {
          navigation.reset({ index: 0, routes: [{ name: 'DashboardEnLigne' }] });
        } else {
          setChecking(false);
        }
      })
      // Stockage indisponible : on montre l'accueil plutôt que de bloquer.
      .catch(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [navigation]);

  const finish = async () => {
    // L'échec d'écriture ne doit pas empêcher d'entrer dans l'app : au pire
    // l'accueil sera revu au prochain lancement.
    try { await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1'); } catch {}
    navigation.reset({ index: 0, routes: [{ name: 'DashboardEnLigne' }] });
  };

  const goNext = () => {
    if (current < SLIDES.length - 1) {
      setCurrent(c => c + 1);
    } else {
      finish();
    }
  };

  const skip = () => { finish(); };

  const slide = SLIDES[current];

  if (checking) {
    return <SafeAreaView style={[styles.container, { backgroundColor: SLIDES[0].bg }]} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: slide.bg }]}>
      {/* Skip */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={skip} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: slide.accentColor }]}>Passer</Text>
        </TouchableOpacity>
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === current ? slide.accentColor : 'rgba(255,255,255,0.25)',
                  width: i === current ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>
        <View style={{ width: 56 }} />
      </View>

      {/* Diapositive rendue directement : le fond de l'écran change avec elle,
          ce qu'une liste défilante ne permettrait pas proprement. */}
      <View style={styles.slideContent}>
        {/* Illustration */}
        <View style={styles.illustrationArea}>
          <View style={[styles.illustrationCircle, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
            <View style={[styles.illustrationInner, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
              <Text style={styles.illustrationEmoji}>{slide.emoji}</Text>
            </View>
          </View>
          {/* Decorative rings */}
          <View style={[styles.ring, styles.ring1, { borderColor: 'rgba(255,255,255,0.06)' }]} />
          <View style={[styles.ring, styles.ring2, { borderColor: 'rgba(255,255,255,0.04)' }]} />
        </View>

        {/* Text */}
        <View style={styles.textBlock}>
          <View style={[styles.badgePill, { backgroundColor: slide.accentColor }]}>
            <Text style={[styles.badgeText, { color: slide.btnText as string }]}>{slide.badge}</Text>
          </View>
          <Text style={[styles.slideTitle, { color: slide.textColor }]}>{slide.title}</Text>
          <Text style={[styles.slideDesc, { color: slide.textColor, opacity: 0.75 }]}>{slide.desc}</Text>
        </View>
      </View>

      {/* Bottom CTA */}
      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: slide.btnBg as string }]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={[styles.nextBtnText, { color: slide.btnText as string }]}>
            {current === SLIDES.length - 1 ? 'Commencer à livrer' : 'Suivant'}
          </Text>
          <Text style={[{ color: slide.btnText as string, fontSize: 18, fontWeight: '800' }]}>
            {current === SLIDES.length - 1 ? ' ✓' : ' →'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.stepCount, { color: slide.textColor, opacity: 0.4 }]}>
          {current + 1} sur {SLIDES.length}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    height: 56,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Manrope_500Medium',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  slideContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 40,
  },
  illustrationArea: {
    alignItems: 'center',
    justifyContent: 'center',
    height: height * 0.30,
    position: 'relative',
  },
  illustrationCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationEmoji: {
    fontSize: 72,
  },
  ring: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
  },
  ring1: {
    width: 220,
    height: 220,
  },
  ring2: {
    width: 270,
    height: 270,
  },
  textBlock: {
    gap: 16,
  },
  badgePill: {
    alignSelf: 'flex-start',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1.5,
  },
  slideTitle: {
    fontSize: 34,
    fontWeight: '800',
    fontFamily: 'Manrope_500Medium',
    lineHeight: 42,
  },
  slideDesc: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
    lineHeight: 26,
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
    alignItems: 'center',
  },
  nextBtn: {
    width: '100%',
    height: 64,
    borderRadius: Radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  nextBtnText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Manrope_500Medium',
  },
  stepCount: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
  },
});
