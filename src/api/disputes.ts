import { api } from './client';

/**
 * Litiges — signalements déposés par le livreur sur une course qu'il a prise
 * en charge. Traités par la console service client (OPEN → ASSIGNED →
 * RESOLVED/REJECTED côté backend). L'app ne fait qu'ouvrir le dossier et en
 * suivre l'état.
 */

export type DisputeCategory =
  | 'ORDER_NOT_RECEIVED'
  | 'ORDER_LATE'
  | 'ORDER_INCOMPLETE'
  | 'FOOD_QUALITY'
  | 'COURIER_BEHAVIOR'
  | 'PAYMENT_ISSUE'
  | 'OTHER';

export type DisputeStatus = 'OPEN' | 'ASSIGNED' | 'RESOLVED' | 'REJECTED';

export type Dispute = {
  id: string;
  orderId: string;
  category: DisputeCategory;
  subject: string;
  description: string;
  status: DisputeStatus;
  resolution: string | null;
  createdAt: string;
};

/**
 * Motifs proposés au livreur. Ce sont les catégories du backend, formulées
 * de son point de vue (un « Client difficile » relève de COURIER_BEHAVIOR,
 * qui couvre le comportement pendant la course, dans les deux sens).
 */
export const DISPUTE_CATEGORIES: { value: DisputeCategory; icon: string; label: string }[] = [
  { value: 'PAYMENT_ISSUE', icon: '💰', label: 'Paiement incorrect' },
  { value: 'ORDER_INCOMPLETE', icon: '📦', label: 'Commande incomplète' },
  { value: 'ORDER_NOT_RECEIVED', icon: '🧭', label: 'Client ou adresse introuvable' },
  { value: 'COURIER_BEHAVIOR', icon: '😤', label: 'Incident avec le client' },
  { value: 'ORDER_LATE', icon: '⏰', label: 'Attente excessive au restaurant' },
  { value: 'OTHER', icon: '💬', label: 'Autre' },
];

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  OPEN: 'En attente de traitement',
  ASSIGNED: 'Pris en charge par un agent',
  RESOLVED: 'Résolu',
  REJECTED: 'Rejeté',
};

/**
 * Ouvre un litige sur une commande. Le backend n'accepte que le client de la
 * commande ou le livreur qui l'a prise en charge (403 sinon), et refuse un
 * second litige tant que le précédent est OPEN/ASSIGNED (400).
 */
export function createDispute(
  orderId: string,
  input: { category: DisputeCategory; subject: string; description: string },
): Promise<Dispute> {
  return api(`/disputes/orders/${encodeURIComponent(orderId)}`, {
    method: 'POST',
    body: input,
  });
}

/** Litiges déposés par ce livreur, du plus récent au plus ancien. */
export async function listMyDisputes(): Promise<Dispute[]> {
  const data = await api('/disputes/mine');
  return data?.items ?? [];
}
