import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Linking, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import BottomNavBar from '../components/BottomNavBar';
import MalawLogo from '../components/MalawLogo';
import LivreurAvatar from '../components/LivreurAvatar';
import { Alert } from '../components/AppAlert';

// À RENSEIGNER par l'équipe : numéro WhatsApp / téléphone du support livreur,
// au format international avec le « + ». Tant qu'il n'est pas renseigné, les
// boutons de contact préviennent le livreur au lieu d'ouvrir un faux numéro.
const SUPPORT_PHONE = '+221XXXXXXXXX';

// Le numéro est considéré comme renseigné dès qu'il ne contient plus le
// gabarit « X » : on évite d'ouvrir WhatsApp sur une adresse invalide.
const SUPPORT_PHONE_SET = /^\+\d{8,15}$/.test(SUPPORT_PHONE);

// Ouverture de l'accordéon animée sur Android (désactivé par défaut).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Faq = {
  icon: string;
  question: string;
  answer: string;
  /** Écran vers lequel une action complémentaire mène (facultatif). */
  link?: { label: string; screen: string };
};

// Les réponses reflètent le fonctionnement réel du serveur (voir le module
// wallet, l'abandon de course et la validation KYC bloquante). Ne pas y
// promettre autre chose que ce que l'app fait vraiment.
const FAQS: Faq[] = [
  {
    icon: '💰',
    question: 'Comment sont calculés mes gains ?',
    answer:
      'Vous percevez 100 % des frais de livraison de chaque course livrée. '
      + 'Le montant est crédité sur votre portefeuille Malaw dès que la remise '
      + 'au client est confirmée par le code à 4 chiffres. Si le client a payé en '
      + 'espèces, le montant encaissé pour le restaurant est déduit de votre '
      + 'portefeuille, car vous le conservez en main propre.',
    link: { label: 'Voir mon portefeuille', screen: 'Wallet' },
  },
  {
    icon: '🏦',
    question: 'Comment retirer mon argent ?',
    answer:
      'Depuis le portefeuille, appuyez sur « Retirer » et indiquez le montant '
      + '(minimum 1 000 FCFA) ainsi que votre numéro Wave ou Orange Money. '
      + 'Votre demande est ensuite vérifiée par l\'équipe Malaw, qui effectue le '
      + 'virement. Vous recevez une notification lorsque le retrait est effectué '
      + 'ou s\'il est refusé, avec le motif. Le virement n\'est pas instantané.',
    link: { label: 'Faire une demande de retrait', screen: 'Retrait' },
  },
  {
    icon: '🍽️',
    question: 'Le restaurant est fermé ou la commande n\'est pas prête, que faire ?',
    answer:
      'Sur l\'écran de la course, ouvrez « Problème au restaurant ». Vous pouvez '
      + 'y ouvrir un litige décrivant la situation et libérer la course : elle '
      + 'redevient disponible pour les autres livreurs. Ces motifs (restaurant '
      + 'fermé, commande pas prête, problème au restaurant) ne vous sont pas '
      + 'imputables et ne comptent pas dans votre taux de fiabilité.',
  },
  {
    icon: '📵',
    question: 'Le client est injoignable, que faire ?',
    answer:
      'Appelez le client 3 fois et patientez 5 minutes sur place. S\'il ne répond '
      + 'toujours pas, utilisez « Client introuvable » depuis l\'écran d\'attente : '
      + 'la course est libérée et le motif n\'est pas imputable, il ne compte pas '
      + 'dans votre taux de fiabilité. Ne quittez pas l\'adresse avant d\'avoir '
      + 'fait ces tentatives, elles sont horodatées.',
  },
  {
    icon: '🔢',
    question: 'À quoi sert le code à 4 chiffres ?',
    answer:
      'Le client dispose d\'un code à 4 chiffres dans son application. Au moment '
      + 'de la remise, il vous le lit à voix haute et vous le saisissez pour '
      + 'confirmer la livraison. C\'est ce code qui déclenche le crédit de vos '
      + 'gains. Il n\'est jamais visible dans votre application : seul le client '
      + 'peut vous le communiquer.',
  },
  {
    icon: '📄',
    question: 'Pourquoi mon dossier bloque mes courses ?',
    answer:
      'La validation de vos pièces (pièce d\'identité, permis de conduire, carte '
      + 'grise) est obligatoire. Tant que votre dossier n\'est pas approuvé par '
      + 'l\'équipe Malaw, vous ne pouvez ni passer en ligne, ni voir, ni accepter '
      + 'de course. Si une pièce est refusée, le motif est indiqué dans votre '
      + 'dossier : remplacez-la et soumettez de nouveau. Une pièce expirée peut '
      + 'aussi bloquer votre activité : renouvelez-la avant l\'échéance.',
    link: { label: 'Voir l\'état de mes documents', screen: 'StatutDocuments' },
  },
];

export default function AideScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Recherche insensible à la casse et aux accents, sur la question ET la
  // réponse, pour qu'un livreur qui tape « wave » trouve la FAQ sur les retraits.
  const normalize = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const visibleFaqs = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return FAQS.map((faq, index) => ({ faq, index }));
    return FAQS
      .map((faq, index) => ({ faq, index }))
      .filter(({ faq }) => normalize(faq.question).includes(q) || normalize(faq.answer).includes(q));
  }, [query]);

  const toggle = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  const warnPhoneMissing = () => {
    Alert.alert(
      'Support indisponible',
      'Le numéro du support n\'est pas encore configuré dans cette version. '
      + 'Vous pouvez ouvrir un litige depuis cet écran.',
    );
  };

  const openWhatsApp = () => {
    if (!SUPPORT_PHONE_SET) { warnPhoneMissing(); return; }
    // wa.me attend le numéro international sans le « + ».
    Linking.openURL(`https://wa.me/${SUPPORT_PHONE.replace(/^\+/, '')}`).catch(() => {
      Alert.alert('WhatsApp indisponible', `Impossible d'ouvrir WhatsApp. Numéro du support : ${SUPPORT_PHONE}`);
    });
  };

  const callSupport = () => {
    if (!SUPPORT_PHONE_SET) { warnPhoneMissing(); return; }
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {
      Alert.alert('Appel impossible', `Impossible de lancer l'appel. Numéro du support : ${SUPPORT_PHONE}`);
    });
  };

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
        keyboardShouldPersistTaps="handled"
      >
        {/* Recherche */}
        <View style={styles.searchContainer}>
          <View style={styles.searchIcon}>
            <Text style={{ fontSize: 18, color: 'rgb(36,57,44)' }}>🔍</Text>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Chercher dans l'aide..."
            placeholderTextColor="rgba(36,57,44,0.5)"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Aide immédiate */}
        <View style={styles.immediateHelpCard}>
          <View style={styles.decorPattern} pointerEvents="none">
            <Text style={styles.decorPatternText}>🏍️</Text>
          </View>

          <View style={styles.immediateHelpContent}>
            <View style={styles.immediateHelpHeader}>
              <Text style={styles.immediateHelpTitle}>Besoin d'aide immédiate ?</Text>
              <Text style={styles.immediateHelpDesc}>
                Nos agents sont prêts à vous assister pour{'\n'}toute urgence sur la route.
              </Text>
            </View>

            <View style={styles.immediateHelpBtns}>
              <TouchableOpacity style={styles.whatsappBtn} onPress={openWhatsApp} activeOpacity={0.85}>
                <Text style={styles.whatsappIcon}>💬</Text>
                <Text style={styles.whatsappBtnText}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.callBtn} onPress={callSupport} activeOpacity={0.85}>
                <Text style={styles.callIcon}>📞</Text>
                <Text style={styles.callBtnText}>Appeler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Questions fréquentes</Text>
          <View style={styles.faqList}>
            {visibleFaqs.length === 0 ? (
              <View style={styles.faqEmpty}>
                <Text style={styles.faqEmptyText}>
                  Aucune réponse ne correspond à « {query.trim()} ». Contactez le support ou ouvrez un litige.
                </Text>
              </View>
            ) : visibleFaqs.map(({ faq, index }) => {
              const open = openIndex === index;
              return (
                <View key={index} style={styles.faqItem}>
                  <TouchableOpacity
                    style={styles.faqHeader}
                    activeOpacity={0.8}
                    onPress={() => toggle(index)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                  >
                    <View style={styles.faqItemLeft}>
                      <View style={styles.faqIconBg}>
                        <Text style={styles.faqIcon}>{faq.icon}</Text>
                      </View>
                      <Text style={styles.faqQuestion}>{faq.question}</Text>
                    </View>
                    <Text style={[styles.faqArrow, open && styles.faqArrowOpen]}>›</Text>
                  </TouchableOpacity>
                  {open && (
                    <View style={styles.faqBody}>
                      <Text style={styles.faqAnswer}>{faq.answer}</Text>
                      {faq.link && (
                        <TouchableOpacity
                          onPress={() => navigation.navigate(faq.link!.screen as any)}
                          style={styles.faqLinkBtn}
                        >
                          <Text style={styles.faqLinkText}>{faq.link.label} ›</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Litige */}
        <TouchableOpacity
          style={styles.litigeBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Litige')}
        >
          <Text style={styles.litigeIcon}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.litigeTitle}>Ouvrir un litige</Text>
            <Text style={styles.litigeDesc}>Signaler un problème sur une course à l'équipe Malaw</Text>
          </View>
          <Text style={styles.litigeArrow}>›</Text>
        </TouchableOpacity>
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
  searchClear: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(36,57,44,0.6)',
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
    borderRadius: Radii.md,
    backgroundColor: Colors.cream,
    overflow: 'hidden',
  },
  faqHeader: {
    minHeight: 80,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  faqItemLeft: {
    flex: 1,
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
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: 'rgb(36,57,44)',
    fontFamily: 'Manrope_500Medium',
  },
  faqArrow: {
    fontSize: 20,
    color: 'rgb(36,57,44)',
  },
  faqArrowOpen: {
    transform: [{ rotate: '90deg' }],
  },
  faqBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(36,57,44,0.12)',
    paddingTop: 14,
  },
  faqAnswer: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgb(36,57,44)',
    fontFamily: 'Manrope_500Medium',
    lineHeight: 23,
  },
  faqLinkBtn: {
    alignSelf: 'flex-start',
  },
  faqLinkText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    textDecorationLine: 'underline',
  },
  faqEmpty: {
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 20,
  },
  faqEmptyText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 22,
    textAlign: 'center',
  },
  litigeBtn: {
    borderRadius: Radii.md,
    borderWidth: 2,
    borderColor: Colors.goldLight,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  litigeIcon: {
    fontSize: 22,
  },
  litigeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  litigeArrow: {
    fontSize: 20,
    color: Colors.goldLight,
  },
  litigeDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
    marginTop: 2,
  },
});
