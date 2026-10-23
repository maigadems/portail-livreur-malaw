import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import { Alert } from '../components/AppAlert';
import { ABANDON_REASONS, AbandonReason, abandonDelivery } from '../api/deliveries';
import { useCourse } from '../context/CourseContext';

const DETAILS_MAX = 500;

/**
 * Feuille du bas ouverte depuis le tableau de bord pour relâcher une course
 * active. Les motifs viennent du serveur (ABANDON_REASONS) dans leur ordre
 * d'origine : on ne trie pas par pénalité pour ne pas orienter le choix.
 */
export default function ModalAnnulationCourseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { deliveryId } = route.params ?? {};
  const { refresh } = useCourse();

  const [selected, setSelected] = useState<AbandonReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reason = ABANDON_REASONS.find((r) => r.value === selected) ?? null;
  const ready = reason !== null && !submitting;

  const submit = useCallback(async () => {
    if (!reason || submitting) return;
    if (!deliveryId) {
      Alert.alert(
        'Course non identifiée',
        "Cet écran n'a pas reçu la course à libérer. Revenez à la course puis réessayez.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const trimmed = details.trim().slice(0, DETAILS_MAX);
      await abandonDelivery(deliveryId, {
        reason: reason.value,
        details: trimmed ? trimmed : undefined,
      });
      // Le contexte pilote l'état des courses : on le resynchronise avant de
      // revenir, sinon le tableau de bord afficherait encore la course rendue.
      await refresh();
      Alert.alert(
        'Course libérée',
        reason.blaming
          ? 'La course a été rendue au dispatch. Ce motif est retenu dans votre taux de fiabilité.'
          : 'La course a été rendue au dispatch. Ce motif n\'est pas retenu contre vous.',
        [{ text: 'OK', onPress: () => navigation.replace('DashboardEnLigne') }],
      );
    } catch (e: any) {
      Alert.alert(
        'Course non libérée',
        e?.message ?? "Le serveur a refusé l'abandon de la course. Réessayez dans un instant.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [reason, submitting, deliveryId, details, refresh, navigation]);

  const dismiss = () => { if (!submitting) navigation.goBack(); };

  return (
    <SafeAreaView style={styles.overlay} edges={['bottom']}>
      <TouchableOpacity style={styles.dismissArea} onPress={dismiss} activeOpacity={1} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>Libérer cette course ?</Text>
          <Text style={styles.subtitle}>
            La course repartira au dispatch pour un autre livreur.
          </Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.raisonsTitle}>POURQUOI LIBÉREZ-VOUS LA COURSE ?</Text>

            <View style={styles.raisonsList}>
              {ABANDON_REASONS.map((r) => {
                const isSelected = selected === r.value;
                return (
                  <TouchableOpacity
                    key={r.value}
                    style={[styles.raisonItem, isSelected && styles.raisonItemSelected]}
                    onPress={() => setSelected(r.value)}
                    activeOpacity={0.8}
                    disabled={submitting}
                  >
                    <View style={styles.raisonLeft}>
                      <View style={[styles.radio, isSelected && styles.radioSelected]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.raisonIcon}>{r.icon}</Text>
                      <Text style={[styles.raisonLabel, isSelected && styles.raisonLabelSelected]}>
                        {r.label}
                      </Text>
                    </View>
                    {r.blaming ? (
                      <View style={styles.blamingBadge}>
                        <Text style={styles.blamingBadgeText}>Retenu</Text>
                      </View>
                    ) : (
                      <View style={styles.okBadge}>
                        <Text style={styles.okBadgeText}>Non retenu</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {reason && (
              <View style={[styles.reasonNote, reason.blaming && styles.reasonNoteBlaming]}>
                <Text style={[styles.reasonNoteText, reason.blaming && styles.reasonNoteTextBlaming]}>
                  {reason.blaming
                    ? 'Ce motif sera retenu dans votre taux de fiabilité.'
                    : "Ce motif n'est pas retenu dans votre taux de fiabilité."}
                </Text>
              </View>
            )}

            <TextInput
              style={styles.detailsInput}
              value={details}
              onChangeText={(v) => setDetails(v.slice(0, DETAILS_MAX))}
              placeholder="Précisions (facultatif)"
              placeholderTextColor="rgba(169,208,182,0.4)"
              multiline
              maxLength={DETAILS_MAX}
              editable={!submitting}
            />
          </ScrollView>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.abandonBtn, !ready && styles.abandonBtnDisabled]}
              onPress={submit}
              disabled={!ready}
              activeOpacity={ready ? 0.85 : 1}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.errorLight} />
              ) : (
                <Text style={[styles.abandonBtnText, !ready && { opacity: 0.4 }]}>
                  Libérer la course
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.keepBtn} onPress={dismiss} disabled={submitting}>
              <Text style={styles.keepBtnText}>Garder la course</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: Colors.cardDark,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(65,72,67,0.4)',
    maxHeight: '88%',
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(169,208,182,0.2)',
    alignSelf: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 19,
  },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: 12, paddingBottom: 4 },
  raisonsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  raisonsList: { gap: 6 },
  raisonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.sm,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  raisonItemSelected: {
    borderColor: Colors.goldLight,
    backgroundColor: 'rgba(244,189,97,0.06)',
  },
  raisonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(169,208,182,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.goldLight },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.goldLight,
  },
  raisonIcon: { fontSize: 16 },
  raisonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    flex: 1,
  },
  raisonLabelSelected: {
    color: Colors.greenLight,
  },
  blamingBadge: {
    borderRadius: 9999,
    backgroundColor: 'rgba(192,57,43,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  blamingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
  },
  okBadge: {
    borderRadius: 9999,
    backgroundColor: 'rgba(34,197,94,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  okBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.successDark,
    fontFamily: 'Manrope_500Medium',
  },
  reasonNote: {
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(169,208,182,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(169,208,182,0.15)',
    padding: 10,
  },
  reasonNoteBlaming: {
    backgroundColor: 'rgba(192,57,43,0.08)',
    borderColor: 'rgba(192,57,43,0.2)',
  },
  reasonNoteText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  reasonNoteTextBlaming: {
    color: Colors.errorLight,
  },
  detailsInput: {
    minHeight: 64,
    maxHeight: 120,
    borderRadius: Radii.sm,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
    textAlignVertical: 'top',
  },
  buttons: { gap: 8 },
  abandonBtn: {
    height: 56,
    borderRadius: Radii.md,
    backgroundColor: Colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abandonBtnDisabled: { backgroundColor: 'rgba(147,0,10,0.3)' },
  abandonBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
  },
  keepBtn: {
    height: 52,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(169,208,182,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(169,208,182,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
});
