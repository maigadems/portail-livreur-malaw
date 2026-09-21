import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MalawLogo from '../components/MalawLogo';
import LivreurAvatar from '../components/LivreurAvatar';
import { Colors, Radii } from '../constants/theme';
import {
  getApplication,
  APPLICATION_STATUS_LABELS,
  ApplicationPayload,
} from '../api/documents';

/** Intervalle de rafraîchissement du statut de candidature. */
const POLL_MS = 20_000;

/**
 * Suivi de la candidature livreur pendant son examen par un admin.
 *
 * Le statut vient de `GET /couriers/me/application` : l'écran ne décide de
 * rien, il observe. Dès que l'admin tranche depuis sa console
 * (`PATCH /admin/courier-applications/:courierId/review`), l'écran bascule
 * vers l'approbation ou le refus. Les boutons « simuler la décision » qui
 * tenaient lieu de backend ont disparu avec l'arrivée du vrai KYC.
 */
export default function AttenteScreen() {
  const navigation = useNavigation<any>();
  const [payload, setPayload] = useState<ApplicationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  // Évite de renavigauer en boucle si le polling repasse sur un état final.
  const navigated = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const next = await getApplication();
      setPayload(next);

      if (!navigated.current) {
        if (next.application.status === 'APPROVED') {
          navigated.current = true;
          navigation.replace('ApprobationReussie');
        } else if (next.application.status === 'REJECTED') {
          navigated.current = true;
          navigation.replace('RefusCandidature', {
            reason: next.application.rejectionReason ?? undefined,
          });
        }
      }
    } catch {
      // Hors-ligne : on garde le dernier état connu affiché.
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const poll = setInterval(refresh, POLL_MS);
      return () => clearInterval(poll);
    }, [refresh]),
  );

  // Retour au premier plan : on resynchronise sans attendre le prochain tick.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const application = payload?.application;
  const docs = payload?.items ?? [];
  const uploaded = docs.filter((d) => d.uploaded).length;
  const statusLabel = application
    ? APPLICATION_STATUS_LABELS[application.status]
    : 'Chargement…';
  const submittedAt = application?.submittedAt ? new Date(application.submittedAt) : null;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.goldLight} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* TopAppBar - green */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <MalawLogo size={40} />
        </View>
        <LivreurAvatar size={40} />
      </View>

      {/* Main content */}
      <View style={styles.mainContent}>
        {/* Illustration */}
        <View style={styles.illustrationSection}>
          <View style={styles.illustrationBg}>
            <View style={styles.illustrationContent}>
              <Text style={styles.illustrationEmoji}>📋</Text>
            </View>
          </View>
        </View>

        {/* Text — dépend de l'avancement réel du dossier */}
        <View style={styles.textBlock}>
          <Text style={styles.mainTitle}>
            {application?.status === 'DRAFT' ? 'Dossier à compléter' : 'Candidature envoyée !'}
          </Text>
          <Text style={styles.mainDesc}>
            {application?.status === 'DRAFT'
              ? 'Déposez vos documents puis soumettez votre candidature pour validation.'
              : 'Notre équipe examine vos documents pour valider votre compte Malaw.'}
          </Text>
        </View>

        {/* Status card — statut, pièces et date réels */}
        <View style={styles.statusCard}>
          <View style={styles.statusCardHeader}>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusPillText}>{statusLabel}</Text>
            </View>
            {application?.id && (
              <Text style={styles.statusId}>
                ID: {application.id.slice(-6).toUpperCase()}
              </Text>
            )}
          </View>

          {/* Pièces reçues */}
          <View style={styles.docsRow}>
            <View style={styles.docAvatarsGroup}>
              {docs.filter((d) => d.uploaded).slice(0, 4).map((d, i) => (
                <View key={d.type} style={[styles.docAvatar, { marginLeft: i > 0 ? -10 : 0 }]}>
                  <Text style={{ fontSize: 14 }}>
                    {d.status === 'APPROVED' ? '✅' : d.status === 'REJECTED' ? '⚠️' : '📄'}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.docsInfo}>
              <Text style={styles.docsCount}>
                {uploaded}/{docs.length} documents{'\n'}reçus
              </Text>
              {submittedAt && (
                <Text style={styles.docsDate}>
                  Reçu le {submittedAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  , {submittedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
          </View>

          {/* Separator */}
          <View style={styles.separator} />

          {/* Modify link */}
          <TouchableOpacity style={styles.modifyLink} onPress={() => navigation.navigate('StatutDocuments')}>
            <Text style={styles.modifyText}>Modifier mes documents</Text>
            <Text style={{ color: Colors.goldLight, fontSize: 16 }}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer. La décision vient de l'admin via l'API : l'écran l'observe
          (polling + resynchro au retour au premier plan) et bascule seul vers
          l'approbation ou le refus. Plus aucun bouton de simulation. */}
      <View style={styles.footer}>
        {application?.status === 'DRAFT' && (
          <TouchableOpacity
            style={styles.whatsappBtn}
            onPress={() => navigation.navigate('Documents')}
            activeOpacity={0.85}
          >
            <View style={styles.whatsappBtnShadow} />
            <Text style={styles.whatsappIcon}>📄</Text>
            <Text style={styles.whatsappText}>Compléter mon dossier</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.footerQuestion}>Besoin d'aide avec votre dossier ?</Text>
        <TouchableOpacity
          style={styles.whatsappBtn}
          onPress={() => navigation.navigate('Aide')}
          activeOpacity={0.85}
        >
          <View style={styles.whatsappBtnShadow} />
          <Text style={styles.whatsappIcon}>💬</Text>
          <Text style={styles.whatsappText}>Contacter Malaw Support</Text>
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
  topBar: {
    height: 80,
    backgroundColor: Colors.darkGreen,
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
  menuBtn: {
    width: 34,
    height: 28,
    borderRadius: 9999,
    justifyContent: 'center',
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
  topBarLogo: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  avatarBorder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.goldLight,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.darkGreenTint,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 24,
  },
  illustrationSection: {
    alignItems: 'center',
  },
  illustrationBg: {
    width: 288,
    height: 288,
    borderRadius: 144,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationEmoji: {
    fontSize: 80,
  },
  textBlock: {
    alignItems: 'center',
    gap: 12,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  mainDesc: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(193,200,193,1)',
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 28,
    opacity: 0.8,
  },
  statusCard: {
    borderRadius: Radii.lg,
    backgroundColor: Colors.white,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statusCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.goldLight,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(96,65,0,0.6)',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgb(96,65,0)',
    fontFamily: 'Manrope_500Medium',
  },
  statusId: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  docsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docAvatarsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.darkGreen,
    borderWidth: 2,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docsInfo: {
    alignItems: 'flex-start',
    gap: 4,
  },
  docsCount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 22,
  },
  docsDate: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.7,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.darkGreen,
    opacity: 0.1,
  },
  modifyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modifyText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  footer: {
    backgroundColor: 'rgb(0,18,7)',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
    alignItems: 'center',
  },
  footerQuestion: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  whatsappBtn: {
    // alignSelf: 'stretch' plutôt qu'une largeur calculée depuis Dimensions,
    // qui ne suivrait pas une rotation ou un écran partagé.
    alignSelf: 'stretch',
    height: 64,
    borderRadius: Radii.sm,
    backgroundColor: Colors.whatsapp,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  whatsappBtnShadow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.white,
    opacity: 0.06,
  },
  whatsappIcon: {
    fontSize: 20,
  },
  whatsappText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
  },
  centered: { alignItems: 'center', justifyContent: 'center' },
});
