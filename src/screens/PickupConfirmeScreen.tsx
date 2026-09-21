import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import { getOrder, startDelivery } from '../api/orders';
import { Alert } from '../components/AppAlert';

const { width } = Dimensions.get('window');

type ChecklistItem = { label: string; verified: boolean };

export default function PickupConfirmeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { deliveryId, orderId } = route.params ?? {};
  const [restaurant, setRestaurant] = useState<{ name: string; address: string } | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [bagSealed, setBagSealed] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!orderId) { setLoading(false); return; }
    getOrder(orderId)
      .then((o: any) => {
        if (!active) return;
        setRestaurant(o.restaurant ?? null);
        setNotes(o.notes ?? null);
        setItems((o.items ?? []).map((i: any) => ({ label: `${i.name} x${i.quantity}`, verified: false })));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orderId]));

  const toggle = (i: number) => {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, verified: !item.verified } : item));
  };

  const allChecked = items.length > 0 && items.every(i => i.verified) && bagSealed;

  const confirmPickup = async () => {
    if (!allChecked || confirming) return;
    setConfirming(true);
    try {
      // Le colis quitte le restaurant : la commande passe IN_TRANSIT côté
      // serveur, ce qui la rend visible côté client comme "en cours de
      // livraison" avec ce livreur.
      await startDelivery(orderId);
      navigation.replace('EnRouteClient', { deliveryId, orderId });
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible de démarrer la livraison.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* TopAppBar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('DashboardEnLigne'))} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Vérification commande</Text>
        <View style={styles.stepPill}>
          <Text style={styles.stepPillText}>1/2</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Restaurant header */}
        <View style={styles.restaurantCard}>
          <View style={styles.restaurantIcon}>
            <Text style={styles.restaurantEmoji}>🍽️</Text>
          </View>
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>{restaurant?.name ?? '…'}</Text>
            <Text style={styles.restaurantSub}>{restaurant?.address ?? ''}</Text>
          </View>
          <View style={styles.itemCountBadge}>
            <Text style={styles.itemCountText}>{items.length}</Text>
            <Text style={styles.itemCountLabel}>articles</Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionBanner}>
          <Text style={styles.instructionIcon}>ℹ️</Text>
          <Text style={styles.instructionText}>
            Cochez chaque article après l'avoir récupéré et vérifié. Cette étape protège votre score.
          </Text>
        </View>

        {/* Items checklist */}
        <View style={styles.checklistSection}>
          <Text style={styles.sectionLabel}>ARTICLES DE LA COMMANDE</Text>
          <View style={styles.checklistItems}>
            {items.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.checkItem, item.verified && styles.checkItemDone]}
                onPress={() => toggle(i)}
                activeOpacity={0.75}
              >
                <View style={[styles.checkbox, item.verified && styles.checkboxChecked]}>
                  {item.verified && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.checkItemLabel, item.verified && styles.checkItemLabelDone]}>
                  {item.label}
                </Text>
                {item.verified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>OK</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bag sealed confirmation */}
        <View style={styles.checklistSection}>
          <Text style={styles.sectionLabel}>INTÉGRITÉ DE LA COMMANDE</Text>
          <TouchableOpacity
            style={[styles.checkItem, styles.checkItemImportant, bagSealed && styles.checkItemDone]}
            onPress={() => setBagSealed(v => !v)}
            activeOpacity={0.75}
          >
            <View style={[styles.checkbox, bagSealed && styles.checkboxChecked]}>
              {bagSealed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={styles.sealedTextBlock}>
              <Text style={[styles.checkItemLabel, bagSealed && styles.checkItemLabelDone]}>
                Le sac est scellé / fermé
              </Text>
              <Text style={styles.checkItemSub}>Aucune altération visible de l'emballage</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Special instructions */}
        {notes ? (
          <View style={styles.specialNote}>
            <Text style={styles.specialNoteIcon}>⚠️</Text>
            <View style={styles.specialNoteText}>
              <Text style={styles.specialNoteTitle}>Note spéciale</Text>
              <Text style={styles.specialNoteDesc}>{notes}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* CTA */}
      <View style={styles.bottomArea}>
        {!allChecked && (
          <Text style={styles.bottomHint}>
            {items.filter(i => !i.verified).length > 0
              ? `${items.filter(i => !i.verified).length} article(s) non vérifié(s)`
              : 'Confirmez que le sac est scellé'}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.ctaBtn, (!allChecked || confirming) && styles.ctaBtnDisabled]}
          onPress={confirmPickup}
          activeOpacity={allChecked ? 0.85 : 1}
          disabled={!allChecked || confirming}
        >
          <View style={styles.ctaBtnShadow} />
          {confirming ? (
            <ActivityIndicator color="rgb(67,44,0)" />
          ) : (
            <>
              <Text style={[styles.ctaBtnText, !allChecked && { opacity: 0.5 }]}>
                J'ai récupéré la commande
              </Text>
              {allChecked && <Text style={{ color: 'rgb(67,44,0)', fontSize: 18 }}>✓</Text>}
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.problemBtn}
          onPress={() => navigation.navigate('ProblemePickup')}
        >
          <Text style={styles.problemBtnText}>⚠️  Un problème avec la commande ?</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: Colors.darkGreen,
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
  hamburgerLine: {
    width: 18,
    height: 2,
    backgroundColor: Colors.cream,
    borderRadius: 1,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  stepPill: {
    backgroundColor: Colors.goldLight,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  stepPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 20,
  },
  restaurantCard: {
    borderRadius: Radii.xl,
    backgroundColor: Colors.darkGreen,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  restaurantIcon: {
    width: 52,
    height: 52,
    borderRadius: Radii.sm,
    backgroundColor: Colors.nearBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantEmoji: { fontSize: 26 },
  restaurantInfo: { flex: 1, gap: 3 },
  restaurantName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  restaurantSub: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  itemCountBadge: {
    alignItems: 'center',
    gap: 0,
  },
  itemCountText: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 32,
  },
  itemCountLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  instructionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(169,208,182,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(169,208,182,0.2)',
    padding: 14,
  },
  instructionIcon: { fontSize: 16 },
  instructionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 20,
  },
  checklistSection: { gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  checklistItems: { gap: 8 },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: Radii.md,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 16,
  },
  checkItemImportant: {
    borderColor: 'rgba(169,208,182,0.2)',
  },
  checkItemDone: {
    backgroundColor: 'rgba(26,61,43,0.6)',
    borderColor: Colors.greenMid,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(169,208,182,0.3)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.successDark,
    borderColor: Colors.successDark,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.white,
  },
  checkItemLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  checkItemLabelDone: {
    textDecorationLine: 'line-through',
    color: Colors.greenMid,
    opacity: 0.7,
  },
  sealedTextBlock: { flex: 1, gap: 2 },
  checkItemSub: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  verifiedBadge: {
    borderRadius: 9999,
    backgroundColor: Colors.successDark,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
  },
  specialNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(244,189,97,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244,189,97,0.2)',
    padding: 14,
  },
  specialNoteIcon: { fontSize: 18, marginTop: 1 },
  specialNoteText: { flex: 1, gap: 3 },
  specialNoteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  specialNoteDesc: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.8,
    lineHeight: 20,
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(65,72,67,0.3)',
  },
  bottomHint: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  ctaBtn: {
    height: 72,
    borderRadius: Radii.xl,
    backgroundColor: Colors.goldLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  ctaBtnDisabled: {
    backgroundColor: 'rgba(244,189,97,0.3)',
  },
  ctaBtnShadow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.white,
    opacity: 0.08,
  },
  ctaBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
  problemBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  problemBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
  },
});
