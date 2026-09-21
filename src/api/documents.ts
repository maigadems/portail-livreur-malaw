import { api } from './client';

/**
 * KYC livreur — dépôt des pièces justificatives et suivi de la candidature.
 *
 * Le dossier vit côté serveur : une CourierApplication par livreur, et une
 * pièce courante par type. Redéposer une pièce remplace la précédente et la
 * remet en attente d'examen — c'est aussi le geste de renouvellement.
 */

export type DocumentType =
  | 'PROFILE_PHOTO'
  | 'ID_CARD'
  | 'DRIVER_LICENSE'
  | 'VEHICLE_REGISTRATION'
  | 'VEHICLE_PHOTO'
  | 'INSURANCE';

export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED';

/** Une pièce du dossier, telle que renvoyée par GET /couriers/me/application. */
export type DocumentItem = {
  id?: string;
  type: DocumentType;
  status: DocumentStatus | null;
  required: boolean;
  uploaded: boolean;
  expiresAt: string | null;
  /** Jours restants avant expiration — calculé côté serveur. */
  daysToExpiry?: number | null;
  expiringSoon?: boolean;
  reference?: string | null;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  updatedAt?: string;
};

export type CourierApplication = {
  id: string;
  status: ApplicationStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
};

export type ApplicationPayload = {
  application: CourierApplication;
  items: DocumentItem[];
  progress: {
    uploaded: number;
    total: number;
    requiredMissing: DocumentType[];
    canSubmit: boolean;
  };
};

/** Libellés d'affichage, alignés sur les maquettes des écrans. */
export const DOCUMENT_LABELS: Record<DocumentType, { label: string; sub: string; icon: string }> = {
  PROFILE_PHOTO: { label: 'Photo de profil', sub: 'Photo récente', icon: '👤' },
  ID_CARD: { label: "Carte Nationale d'Identité", sub: 'Recto et verso', icon: '🪪' },
  DRIVER_LICENSE: { label: 'Permis de conduire', sub: 'En cours de validité', icon: '🏍️' },
  VEHICLE_REGISTRATION: { label: 'Carte grise', sub: 'Véhicule de livraison', icon: '📋' },
  VEHICLE_PHOTO: { label: 'Photo du véhicule', sub: 'Moto / Voiture', icon: '🛵' },
  INSURANCE: { label: 'Assurance du véhicule', sub: 'Attestation en cours', icon: '🛡️' },
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: 'Dossier à compléter',
  SUBMITTED: 'Candidature envoyée',
  UNDER_REVIEW: "En cours d'examen",
  APPROVED: 'Compte validé',
  REJECTED: 'Candidature refusée',
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  PENDING: 'En attente de validation',
  APPROVED: 'Valide',
  REJECTED: 'Refusé',
  EXPIRED: 'Expiré',
};

/** Dossier complet : candidature, pièces (déposées ou non), progression. */
export function getApplication(): Promise<ApplicationPayload> {
  return api('/couriers/me/application');
}

/**
 * Dépose ou renouvelle une pièce. `file` est une data-URL base64 produite par
 * utils/pickDocument. `expiresAt` au format ISO (YYYY-MM-DD) quand la pièce a
 * une validité (permis, assurance, CNI).
 */
export function uploadDocument(input: {
  type: DocumentType;
  file: string;
  expiresAt?: string;
  reference?: string;
}) {
  return api('/couriers/me/documents', { method: 'POST', body: input });
}

/**
 * Contenu d'une pièce (aperçu).
 *
 * `fileUrl` est une URL SIGNÉE à durée limitée (dix minutes) : les pièces
 * justificatives sont déposées en accès restreint et ne sont pas
 * consultables par un lien permanent. Ne pas la mettre en cache ni la
 * stocker — la redemander à chaque affichage.
 *
 * `fileData` porte les anciennes pièces, encore stockées en base64.
 */
export function getDocumentFile(type: DocumentType): Promise<{
  fileData: string | null;
  fileUrl: string | null;
  mimeType: string | null;
}> {
  return api(`/couriers/me/documents/${type}/file`);
}

export function deleteDocument(type: DocumentType) {
  return api(`/couriers/me/documents/${type}`, { method: 'DELETE' });
}

/**
 * Soumet la candidature à l'examen. Le serveur refuse (400) si une pièce
 * obligatoire manque, avec la liste des manquantes dans le message.
 */
export function submitApplication(): Promise<CourierApplication> {
  return api('/couriers/me/application/submit', { method: 'POST' });
}
