import { api } from './client';

/**
 * Livraisons — GET /deliveries/available, POST /deliveries/:id/assign,
 * PATCH /couriers/me/availability, GET /couriers/me/active-delivery.
 */

export type AvailableDelivery = {
  id: string;
  status: string;
  distanceKm?: number;
  createdAt?: string;
  order: {
    id: string;
    total: number;
    deliveryFee: number;
    restaurant: { name: string; latitude: number; longitude: number; address: string };
    deliveryAddress: { latitude: number; longitude: number; line: string };
    customer?: { firstName: string | null };
  };
};

export async function listAvailableDeliveries(): Promise<AvailableDelivery[]> {
  const data = await api('/deliveries/available');
  return data?.items ?? [];
}

export type DeliveryDetail = {
  id: string;
  status: string;
  createdAt: string;
  deliveredAt: string | null;
  order: {
    id: string;
    total: number;
    deliveryFee: number;
    itemsTotal?: number;
    notes?: string | null;
    // Le serveur inclut le restaurant et l'adresse en entier : les
    // coordonnées servent à tracer la carte de l'alerte et du trajet.
    restaurant: { name: string; address: string; latitude: number; longitude: number };
    deliveryAddress: { line: string; latitude: number; longitude: number };
    customer: { id: string; name: string | null; phone: string } | null;
    items: { id: string; name: string; quantity: number; unitPrice: number }[];
  };
};

export function getDelivery(id: string): Promise<DeliveryDetail> {
  return api(`/deliveries/${encodeURIComponent(id)}`);
}

/** Le livreur accepte une course — POST /deliveries/:id/assign { courierId }. */
export function assignDelivery(deliveryId: string, courierId: string) {
  return api(`/deliveries/${encodeURIComponent(deliveryId)}/assign`, {
    method: 'POST',
    body: { courierId },
  });
}

export function setAvailability(available: boolean, coords?: { latitude: number; longitude: number }) {
  return api('/couriers/me/availability', {
    method: 'PATCH',
    body: { available, ...(coords ?? {}) },
  });
}

/** Course actuellement en cours pour ce livreur (ASSIGNED/PICKED_UP/IN_TRANSIT), ou null. */
export function getActiveDelivery() {
  return api('/couriers/me/active-delivery');
}

export type ActiveDelivery = {
  id: string;
  status: string;
  createdAt: string;
  order: {
    id: string;
    total: number;
    deliveryFee: number;
    restaurant: { name: string; address: string; latitude: number; longitude: number };
    deliveryAddress: { line: string; latitude: number; longitude: number };
    customer: { id: string; name: string | null; phone: string } | null;
  };
};

/** Toutes les courses en cours du livreur (0 à 3), triées ancien → récent. */
export function getActiveDeliveries(): Promise<ActiveDelivery[]> {
  return api('/couriers/me/active-deliveries');
}

/** Nombre max de courses simultanées côté client (aligné sur le backend). */
export const MAX_ACTIVE_DELIVERIES = 3;

/**
 * Abandon d'une course déjà acceptée.
 *
 * Sans cela, un livreur bloqué (restaurant fermé, client introuvable, panne)
 * garde la course indéfiniment : elle occupe un de ses trois créneaux et
 * l'empêche de se mettre hors ligne. La course repart au dispatch et
 * redevient disponible pour les autres.
 */
export type AbandonReason =
  | 'RESTAURANT_CLOSED'
  | 'ORDER_NOT_READY'
  | 'RESTAURANT_ISSUE'
  | 'CUSTOMER_UNREACHABLE'
  | 'ADDRESS_UNREACHABLE'
  | 'ACCIDENT'
  | 'VEHICLE_BREAKDOWN'
  | 'TOO_FAR'
  | 'PERSONAL_REASON'
  | 'OTHER';

/**
 * Motifs proposés au livreur. Les valeurs sont celles du serveur
 * (`abandon-reasons.ts`) : toute divergence ferait rejeter la demande.
 *
 * `blaming` indique que l'abandon sera retenu dans son taux de fiabilité.
 * On l'affiche honnêtement au moment du choix plutôt que de le lui
 * apprendre après coup — mais sans trier la liste par pénalité, pour ne pas
 * inciter à déclarer un faux motif.
 */
export const ABANDON_REASONS: {
  value: AbandonReason;
  label: string;
  icon: string;
  blaming: boolean;
}[] = [
  { value: 'RESTAURANT_CLOSED', label: 'Le restaurant est fermé', icon: '🚪', blaming: false },
  { value: 'ORDER_NOT_READY', label: "La commande n'est pas prête", icon: '⏰', blaming: false },
  { value: 'RESTAURANT_ISSUE', label: 'Autre problème au restaurant', icon: '🍽️', blaming: false },
  { value: 'CUSTOMER_UNREACHABLE', label: 'Client injoignable', icon: '📵', blaming: false },
  { value: 'ADDRESS_UNREACHABLE', label: 'Adresse introuvable', icon: '🧭', blaming: false },
  { value: 'ACCIDENT', label: 'Accident ou urgence', icon: '🚨', blaming: false },
  { value: 'VEHICLE_BREAKDOWN', label: 'Panne de véhicule', icon: '🛠️', blaming: true },
  { value: 'TOO_FAR', label: 'Course trop éloignée', icon: '📍', blaming: true },
  { value: 'PERSONAL_REASON', label: 'Convenance personnelle', icon: '🙋', blaming: true },
  { value: 'OTHER', label: 'Autre', icon: '💬', blaming: true },
];

export function abandonDelivery(
  deliveryId: string,
  input: { reason: AbandonReason; details?: string },
) {
  return api(`/deliveries/${encodeURIComponent(deliveryId)}/abandon`, {
    method: 'POST',
    body: input,
  });
}
