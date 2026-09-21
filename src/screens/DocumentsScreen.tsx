import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import {
  getApplication,
  uploadDocument,
  submitApplication,
  DOCUMENT_LABELS,
  DOCUMENT_STATUS_LABELS,
  ApplicationPayload,
  DocumentType,
} from '../api/documents';
import { captureDocument, pickDocumentFromLibrary } from '../utils/pickDocument';
// Renommé : `uploadDocument` d'api/documents enregistre la pièce côté métier,
// celui-ci ne fait que déposer le fichier sur le service d'hébergement.
import { uploadDocument as uploadKycDocument } from '../api/uploads';
import { Alert } from '../components/AppAlert';

export default function DocumentsScreen() {
  const navigation = useNavigation<any>();
  const [payload, setPayload] = useState<ApplicationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyType, setBusyType] = useState<DocumentType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setPayload(await getApplication());
    } catch (e: any) {
      Alert.alert('Documents', e?.message ?? 'Impossible de charger votre dossier.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Rechargé à chaque affichage : l'admin a pu statuer entre-temps.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const docs = payload?.items ?? [];
  const progress = payload?.progress;
  const uploadedCount = docs.filter((d) => d.uploaded).length;
  const pct = docs.length ? Math.round((uploadedCount / docs.length) * 100) : 0;

  /** Choix galerie/appareil photo, puis envoi à l'API. */
  const handleUpload = (type: DocumentType) => {
    const run = async (pick: () => Promise<string | null>) => {
      setBusyType(type);
      try {
        const dataUrl = await pick();
        if (!dataUrl) return;
        // La pièce part sur le service d'hébergement, en accès restreint :
        // elle n'est plus stockée en base64 dans la base. Le service de
        // documents accepte déjà une URL distante et la range dans `fileUrl`.
        const file = await uploadKycDocument(dataUrl);
        await uploadDocument({ type, file });
        await load();
      } catch (e: any) {
        Alert.alert('Document', e?.message ?? "Impossible d'envoyer ce document.");
      } finally {
        setBusyType(null);
      }
    };

    Alert.alert(DOCUMENT_LABELS[type].label, 'Comment souhaitez-vous ajouter ce document ?', [
      { text: 'Prendre en photo', onPress: () => run(captureDocument) },
      { text: 'Choisir dans la galerie', onPress: () => run(pickDocumentFromLibrary) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitApplication();
      navigation.navigate('Attente');
    } catch (e: any) {
      // Le serveur détaille les pièces manquantes dans son message.
      Alert.alert('Candidature', e?.message ?? "Impossible de soumettre votre candidature.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.darkGreen} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ fontSize: 18, color: Colors.darkGreen }}>←</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress — réel : nombre de pièces déposées sur le total attendu */}
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressStep}>
              {uploadedCount} / {docs.length} DOCUMENTS
            </Text>
            <Text style={styles.progressPct}>{pct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
        </View>

        {/* Title */}
        <View style={styles.headerContent}>
          <Text style={styles.pageTitle}>Vos documents</Text>
          <Text style={styles.pageDesc}>
            Ces documents sont requis pour valider{'\n'}votre compte livreur et garantir la sécurité de{'\n'}nos services à Dakar.
          </Text>
        </View>

        {/* Document cards — état réel de chaque pièce */}
        <View style={styles.docGrid}>
          {docs.map((doc) => {
            const meta = DOCUMENT_LABELS[doc.type];
            const busy = busyType === doc.type;
            const rejected = doc.status === 'REJECTED' || doc.status === 'EXPIRED';

            // Pièce déposée et acceptée : plus rien à faire, mais on laisse
            // la possibilité de la remplacer (renouvellement).
            if (doc.uploaded && !rejected) {
              return (
                <TouchableOpacity
                  key={doc.type}
                  style={styles.docCardCompleted}
                  activeOpacity={0.8}
                  onPress={() => handleUpload(doc.type)}
                  disabled={busy}
                >
                  <View style={styles.docCardRow}>
                    <View style={styles.docAvatarCompleted}>
                      <Text style={styles.docIconText}>
                        {doc.status === 'APPROVED' ? '✅' : '⏳'}
                      </Text>
                    </View>
                    <View style={styles.docInfo}>
                      <Text style={styles.docLabel}>{meta.label}</Text>
                      <Text style={styles.docSublabel}>
                        {doc.status ? DOCUMENT_STATUS_LABELS[doc.status] : meta.sub}
                      </Text>
                    </View>
                  </View>
                  {busy ? (
                    <ActivityIndicator color={Colors.darkGreen} />
                  ) : (
                    <View style={styles.checkMark}>
                      <Text style={{ color: Colors.darkGreen, fontSize: 12 }}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }

            // Pièce refusée ou expirée : mise en avant, avec le motif de
            // l'admin, pour que le livreur sache quoi corriger.
            if (rejected) {
              return (
                <View key={doc.type} style={styles.docCardActive}>
                  <View style={styles.docCardActiveRow}>
                    <View style={[styles.docIcon, { backgroundColor: Colors.gold }]}>
                      <Text style={styles.docIconText}>{meta.icon}</Text>
                    </View>
                    <View style={styles.docInfo}>
                      <Text style={styles.docLabel}>{meta.label}</Text>
                      <Text style={styles.docRejected}>
                        {doc.status === 'EXPIRED'
                          ? 'Document expiré — à renouveler'
                          : doc.rejectionReason ?? 'Document refusé — à redéposer'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={() => handleUpload(doc.type)}
                    disabled={busy}
                  >
                    {busy ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <Text style={styles.uploadBtnText}>Redéposer →</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            }

            // Pièce jamais déposée.
            return (
              <TouchableOpacity
                key={doc.type}
                style={styles.docCardPending}
                activeOpacity={0.8}
                onPress={() => handleUpload(doc.type)}
                disabled={busy}
              >
                <View style={styles.docCardRow}>
                  <View style={[styles.docIcon, { backgroundColor: Colors.darkGreen }]}>
                    <Text style={styles.docIconText}>{meta.icon}</Text>
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docLabel}>
                      {meta.label}{doc.required ? ' *' : ''}
                    </Text>
                    <Text style={styles.docSublabel}>{meta.sub}</Text>
                  </View>
                </View>
                {busy ? (
                  <ActivityIndicator color={Colors.darkGreen} />
                ) : (
                  <Text style={{ color: Colors.darkGreen, fontSize: 20 }}>›</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CTA — la soumission n'est possible qu'une fois les pièces
            obligatoires (*) déposées ; le serveur revérifie de toute façon. */}
        <View style={styles.ctaArea}>
          <TouchableOpacity
            style={[styles.submitBtn, (!progress?.canSubmit || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!progress?.canSubmit || submitting}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>
              {submitting ? 'Envoi…' : 'Soumettre ma candidature'}
            </Text>
            {!submitting && <Text style={{ color: Colors.cream, fontSize: 16 }}>→</Text>}
          </TouchableOpacity>
          {!progress?.canSubmit && (
            <Text style={styles.legalText}>
              Déposez les documents marqués d'une étoile (*) pour pouvoir soumettre.
            </Text>
          )}
          <Text style={styles.legalText}>
            En soumettant, vous acceptez nos conditions{'\n'}d'utilisation et la politique de confidentialité de MALAW
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: Colors.cream,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(26,61,43,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 24,
  },
  progressSection: {
    gap: 12,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStep: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  progressPct: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  progressTrack: {
    height: 8,
    borderRadius: 9999,
    backgroundColor: 'rgba(26,61,43,0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 9999,
    backgroundColor: Colors.darkGreen,
  },
  headerContent: {
    gap: 8,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  pageDesc: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 24,
    opacity: 0.8,
  },
  docGrid: {
    gap: 12,
  },
  docCardCompleted: {
    height: 108,
    borderRadius: Radii.xl,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  docCardActive: {
    borderRadius: Radii.xl,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.gold,
    padding: 20,
    gap: 16,
  },
  docCardActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  docCardPending: {
    height: 100,
    borderRadius: Radii.xl,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.darkGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  docCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  docIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docAvatarCompleted: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(26,61,43,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docIconText: {
    fontSize: 20,
  },
  docInfo: {
    flex: 1,
    gap: 4,
  },
  docLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  docSublabel: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.6,
  },
  docRejected: {
    fontSize: 12,
    fontWeight: '500',
    color: '#C0392B',
    fontFamily: 'Manrope_500Medium',
    lineHeight: 18,
  },
  centered: { alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.45 },
  checkMark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(26,61,43,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtn: {
    height: 56,
    borderRadius: Radii.sm,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
  },
  ctaArea: {
    gap: 16,
  },
  submitBtn: {
    height: 64,
    borderRadius: Radii.sm,
    backgroundColor: Colors.darkGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  legalText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 18,
    opacity: 0.7,
  },
});
