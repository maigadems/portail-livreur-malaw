import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import MalawLogo from '../components/MalawLogo';
import LivreurAvatar from '../components/LivreurAvatar';
import { getMyDeliveries, CourierDelivery } from '../api/couriers';
import { Alert } from '../components/AppAlert';
import {
  createDispute,
  DISPUTE_CATEGORIES,
  DISPUTE_STATUS_LABELS,
  Dispute,
  DisputeCategory,
} from '../api/disputes';

export default function LitigeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // La course peut être imposée par l'écran appelant (reçu de course, détail
  // de livraison) ; sinon le livreur la choisit parmi ses dernières courses.
  const presetOrderId: string | undefined = route.params?.orderId;
  const presetLabel: string | undefined = route.params?.restaurantName;

  const [deliveries, setDeliveries] = useState<CourierDelivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(!presetOrderId);
  const [orderId, setOrderId] = useState<string | null>(presetOrderId ?? null);
  const [category, setCategory] = useState<DisputeCategory | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dispute, setDispute] = useState<Dispute | null>(null);

  useEffect(() => {
    if (presetOrderId) return;
    let active = true;
    getMyDeliveries()
      .then((list) => {
        if (!active) return;
        // Un litige porte sur une course réellement effectuée : on propose les
        // 10 dernières, la plus récente en tête.
        setDeliveries(list.slice(0, 10));
        if (list.length === 1) setOrderId(list[0].order.id);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoadingDeliveries(false); });
    return () => { active = false; };
  }, [presetOrderId]);

  const selected = deliveries.find((d) => d.order.id === orderId);
  const contextLabel = presetLabel ?? selected?.order.restaurant.name ?? null;
  const canSubmit = !!orderId && !!category && description.trim().length >= 10 && !submitting;

  const handleSubmit = async () => {
    const chosen = DISPUTE_CATEGORIES.find((c) => c.value === category);
    if (!orderId || !chosen) return;
    setSubmitting(true);
    try {
      const created = await createDispute(orderId, {
        category: chosen.value,
        subject: chosen.label,
        description: description.trim(),
      });
      setDispute(created);
    } catch (e: any) {
      Alert.alert('Signalement', e?.message ?? "Impossible d'envoyer le signalement.");
    } finally {
      setSubmitting(false);
    }
  };

  // Confirmation : le dossier existe côté serveur, avec son vrai identifiant.
  if (dispute) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successWrap}>
          <View style={styles.successCircle}><Text style={{ fontSize: 44 }}>📋</Text></View>
          <Text style={styles.successTitle}>Signalement envoyé</Text>
          <Text style={styles.successSub}>
            Notre équipe support a reçu votre dossier et vous répondra rapidement.
          </Text>
          <View style={styles.successCard}>
            <Text style={styles.successCardLabel}>NUMÉRO DE DOSSIER</Text>
            <Text style={styles.successCardId}>
              #{String(dispute.id).slice(-8).toUpperCase()}
            </Text>
            <Text style={styles.successCardMeta}>
              {DISPUTE_STATUS_LABELS[dispute.status] ?? dispute.status}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.successBtn}
            onPress={() => navigation.navigate('DashboardEnLigne')}
          >
            <Text style={styles.submitBtnText}>Retour au tableau de bord</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* TopAppBar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <View style={styles.backBtnIcon}>
              <Text style={{ color: Colors.cream, fontSize: 18 }}>←</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Signaler un{'\n'}problème</Text>
        </View>
        <View style={styles.topBarRight}>
          <MalawLogo size={40} />
          <LivreurAvatar size={40} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Course concernée — le litige y est rattaché côté serveur */}
        <View style={styles.problemSection}>
          <Text style={styles.sectionTitle}>COURSE CONCERNÉE</Text>

          {presetOrderId ? (
            <View style={styles.courseContextCard}>
              <View style={styles.courseContextAccent} />
              <View style={styles.courseContextContent}>
                <Text style={styles.courseId}>#{presetOrderId.slice(-8).toUpperCase()}</Text>
                {contextLabel && <Text style={styles.courseName}>{contextLabel}</Text>}
              </View>
              <View style={styles.motoIcon}>
                <Text style={{ fontSize: 28, color: Colors.goldLight }}>🏍️</Text>
              </View>
            </View>
          ) : loadingDeliveries ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.goldLight} />
            </View>
          ) : deliveries.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                Aucune course à signaler pour le moment. Un litige se rattache toujours
                à une course que vous avez prise en charge.
              </Text>
            </View>
          ) : (
            <View style={styles.problemList}>
              {deliveries.map((d) => {
                const active = d.order.id === orderId;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.courseItem, active && styles.problemItemSelected]}
                    onPress={() => setOrderId(d.order.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.courseItemId}>
                        #{d.order.id.slice(-8).toUpperCase()}
                      </Text>
                      <Text style={styles.courseItemName}>{d.order.restaurant.name}</Text>
                      <Text style={styles.courseItemMeta}>
                        {new Date(d.deliveredAt ?? d.createdAt).toLocaleDateString()} ·{' '}
                        {d.status === 'DELIVERED' ? 'Livrée' : d.status}
                      </Text>
                    </View>
                    <View style={[styles.radioBtn, active && styles.radioBtnSelected]}>
                      {active && <View style={styles.radioBtnInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Problem selection */}
        <View style={styles.problemSection}>
          <Text style={styles.sectionTitle}>NATURE DU LITIGE</Text>
          <View style={styles.problemList}>
            {DISPUTE_CATEGORIES.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.problemItem,
                  category === item.value && styles.problemItemSelected,
                ]}
                onPress={() => setCategory(item.value)}
                activeOpacity={0.8}
              >
                <View style={styles.problemItemLeft}>
                  <View style={styles.problemIconBg}>
                    <Text style={styles.problemIcon}>{item.icon}</Text>
                  </View>
                  <Text style={styles.problemLabel}>{item.label}</Text>
                </View>
                <View style={[
                  styles.radioBtn,
                  category === item.value && styles.radioBtnSelected,
                ]}>
                  {category === item.value && <View style={styles.radioBtnInner} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>DESCRIPTION DÉTAILLÉE</Text>
          <TextInput
            style={styles.textarea}
            multiline
            numberOfLines={5}
            maxLength={2000}
            value={description}
            onChangeText={setDescription}
            placeholder="Expliquez brièvement la situation..."
            placeholderTextColor="rgb(65,72,67)"
            textAlignVertical="top"
          />
          {description.trim().length > 0 && description.trim().length < 10 && (
            <Text style={styles.hint}>Décrivez la situation en 10 caractères au minimum.</Text>
          )}
        </View>
      </ScrollView>

      {/* Bottom action */}
      <View style={styles.bottomAction}>
        <View style={styles.responseTime}>
          <Text style={styles.responseTimeDot}>✓</Text>
          <Text style={styles.responseTimeText}>Notre équipe traite votre dossier</Text>
        </View>
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          <View style={styles.submitBtnShadow} />
          <Text style={styles.submitBtnText}>
            {submitting ? 'Envoi…' : 'Envoyer le signalement'}
          </Text>
          {!submitting && <Text style={{ color: Colors.white, fontSize: 16 }}>→</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.deepBlack,
  },
  topBar: {
    minHeight: 80,
    backgroundColor: Colors.nearBlack,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245,240,226,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 30,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
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
    paddingBottom: 24,
    gap: 20,
  },
  courseContextCard: {
    borderRadius: Radii.sm,
    backgroundColor: Colors.darkGreen,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 20,
  },
  courseContextAccent: {
    width: 4,
    height: 124,
    backgroundColor: Colors.goldLight,
  },
  courseContextContent: {
    flex: 1,
    paddingLeft: 20,
    paddingVertical: 16,
    gap: 4,
  },
  courseContextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  courseId: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  deliveredPill: {
    borderRadius: 9999,
    backgroundColor: 'rgb(43,78,59)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deliveredPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
  courseName: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgb(19,55,37)',
    fontFamily: 'Manrope_500Medium',
  },
  courseDate: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.greenText,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.9,
  },
  motoIcon: {
    width: 27,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  problemSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  problemList: {
    gap: 8,
  },
  problemItem: {
    height: 74,
    borderRadius: Radii.sm,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0)',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  problemItemSelected: {
    borderColor: Colors.goldLight,
  },
  problemItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  problemIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  problemIcon: {
    fontSize: 18,
  },
  problemLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  radioBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgb(65,72,67)',
    backgroundColor: 'rgb(15,36,24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioBtnSelected: {
    borderColor: Colors.goldLight,
    backgroundColor: Colors.goldLight,
  },
  radioBtnInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgb(67,44,0)',
  },
  descriptionSection: {
    gap: 12,
  },
  textarea: {
    borderRadius: Radii.sm,
    backgroundColor: Colors.nearBlack,
    borderWidth: 1,
    borderColor: 'rgb(65,72,67)',
    padding: 16,
    minHeight: 130,
    fontSize: 16,
    fontWeight: '400',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  hint: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.dimText,
    fontFamily: 'Manrope_500Medium',
  },
  loadingBox: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    borderRadius: Radii.sm,
    backgroundColor: Colors.darkCard,
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.dimText,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 20,
  },
  courseItem: {
    borderRadius: Radii.sm,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  courseItemId: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  courseItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  courseItemMeta: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.dimText,
    fontFamily: 'Manrope_500Medium',
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 18,
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  successSub: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.dimText,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 20,
  },
  successCard: {
    width: '100%',
    borderRadius: Radii.sm,
    backgroundColor: Colors.darkCard,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  successCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  successCardId: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  successCardMeta: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
  successBtn: {
    width: '100%',
    height: 60,
    borderRadius: Radii.sm,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomAction: {
    backgroundColor: Colors.nearBlack,
    borderTopWidth: 1,
    borderTopColor: 'rgb(65,72,67)',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  responseTime: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  responseTimeDot: {
    fontSize: 11,
    color: Colors.greenMid,
  },
  responseTimeText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
  submitBtn: {
    height: 68,
    borderRadius: Radii.sm,
    backgroundColor: Colors.darkGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  submitBtnShadow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.white,
    opacity: 0.06,
  },
  submitBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
  },
});
