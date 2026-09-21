import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import BottomNavBar from '../components/BottomNavBar';
import MalawLogo from '../components/MalawLogo';
import LivreurAvatar from '../components/LivreurAvatar';

const faqs = [
  { icon: '❓', question: 'Comment signaler un litige ?', screen: 'Litige' },
  { icon: '💰', question: 'Comment suivre mes paiements ?', screen: 'Wallet' },
  { icon: '📄', question: 'Mettre à jour mes documents', screen: 'StatutDocuments' },
  { icon: '🔔', question: 'Gérer mes notifications', screen: 'Notifications' },
];

export default function AideScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      {/* TopAppBar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <MalawLogo size={40} />
        </View>
        <View style={styles.topBarRight}>
          <Text style={styles.aideLabel}>Aide</Text>
          <LivreurAvatar size={40} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchIcon}>
            <Text style={{ fontSize: 18, color: 'rgb(36,57,44)' }}>🔍</Text>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Chercher dans l'aide..."
            placeholderTextColor="rgba(36,57,44,0.5)"
          />
        </View>

        {/* Immediate help card */}
        <View style={styles.immediateHelpCard}>
          {/* Decorative pattern */}
          <View style={styles.decorPattern} pointerEvents="none">
            <Text style={styles.decorPatternText}>🏍️</Text>
          </View>

          <View style={styles.immediateHelpContent}>
            <View style={styles.immediateHelpHeader}>
              <Text style={styles.immediateHelpTitle}>Besoin d'aide immédiate?</Text>
              <Text style={styles.immediateHelpDesc}>
                Nos agents sont prêts à vous assister pour{'\n'}toute urgence sur la route.
              </Text>
            </View>

            <View style={styles.immediateHelpBtns}>
              {/* WhatsApp → simule ouverture, redirige vers Litige pour signalement */}
              <TouchableOpacity style={styles.whatsappBtn} onPress={() => navigation.navigate('Litige')}>
                <Text style={styles.whatsappIcon}>💬</Text>
                <Text style={styles.whatsappBtnText}>WhatsApp</Text>
              </TouchableOpacity>
              {/* Appeler → redirige vers litige/signalement */}
              <TouchableOpacity style={styles.callBtn} onPress={() => navigation.navigate('Litige')}>
                <Text style={styles.callIcon}>📞</Text>
                <Text style={styles.callBtnText}>Appeler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* FAQ section */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Questions fréquentes</Text>
          <View style={styles.faqList}>
            {faqs.map((faq, i) => (
              <TouchableOpacity
                key={i}
                style={styles.faqItem}
                activeOpacity={0.8}
                onPress={() => navigation.navigate(faq.screen as any)}
              >
                <View style={styles.faqItemLeft}>
                  <View style={styles.faqIconBg}>
                    <Text style={styles.faqIcon}>{faq.icon}</Text>
                  </View>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                </View>
                <Text style={styles.faqArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Hours footer */}
        <View style={styles.hoursFooter}>
          <View style={styles.hoursRow}>
            <Text style={styles.hoursIcon}>🕒</Text>
            <Text style={styles.hoursLabel}>Disponibilité du support</Text>
          </View>
          <Text style={styles.hoursValue}>Lundi - Dimanche: 8h-22h</Text>
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
  hamburgerLine: {
    width: 18,
    height: 2,
    backgroundColor: Colors.cream,
    borderRadius: 1,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aideLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gold,
    fontFamily: 'Manrope_500Medium',
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
    paddingTop: 24,
    paddingBottom: 40,
    gap: 20,
  },
  searchContainer: {
    height: 64,
    borderRadius: Radii.md,
    backgroundColor: Colors.cream,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  searchIcon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: 'rgb(36,57,44)',
    fontFamily: 'Manrope_500Medium',
  },
  immediateHelpCard: {
    borderRadius: Radii.xl,
    backgroundColor: Colors.darkGreen,
    padding: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  decorPattern: {
    position: 'absolute',
    top: 16,
    right: 16,
    opacity: 0.10,
  },
  decorPatternText: {
    fontSize: 80,
  },
  immediateHelpContent: {
    gap: 20,
  },
  immediateHelpHeader: {
    gap: 8,
  },
  immediateHelpTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
  },
  immediateHelpDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 22,
    opacity: 0.85,
  },
  immediateHelpBtns: {
    gap: 12,
  },
  whatsappBtn: {
    height: 56,
    borderRadius: Radii.sm,
    backgroundColor: Colors.goldLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  whatsappIcon: {
    fontSize: 18,
  },
  whatsappBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
  callBtn: {
    height: 56,
    borderRadius: Radii.sm,
    borderWidth: 2,
    borderColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  callIcon: {
    fontSize: 18,
  },
  callBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
  },
  faqSection: {
    gap: 12,
  },
  faqTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  faqList: {
    gap: 8,
  },
  faqItem: {
    height: 80,
    borderRadius: Radii.md,
    backgroundColor: Colors.cream,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  faqIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqIcon: {
    fontSize: 18,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgb(36,57,44)',
    fontFamily: 'Manrope_500Medium',
  },
  faqArrow: {
    fontSize: 20,
    color: 'rgb(36,57,44)',
  },
  hoursFooter: {
    alignItems: 'center',
    gap: 8,
    opacity: 0.6,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hoursIcon: {
    fontSize: 11,
  },
  hoursLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  hoursValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
});
