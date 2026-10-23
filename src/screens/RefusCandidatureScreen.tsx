import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import { getApplication, DOCUMENT_LABELS, ApplicationPayload } from '../api/documents';

/**
 * Refus de la candidature. Le ton est celui d'une consigne, pas d'une
 * sanction : le livreur doit repartir d'ici vers le dépôt de ses pièces.
 * Redéposer une pièce remet le dossier en DRAFT côté serveur ; il faudra
 * ensuite le soumettre à nouveau depuis l'écran Documents.
 */
export default function RefusCandidatureScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const [payload, setPayload] = useState<ApplicationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getApplication()
        .then((p) => { if (active) { setPayload(p); setError(null); } })
        .catch((e: any) => { if (active) setError(e?.message ?? null); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, []),
  );

  const application = payload?.application;
  // Motif global rédigé par l'admin — passé en paramètre depuis l'écran
  // d'attente, puis confirmé par le rechargement du dossier.
  const globalReason: string | undefined =
    application?.rejectionReason ?? route?.params?.reason;

  // Pièces refusées ou expirées, avec le motif propre à chacune : c'est ce
  // que le livreur doit corriger, pièce par pièce.
  const motifs = (payload?.items ?? [])
    .filter((d) => d.status === 'REJECTED' || d.status === 'EXPIRED')
    .map((d) => ({
      icon: DOCUMENT_LABELS[d.type].icon,
      label: DOCUMENT_LABELS[d.type].label,
      detail:
        d.status === 'EXPIRED'
          ? 'Ce document a expiré. Renouvelez-le puis redéposez-le.'
          : d.rejectionReason ?? 'Document refusé. Redéposez une version conforme.',
    }));

  const decidedAt = application?.reviewedAt ? new Date(application.reviewedAt) : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Decorative */}
      <View style={styles.decorTop} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={styles.iconArea}>
          <View style={styles.iconRing}>
            <View style={styles.iconInner}>
              <Text style={styles.iconEmoji}>❌</Text>
            </View>
          </View>
        </View>

        {/* Status badge */}
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>DOSSIER À CORRIGER</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Votre dossier a besoin{'\n'}d'une correction</Text>
        <Text style={styles.subtitle}>
          Notre équipe a relevé un ou plusieurs points à corriger. Remplacez les
          pièces concernées puis soumettez à nouveau votre candidature.
        </Text>

        {loading && !payload && <ActivityIndicator color={Colors.darkGreen} />}
        {error && !payload && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Motifs — réels : celui du dossier, puis pièce par pièce */}
        <View style={styles.motifsSection}>
          <Text style={styles.motifsTitle}>RAISONS DU REFUS</Text>
          <View style={styles.motifsList}>
            {globalReason && (
              <View style={styles.motifCard}>
                <View style={styles.motifLeft}>
                  <View style={styles.motifIconBg}>
                    <Text style={styles.motifIcon}>📋</Text>
                  </View>
                  <View style={styles.motifText}>
                    <Text style={styles.motifLabel}>Décision de notre équipe</Text>
                    <Text style={styles.motifDetail}>{globalReason}</Text>
                  </View>
                </View>
              </View>
            )}
            {motifs.map((m, i) => (
              <View key={i} style={styles.motifCard}>
                <View style={styles.motifLeft}>
                  <View style={styles.motifIconBg}>
                    <Text style={styles.motifIcon}>{m.icon}</Text>
                  </View>
                  <View style={styles.motifText}>
                    <Text style={styles.motifLabel}>{m.label}</Text>
                    <Text style={styles.motifDetail}>{m.detail}</Text>
                  </View>
                </View>
              </View>
            ))}
            {!loading && !globalReason && motifs.length === 0 && (
              <View style={styles.motifCard}>
                <View style={styles.motifLeft}>
                  <View style={styles.motifIconBg}>
                    <Text style={styles.motifIcon}>💬</Text>
                  </View>
                  <View style={styles.motifText}>
                    <Text style={styles.motifDetail}>
                      Contactez le support pour connaître le détail de la décision.
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* What to do */}
        <View style={styles.stepsSection}>
          <Text style={styles.stepsTitle}>COMMENT CORRIGER</Text>
          {[
            { n: '1', text: 'Lisez les points relevés ci-dessus' },
            { n: '2', text: 'Remplacez les pièces concernées depuis « Corriger mon dossier »' },
            { n: '3', text: 'Soumettez à nouveau votre candidature depuis le même écran' },
          ].map((s, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{s.n}</Text>
              </View>
              <Text style={styles.stepText}>{s.text}</Text>
            </View>
          ))}
        </View>

        {/* ID refus — référence et date réelles du dossier */}
        {application && (
          <View style={styles.refusIdCard}>
            <Text style={styles.refusIdLabel}>Référence du dossier</Text>
            <Text style={styles.refusIdValue}>
              MLW-{application.id.slice(-6).toUpperCase()}
            </Text>
            {decidedAt && (
              <Text style={styles.refusIdDate}>
                Décision le {decidedAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                {' à '}
                {decidedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Documents')}
          activeOpacity={0.85}
        >
          <View style={styles.primaryBtnShadow} />
          <Text style={styles.primaryBtnText}>Corriger mon dossier</Text>
          <Text style={{ color: Colors.cream, fontSize: 16 }}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Aide')}
        >
          <Text style={styles.secondaryBtnText}>💬  Contacter le support</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutLink} onPress={() => navigation.navigate('ModalDeconnexion')}>
          <Text style={styles.logoutLinkText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  decorTop: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.errorBg,
    top: -120,
    right: -80,
    opacity: 0.08,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    gap: 24,
    alignItems: 'center',
  },
  iconArea: {
    alignItems: 'center',
  },
  iconRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(192,57,43,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(192,57,43,0.15)',
  },
  iconInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(192,57,43,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 44,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(192,57,43,0.1)',
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.2)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.error,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.7,
  },
  motifsSection: {
    width: '100%',
    gap: 12,
  },
  motifsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.5,
    letterSpacing: 1,
  },
  motifsList: {
    gap: 8,
  },
  motifCard: {
    borderRadius: Radii.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.2)',
    padding: 16,
  },
  motifLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  motifIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(192,57,43,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  motifIcon: {
    fontSize: 20,
  },
  motifText: {
    flex: 1,
    gap: 4,
  },
  motifLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  motifDetail: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.65,
    lineHeight: 20,
  },
  stepsSection: {
    width: '100%',
    gap: 12,
  },
  stepsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.5,
    letterSpacing: 1,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 22,
    opacity: 0.8,
  },
  refusIdCard: {
    width: '100%',
    borderRadius: Radii.md,
    backgroundColor: 'rgba(26,61,43,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(26,61,43,0.1)',
    padding: 16,
    gap: 4,
    alignItems: 'center',
  },
  refusIdLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.5,
    letterSpacing: 0.5,
  },
  refusIdValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  refusIdDate: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.5,
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    gap: 10,
  },
  logoutLink: { alignItems: 'center', paddingVertical: 6 },
  logoutLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    textDecorationLine: 'underline',
    opacity: 0.6,
  },
  errorBox: {
    width: '100%',
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(192,57,43,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.25)',
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  primaryBtn: {
    height: 64,
    borderRadius: Radii.md,
    backgroundColor: Colors.darkGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  primaryBtnShadow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.white,
    opacity: 0.06,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  secondaryBtn: {
    height: 52,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'rgba(26,61,43,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
});
