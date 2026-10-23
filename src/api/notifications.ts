import { api } from './client';

/**
 * Fil de notifications du livreur.
 *
 * Le serveur tient l'historique : l'app ne stocke rien localement, pour que
 * le même fil soit cohérent après une réinstallation ou sur un autre
 * appareil. Le marquage « lu » est donc un appel réseau, pas un état local.
 */

/**
 * Familles de notifications. Les valeurs sont exactement celles émises par
 * le serveur (`NOTIFICATION_TYPES`) : une divergence ferait silencieusement
 * disparaître des notifications des filtres.
 */
export type NotificationType =
  | 'order_status'
  | 'courier_delivery_available'
  | 'courier_delivery_cancelled'
  | 'courier_kyc_approved'
  | 'courier_kyc_rejected'
  | 'dispute_resolved'
  | 'payout_paid'
  | 'payout_rejected'
  | 'review_received'
  | 'promo'
  | 'system';

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  /** Charge libre : sert à ouvrir le bon écran au tap. */
  data?: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

/** Regroupement utilisé par les filtres de l'écran Notifications. */
export type NotificationFilter = 'all' | 'courses' | 'paiements' | 'infos';

const FILTER_TYPES: Record<Exclude<NotificationFilter, 'all'>, string[]> = {
  courses: ['order_status', 'courier_delivery_available', 'courier_delivery_cancelled'],
  paiements: ['payout_paid', 'payout_rejected'],
  infos: [
    'courier_kyc_approved',
    'courier_kyc_rejected',
    'dispute_resolved',
    'review_received',
    'promo',
    'system',
  ],
};

/**
 * Applique un filtre côté app : le serveur renvoie le fil complet.
 *
 * Un type inconnu (ajouté côté serveur après coup) reste visible dans
 * « Toutes » : mieux vaut une notification non classée qu'une notification
 * invisible.
 */
export function filterNotifications(
  items: AppNotification[],
  filter: NotificationFilter,
): AppNotification[] {
  if (filter === 'all') return items;
  const types = FILTER_TYPES[filter];
  return items.filter((n) => types.includes(n.type));
}

export async function listNotifications(limit = 50): Promise<AppNotification[]> {
  const data = await api(`/notifications?limit=${limit}`);
  // Le serveur peut renvoyer un tableau nu ou une enveloppe selon la route.
  if (Array.isArray(data)) return data;
  return data?.items ?? [];
}

export async function unreadCount(): Promise<number> {
  const data = await api('/notifications/unread-count');
  return typeof data?.count === 'number' ? data.count : 0;
}

export function markRead(id: string) {
  return api(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
}

export function markAllRead() {
  return api('/notifications/read-all', { method: 'PATCH' });
}

export function removeNotification(id: string) {
  return api(`/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
