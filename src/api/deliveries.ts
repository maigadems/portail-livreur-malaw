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
    restaurant: { name: string; address: string };
    deliveryAddress: { line: string };
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
