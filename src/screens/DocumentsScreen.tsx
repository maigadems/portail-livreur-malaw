import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform,
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
  APPLICATION_STATUS_LABELS,
  ApplicationPayload,
  DocumentItem,
  DocumentType,
} from '../api/documents';
import { captureDocument, pickDocumentFromLibrary } from '../utils/pickDocument';
// Renommé : `uploadDocument` d'api/documents enregistre la pièce côté métier,
// celui-ci ne fait que déposer le fichier sur le service d'hébergement.
import { uploadDocument as uploadKycDocument } from '../api/uploads';
import { Alert } from '../components/AppAlert';

/**
 * Pièces qui portent une date de validité. Sans cette date, le serveur ne
 * peut jamais signaler « expire bientôt » : on la rend obligatoire ici pour
 * que l'alerte de renouvellement ait une chance d'exister.
 */
const EXPIRING_TYPES: DocumentType[] = ['ID_CARD', 'DRIVER_LICENSE', 'INSURANCE'];

/** Pièces qui portent un numéro utile à l'examen (facultatif). */
const REFERENCED_TYPES: DocumentType[] = ['ID_CARD', 'DRIVER_LICENSE'];

/**
 * Convertit une saisie « JJ/MM/AAAA » en ISO « AAAA-MM-JJ ». Renvoie null si
 * la date est mal formée ou n'existe pas (31/02). Pas de sélecteur natif :
 * aucune dépendance de date n'est installée et l'app doit tourner dans Expo Go.
 */
function parseFrenchDate(input: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  if (
    d.getUTCFullYear() !== Number(yyyy) ||
    d.getUTCMonth() !== Number(mm) - 1 ||
    d.getUTCDate() !== Number(dd)
  ) {
    return null;
  }
  return `${yyyy}-${mm}-${dd}`;
}

/** Insère les « / » au fil de la frappe pour guider la saisie. */
function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join('/');
}

type UploadSheetProps = {
  type: DocumentType | null;
  onClose: () => void;
  /** Appelé une fois la pièce enregistrée côté serveur. */
  onUploaded: () => void;
  /** Signale au parent qu'un envoi est en cours (blocage de la sortie). */
  onBusyChange: (busy: boolean) => void;
};

/**
 * Feuille de dépôt d'une pièce : date d'expiration, numéro, puis source du
 * fichier. Partagée avec StatutDocumentsScreen pour le renouvellement d'une
 * pièce en activité — même geste, même validation, un seul code.
 */
export function DocumentUploadSheet({ type, onClose, onUploaded, onBusyChange }: UploadSheetProps) {
  const [expiry, setExpiry] = useState('');
  const [reference, setReference] = useState('');
  const [phase, setPhase] = useState<'idle' | 'picking' | 'uploading'>('idle');
  // La feuille se cache pendant le choix du fichier : sur iOS, ouvrir
  // l'appareil photo par-dessus une Modal React Native échoue (« already
  // presenting »). Elle réapparaît si le livreur annule ou si l'envoi échoue,
  // avec sa saisie intacte.
  const [hidden, setHidden] = useState(false);

  // Champs remis à zéro à chaque ouverture : la date d'un permis ne doit pas
  // se retrouver pré-remplie sur une assurance.
  useEffect(() => {
    if (type) {
      setExpiry('');
      setReference('');
      setPhase('idle');
      setHidden(false);
    }
  }, [type]);

  if (!type) return null;

  const meta = DOCUMENT_LABELS[type];
  const needsExpiry = EXPIRING_TYPES.includes(type);
  const hasReference = REFERENCED_TYPES.includes(type);
  const busy = phase !== 'idle';

  const run = async (pick: () => Promise<string | null>) => {
    if (busy) return;

    let expiresAt: string | undefined;
    if (needsExpiry) {
      const iso = parseFrenchDate(expiry);
      if (!iso) {
        Alert.alert('Date invalide', "Indiquez la date d'expiration au format JJ/MM/AAAA.");
        return;
      }
      // Le serveur refuse aussi une date passée, mais autant éviter
      // l'aller-retour d'une photo pour rien.
      if (new Date(iso).getTime() < Date.now()) {
        Alert.alert('Pièce expirée', 'Cette pièce est déjà expirée. Déposez une pièce en cours de validité.');
        return;
      }
      expiresAt = iso;
    }

    setPhase('picking');
    setHidden(true);
    try {
      const dataUrl = await pick();
      if (!dataUrl) {
        setPhase('idle');
        setHidden(false);
        return;
      }
      setPhase('uploading');
      onBusyChange(true);
      // La pièce part sur le service d'hébergement, en accès restreint :
      // elle n'est plus stockée en base64 dans la base. Le service de
      // documents accepte déjà une URL distante et la range dans `fileUrl`.
      const file = await uploadKycDocument(dataUrl);
      await uploadDocument({
        type,
        file,
        expiresAt,
        reference: reference.trim() || undefined,
      });
      onUploaded();
      onClose();
    } catch (e: any) {
      setHidden(false);
      Alert.alert('Document', e?.message ?? "Impossible d'envoyer ce document.");
    } finally {
      setPhase('idle');
      onBusyChange(false);
    }
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={!hidden}
      onRequestClose={() => { if (!busy) onClose(); }}
    >
      <KeyboardAvoidingView
        style={sheetStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => { if (!busy) onClose(); }}
        />
        <View style={sheetStyles.sheet}>
          <View style={sheetStyles.handle} />
          <Text style={sheetStyles.title}>{meta.icon}  {meta.label}</Text>
          <Text style={sheetStyles.sub}>{meta.sub}</Text>

          {needsExpiry && (
            <View style={sheetStyles.field}>
              <Text style={sheetStyles.label}>Date d'expiration de la pièce *</Text>
              <TextInput
                style={sheetStyles.input}
                value={expiry}
                onChangeText={(t) => setExpiry(formatDateInput(t))}
                placeholder="JJ/MM/AAAA"
                placeholderTextColor={Colors.dimText}
                keyboardType="number-pad"
                maxLength={10}
                editable={!busy}
              />
              <Text style={sheetStyles.hint}>
                Elle sera signalée à renouveler dans « Mes documents » 30 jours avant cette date.
              </Text>
            </View>
          )}

          {hasReference && (
            <View style={sheetStyles.field}>
              <Text style={sheetStyles.label}>Numéro de la pièce (facultatif)</Text>
              <TextInput
                style={sheetStyles.input}
                value={reference}
                onChangeText={setReference}
                placeholder="Ex. 1 234 5678 90123"
                placeholderTextColor={Colors.dimText}
                autoCapitalize="characters"
                maxLength={60}
                editable={!busy}
              />
            </View>
          )}

          {phase === 'uploading' ? (
            <View style={sheetStyles.uploading}>
              <ActivityIndicator color={Colors.darkGreen} />
              <Text style={sheetStyles.uploadingText}>
                Envoi en cours… Ne quittez pas l'écran.
              </Text>
            </View>
          ) : (
            <View style={sheetStyles.actions}>
              <TouchableOpacity
                style={[sheetStyles.actionBtn, busy && sheetStyles.disabled]}
                onPress={() => run(captureDocument)}
                disabled={busy}
                activeOpacity={0.85}
              >
                <Text style={sheetStyles.actionText}>📷  Prendre en photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[sheetStyles.actionBtn, sheetStyles.actionBtnAlt, busy && sheetStyles.disabled]}
                onPress={() => run(pickDocumentFromLibrary)}
                disabled={busy}
                activeOpacity={0.85}
              >
                <Text style={[sheetStyles.actionText, sheetStyles.actionTextAlt]}>
                  🖼️  Choisir dans la galerie
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={sheetStyles.cancel} onPress={onClose} disabled={busy}>
                <Text style={sheetStyles.cancelText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function DocumentsScreen() {
  const navigation = useNavigation<any>();
  const [payload, setPayload] = useState<ApplicationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetType, setSheetType] = useState<DocumentType | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const uploadingRef = useRef(false);

  const load = useCallback(async () => {
    try {
      setPayload(await getApplication());
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message ?? 'Impossible de charger votre dossier.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Rechargé à chaque affichage : l'admin a pu statuer entre-temps.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Un envoi en cours ne doit pas être interrompu par un retour arrière
  // (bouton matériel Android compris) : la pièce serait perdue à mi-chemin
  // sans que le livreur le sache.
  useEffect(() => {
    uploadingRef.current = uploading;
  }, [uploading]);
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: any) => {
      if (uploadingRef.current) e.preventDefault();
    });
    return unsub;
  }, [navigation]);

  const application = payload?.application;
  const docs = payload?.items ?? [];
  const progress = payload?.progress;
  const uploadedCount = progress?.uploaded ?? 0;
  const total = progress?.total ?? docs.length;
  const pct = total ? Math.round((uploadedCount / total) * 100) : 0;
  const status = application?.status;
  const inReview = status === 'SUBMITTED' || status === 'UNDER_REVIEW';
  const approved = status === 'APPROVED';
  const canGoBack = navigation.canGoBack();

  const handleSubmit = async () => {
    if (submitting || uploading) return;
    setSubmitting(true);
    try {
      await submitApplication();
      // reset : l'écran d'attente devient la racine, le livreur ne doit pas
      // pouvoir « revenir » sur un dossier déjà soumis.
      navigation.reset({ index: 0, routes: [{ name: 'Attente' }] });
    } catch (e: any) {
      // Le serveur détaille les pièces manquantes dans son message.
      Alert.alert('Candidature', e?.message ?? "Impossible de soumettre votre candidature.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderDoc = (doc: DocumentItem) => {
    const meta = DOCUMENT_LABELS[doc.type];
    const rejected = doc.status === 'REJECTED' || doc.status === 'EXPIRED';
    const requirementBadge = (
      <View style={[styles.reqBadge, doc.required ? styles.reqBadgeRequired : styles.reqBadgeOptional]}>
        <Text style={[styles.reqBadgeText, doc.required ? styles.reqBadgeTextRequired : styles.reqBadgeTextOptional]}>
          {doc.required ? 'Obligatoire' : 'Facultatif'}
        </Text>
      </View>
    );

    // Pièce refusée ou expirée : mise en avant, avec le motif de l'admin,
    // pour que le livreur sache quoi corriger.
    if (rejected) {
      return (
        <View key={doc.type} style={styles.docCardActive}>
          <View style={styles.docCardActiveRow}>
            <View style={[styles.docIcon, { backgroundColor: Colors.gold }]}>
              <Text style={styles.docIconText}>{meta.icon}</Text>
            </View>
            <View style={styles.docInfo}>
              <View style={styles.docLabelRow}>
                <Text style={styles.docLabel}>{meta.label}</Text>
                {requirementBadge}
              </View>
              <Text style={styles.docStatusRejected}>
                {doc.status ? DOCUMENT_STATUS_LABELS[doc.status] : ''}
              </Text>
              <Text style={styles.docRejected}>
                {doc.status === 'EXPIRED'
                  ? 'Cette pièce a expiré. Déposez une pièce en cours de validité.'
                  : doc.rejectionReason ?? 'Document refusé — redéposez une version conforme.'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.uploadBtn, uploading && styles.disabled]}
            onPress={() => setSheetType(doc.type)}
            disabled={uploading}
            activeOpacity={0.85}
          >
            <Text style={styles.uploadBtnText}>Remplacer cette pièce →</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Pièce déposée (en attente ou validée) : on laisse la possibilité de la
    // remplacer — c'est le seul geste de renouvellement.
    if (doc.uploaded) {
      return (
        <TouchableOpacity
          key={doc.type}
          style={styles.docCardCompleted}
          activeOpacity={0.8}
          onPress={() => setSheetType(doc.type)}
          disabled={uploading}
        >
          <View style={styles.docCardRow}>
            <View style={styles.docAvatarCompleted}>
              <Text style={styles.docIconText}>{doc.status === 'APPROVED' ? '✅' : '⏳'}</Text>
            </View>
            <View style={styles.docInfo}>
              <View style={styles.docLabelRow}>
                <Text style={styles.docLabel}>{meta.label}</Text>
                {requirementBadge}
              </View>
              <Text style={styles.docSublabel}>
                {doc.status ? DOCUMENT_STATUS_LABELS[doc.status] : meta.sub}
              </Text>
              {doc.expiresAt && (
                <Text style={styles.docSublabel}>
                  Expire le {new Date(doc.expiresAt).toLocaleDateString('fr-FR')}
                </Text>
              )}
            </View>
          </View>
          <Text style={styles.replaceHint}>Remplacer</Text>
        </TouchableOpacity>
      );
    }

    // Pièce jamais déposée.
    return (
      <TouchableOpacity
        key={doc.type}
        style={[styles.docCardPending, !doc.required && styles.docCardPendingOptional]}
        activeOpacity={0.8}
        onPress={() => setSheetType(doc.type)}
        disabled={uploading}
      >
        <View style={styles.docCardRow}>
          <View style={[styles.docIcon, { backgroundColor: doc.required ? Colors.darkGreen : 'rgba(26,61,43,0.35)' }]}>
            <Text style={styles.docIconText}>{meta.icon}</Text>
          </View>
          <View style={styles.docInfo}>
            <View style={styles.docLabelRow}>
              <Text style={styles.docLabel}>{meta.label}</Text>
              {requirementBadge}
            </View>
            <Text style={styles.docSublabel}>{meta.sub}</Text>
          </View>
        </View>
        <Text style={{ color: Colors.darkGreen, fontSize: 20 }}>›</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.darkGreen} />
      </SafeAreaView>
    );
  }

  if (loadError && !payload) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { padding: 24, gap: 16 }]}>
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); load(); }}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
        {!canGoBack && (
          <TouchableOpacity onPress={() => navigation.navigate('ModalDeconnexion')}>
            <Text style={styles.logoutLink}>Se déconnecter</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {canGoBack ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, uploading && styles.disabled]}
            disabled={uploading}
          >
            <Text style={{ fontSize: 18, color: Colors.darkGreen }}>←</Text>
          </TouchableOpacity>
        ) : (
          // Écran racine juste après l'inscription : sans ce lien, un livreur
          // qui s'est trompé de compte n'aurait aucun moyen d'en sortir.
          <TouchableOpacity onPress={() => navigation.navigate('ModalDeconnexion')} disabled={uploading}>
            <Text style={styles.logoutLink}>Se déconnecter</Text>
          </TouchableOpacity>
        )}
        {application && (
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{APPLICATION_STATUS_LABELS[application.status]}</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!uploading}
      >
        {/* Progression réelle : pièces déposées sur le total attendu */}
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressStep}>
              {uploadedCount} PIÈCE{uploadedCount > 1 ? 'S' : ''} SUR {total}
            </Text>
            <Text style={styles.progressPct}>{pct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          {progress && progress.requiredMissing.length > 0 && (
            <Text style={styles.progressMissing}>
              Il manque {progress.requiredMissing.length} pièce{progress.requiredMissing.length > 1 ? 's' : ''} obligatoire{progress.requiredMissing.length > 1 ? 's' : ''} : {progress.requiredMissing.map((t) => DOCUMENT_LABELS[t].label).join(', ')}.
            </Text>
          )}
        </View>

        {/* Title */}
        <View style={styles.headerContent}>
          <Text style={styles.pageTitle}>Vos documents</Text>
          <Text style={styles.pageDesc}>
            Les pièces obligatoires sont nécessaires pour valider votre compte livreur. Les autres aident notre équipe à traiter votre dossier plus vite.
          </Text>
        </View>

        {loadError && (
          <View style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>{loadError}</Text>
          </View>
        )}

        {/* Document cards — état réel de chaque pièce */}
        <View style={styles.docGrid}>{docs.map(renderDoc)}</View>

        {/* CTA — dépend de l'état réel du dossier */}
        <View style={styles.ctaArea}>
          {approved ? (
            <Text style={styles.legalText}>
              Votre dossier est validé. Toute pièce remplacée sera réexaminée par notre équipe.
            </Text>
          ) : inReview ? (
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Attente' }] })}
              activeOpacity={0.85}
              disabled={uploading}
            >
              <Text style={styles.submitBtnText}>Suivre ma candidature</Text>
              <Text style={{ color: Colors.cream, fontSize: 16 }}>→</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.submitBtn, (!progress?.canSubmit || submitting || uploading) && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!progress?.canSubmit || submitting || uploading}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color={Colors.cream} />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Soumettre ma candidature</Text>
                    <Text style={{ color: Colors.cream, fontSize: 16 }}>→</Text>
                  </>
                )}
              </TouchableOpacity>
              {!progress?.canSubmit && (
                <Text style={styles.legalText}>
                  Déposez toutes les pièces obligatoires pour pouvoir soumettre.
                </Text>
              )}
            </>
          )}
          <Text style={styles.legalText}>
            En soumettant, vous acceptez nos conditions{'\n'}d'utilisation et la politique de confidentialité de MALAW
          </Text>
        </View>
      </ScrollView>

      {/* Voile d'attente pendant l'envoi : l'écran est figé, c'est voulu. */}
      {uploading && (
        <View style={styles.uploadOverlay} pointerEvents="auto">
          <ActivityIndicator color={Colors.cream} size="large" />
          <Text style={styles.uploadOverlayText}>Envoi de votre pièce…</Text>
          <Text style={styles.uploadOverlaySub}>Ne quittez pas l'écran.</Text>
        </View>
      )}

      <DocumentUploadSheet
        type={sheetType}
        onClose={() => setSheetType(null)}
        onUploaded={load}
        onBusyChange={setUploading}
      />
    </SafeAreaView>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.cream,
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(26,61,43,0.2)',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  sub: {
    fontSize: 13,
    color: Colors.darkGreen,
    opacity: 0.65,
    fontFamily: 'Manrope_500Medium',
    marginTop: -10,
  },
  field: { gap: 6 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  input: {
    height: 52,
    borderRadius: Radii.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(26,61,43,0.2)',
    paddingHorizontal: 14,
    fontSize: 16,
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  hint: {
    fontSize: 11,
    color: Colors.darkGreen,
    opacity: 0.6,
    fontFamily: 'Manrope_500Medium',
  },
  actions: { gap: 10 },
  actionBtn: {
    height: 56,
    borderRadius: Radii.sm,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnAlt: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.darkGreen,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  actionTextAlt: { color: Colors.darkGreen },
  cancel: { alignItems: 'center', paddingVertical: 8 },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkGreen,
    opacity: 0.6,
    fontFamily: 'Manrope_500Medium',
  },
  uploading: { alignItems: 'center', gap: 12, paddingVertical: 16 },
  uploadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  disabled: { opacity: 0.5 },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  logoutLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    textDecorationLine: 'underline',
    opacity: 0.7,
  },
  statusPill: {
    borderRadius: 9999,
    backgroundColor: 'rgba(26,61,43,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
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
  progressMissing: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.error,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 18,
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
    fontSize: 15,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 23,
    opacity: 0.8,
  },
  inlineError: {
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(192,57,43,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.25)',
    padding: 12,
  },
  inlineErrorText: {
    fontSize: 13,
    color: Colors.error,
    fontFamily: 'Manrope_500Medium',
  },
  docGrid: {
    gap: 12,
  },
  docCardCompleted: {
    minHeight: 108,
    borderRadius: Radii.xl,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    alignItems: 'flex-start',
    gap: 16,
  },
  docCardPending: {
    minHeight: 100,
    borderRadius: Radii.xl,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.darkGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  docCardPendingOptional: {
    borderColor: 'rgba(26,61,43,0.25)',
    borderStyle: 'dashed',
  },
  docCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
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
  docLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  docLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    flexShrink: 1,
  },
  reqBadge: {
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  reqBadgeRequired: { backgroundColor: 'rgba(200,150,62,0.18)' },
  reqBadgeOptional: { backgroundColor: 'rgba(26,61,43,0.08)' },
  reqBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.3,
  },
  reqBadgeTextRequired: { color: 'rgb(120,80,10)' },
  reqBadgeTextOptional: { color: Colors.darkGreen, opacity: 0.7 },
  docSublabel: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.6,
  },
  docStatusRejected: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.error,
    fontFamily: 'Manrope_500Medium',
  },
  docRejected: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 19,
  },
  replaceHint: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.darkGreen,
    opacity: 0.6,
    fontFamily: 'Manrope_500Medium',
  },
  centered: { alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.45 },
  disabled: { opacity: 0.5 },
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
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    fontFamily: 'Manrope_500Medium',
    lineHeight: 20,
  },
  retryBtn: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: Radii.sm,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,61,43,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  uploadOverlayText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  uploadOverlaySub: {
    fontSize: 13,
    color: Colors.cream,
    opacity: 0.7,
    fontFamily: 'Manrope_500Medium',
  },
});
