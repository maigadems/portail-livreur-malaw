import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import {
  getApplication,
  DOCUMENT_LABELS,
  ApplicationPayload,
  DocumentItem,
} from '../api/documents';

type DocStatus = 'valid' | 'expiring' | 'expired' | 'pending' | 'missing' | 'rejected';

const STATUS_CONFIG: Record<DocStatus, { color: string; bg: string; label: string; icon: string }> = {
  valid: { color: Colors.successDark, bg: 'rgba(34,197,94,0.1)', label: 'Valide', icon: '✓' },
  expiring: { color: Colors.goldLight, bg: 'rgba(244,189,97,0.12)', label: 'Expire bientôt', icon: '⚠️' },
  expired: { color: Colors.errorLight, bg: 'rgba(192,57,43,0.1)', label: 'Expiré', icon: '✕' },
  rejected: { color: Colors.errorLight, bg: 'rgba(192,57,43,0.1)', label: 'Refusé', icon: '✕' },
  pending: { color: Colors.muted, bg: 'rgba(193,200,193,0.1)', label: 'En attente', icon: '⏳' },
  missing: { color: Colors.muted, bg: 'rgba(193,200,193,0.1)', label: 'À fournir', icon: '＋' },
};

/**
 * Traduit l'état serveur d'une pièce en état d'affichage. « Expire bientôt »
 * s'appuie sur `expiringSoon`, calculé côté serveur — pas sur l'horloge du
 * téléphone.
 */
function toDisplayStatus(doc: DocumentItem): DocStatus {
  if (!doc.uploaded) return 'missing';
  if (doc.status === 'EXPIRED') return 'expired';
  if (doc.status === 'REJECTED') return 'rejected';
  if (doc.status === 'PENDING') return 'pending';
  if (doc.expiringSoon) return 'expiring';
  return 'valid';
}

function subtitleFor(doc: DocumentItem): string {
  if (!doc.uploaded) return DOCUMENT_LABELS[doc.type].sub;
  if (doc.status === 'REJECTED') return doc.rejectionReason ?? 'Document refusé';
  if (doc.status === 'EXPIRED') return 'Document expiré — à renouveler';
  if (doc.status === 'PENDING') return "En attente de validation par notre équipe";
  if (doc.expiringSoon && doc.daysToExpiry != null) {
    return `Expire dans ${doc.daysToExpiry} jour${doc.daysToExpiry > 1 ? 's' : ''} !`;
  }
  if (doc.updatedAt) {
    return `Mise à jour le ${new Date(doc.updatedAt).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric',
    })}`;
  }
  return DOCUMENT_LABELS[doc.type].sub;
}

export default function StatutDocumentsScreen() {
  const navigation = useNavigation<any>();
  const [payload, setPayload] = useState<ApplicationPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getApplication()
        .then((p) => { if (active) setPayload(p); })
        .catch(() => {})
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, []),
  );

  const docs = (payload?.items ?? []).map((d) => ({
    doc: d,
    status: toDisplayStatus(d),
  }));
  const expiring = docs.filter((d) => d.status === 'expiring').length;
  const expired = docs.filter((d) => d.status === 'expired' || d.status === 'rejected').length;
  const valid = docs.filter((d) => d.status === 'valid').length;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.gold} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Mes documents</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('Documents')}
        >
          <Text style={styles.addBtnText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Alert banner */}
        {(expiring > 0 || expired > 0) && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <View style={styles.alertText}>
              <Text style={styles.alertTitle}>
                {expiring > 0 ? `${expiring} document(s) expirent bientôt` : `${expired} document(s) expiré(s)`}
              </Text>
              <Text style={styles.alertDesc}>
                Renouvelez-les pour maintenir votre compte actif et éviter une suspension
              </Text>
            </View>
          </View>
        )}

        {/* Summary */}
        <View style={styles.summaryRow}>
          {[
            { count: valid, label: 'Valides', color: Colors.successDark },
            { count: expiring, label: 'À renouveler', color: Colors.goldLight },
            { count: expired, label: 'Refusés / expirés', color: Colors.errorLight },
          ].map((s, i) => (
            <View key={i} style={styles.summaryCard}>
              <Text style={[styles.summaryCount, { color: s.color }]}>{s.count}</Text>
              <Text style={styles.summaryLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Doc list — état réel de chaque pièce du dossier */}
        <View style={styles.docList}>
          {docs.map(({ doc, status }) => {
            const cfg = STATUS_CONFIG[status];
            const meta = DOCUMENT_LABELS[doc.type];
            const needsAction =
              status === 'expiring' || status === 'expired' || status === 'rejected' || status === 'missing';
            return (
              <TouchableOpacity
                key={doc.type}
                style={[styles.docCard, { borderColor: `${cfg.color}30` }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Documents')}
              >
                <View style={styles.docLeft}>
                  <View style={[styles.docIconBg, { backgroundColor: cfg.bg }]}>
                    <Text style={styles.docIcon}>{meta.icon}</Text>
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docLabel}>
                      {meta.label}{doc.required ? ' *' : ''}
                    </Text>
                    <Text style={[styles.docSub, status === 'expiring' && { color: Colors.goldLight }]}>
                      {subtitleFor(doc)}
                    </Text>
                    {doc.expiresAt && (
                      <Text style={styles.docExpiry}>
                        Expiration : {new Date(doc.expiresAt).toLocaleDateString('fr-FR')}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.docRight}>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: cfg.color }]}>
                      {cfg.icon} {cfg.label}
                    </Text>
                  </View>
                  {needsAction && (
                    <TouchableOpacity
                      style={styles.renewBtn}
                      onPress={() => navigation.navigate('Documents')}
                    >
                      <Text style={styles.renewBtnText}>
                        {status === 'missing' ? 'Ajouter' : 'Renouveler'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Info note */}
        <View style={styles.infoNote}>
          <Text style={styles.infoNoteIcon}>ℹ️</Text>
          <Text style={styles.infoNoteText}>
            Malaw vous notifie 30 jours avant l'expiration de vos documents. Gardez-les à jour pour éviter la suspension de votre compte.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.deepBlack },
  centered: { alignItems: 'center', justifyContent: 'center' },
  topBar: {
    height: 72,
    backgroundColor: Colors.nearBlack,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(169,208,182,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 18, color: Colors.gold, fontWeight: '700' },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  addBtn: {
    borderRadius: 9999,
    backgroundColor: 'rgba(169,208,182,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 16,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(244,189,97,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244,189,97,0.25)',
    padding: 14,
  },
  alertIcon: { fontSize: 20 },
  alertText: { flex: 1, gap: 3 },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  alertDesc: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.75,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: Radii.sm,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.3)',
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'Manrope_500Medium',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  docList: { gap: 10 },
  docCard: {
    borderRadius: Radii.md,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  docLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  docIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  docIcon: { fontSize: 20 },
  docInfo: { flex: 1, gap: 3 },
  docLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  docSub: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  docExpiry: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.dimText,
    fontFamily: 'Manrope_500Medium',
  },
  docRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope_500Medium',
  },
  renewBtn: {
    borderRadius: 9999,
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  renewBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    opacity: 0.5,
  },
  infoNoteIcon: { fontSize: 14 },
  infoNoteText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 18,
  },
});
