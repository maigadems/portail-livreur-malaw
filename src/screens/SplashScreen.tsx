import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/theme';
import { getStoredUser } from '../api/client';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const navigation = useNavigation<any>();

  useEffect(() => {
    // Une session existe déjà sur l'appareil (connexion précédente) : on saute
    // directement au dashboard plutôt que de rejouer Inscription/Connexion à
    // chaque relance — même logique que le portail-client.
    let active = true;
    const timer = setTimeout(async () => {
      const user = await getStoredUser().catch(() => null);
      if (!active) return;
      // reset : la destination devient la racine de la pile (pas de Splash
      // en dessous), donc aucun "retour" ne revient sur le Splash/Connexion.
      navigation.reset({
        index: 0,
        routes: [{ name: user ? 'DashboardEnLigne' : 'Connexion' }],
      });
    }, 2800);
    return () => { active = false; clearTimeout(timer); };
  }, []);

  return (
    <View style={styles.container}>
      {/* Ambient halo - large cream blurred circle */}
      <View style={styles.haloCircle} />

      {/* Center branding cluster */}
      <View style={styles.brandingCluster}>
        {/* Logo circle with cream halo */}
        <View style={styles.logoHalo}>
          <View style={styles.logoInner}>
            <Image
              source={require('../../assets/malaw-logo.png')}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Typography stack */}
        <View style={styles.typographyStack}>
          <Text style={styles.brandName}>MALAW</Text>
          <Text style={styles.tagline}>Espace Livreur</Text>
        </View>
      </View>

      {/* Bottom decorative area */}
      <View style={styles.bottomArea}>
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
        </View>

        {/* Footer meta */}
        <Text style={styles.footerText}>DAKAR, SÉNÉGAL</Text>
      </View>

      {/* Bottom gold wave decoration at 10% opacity */}
      <View style={styles.decorativeBottom} pointerEvents="none">
        <LinearGradient
          colors={['transparent', 'rgba(200,150,62,0.10)']}
          style={styles.bottomGradient}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloCircle: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: Colors.cream,
    opacity: 0.06,
    top: height * 0.22,
    left: -55,
  },
  brandingCluster: {
    alignItems: 'center',
    gap: 32,
  },
  logoHalo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(245,240,226,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(245,240,226,0.3)',
  },
  logoImage: {
    width: 96,
    height: 96,
  },
  typographyStack: {
    alignItems: 'center',
    gap: 8,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  bottomArea: {
    position: 'absolute',
    bottom: 48,
    alignItems: 'center',
    gap: 16,
    width: 240,
  },
  progressContainer: {
    width: 240,
    alignItems: 'center',
  },
  progressTrack: {
    width: 240,
    height: 4,
    borderRadius: 9999,
    backgroundColor: 'rgba(245,240,226,0.20)',
    overflow: 'hidden',
  },
  progressFill: {
    width: 79,
    height: 4,
    borderRadius: 9999,
    backgroundColor: Colors.cream,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 2,
    textAlign: 'center',
  },
  decorativeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 128,
    pointerEvents: 'none',
  },
  bottomGradient: {
    flex: 1,
  },
});
