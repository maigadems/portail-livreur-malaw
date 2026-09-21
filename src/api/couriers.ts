import { api } from './client';

/**
 * Données livreur — GET /couriers/me/earnings, /deliveries, /profile.
 * Toutes ces routes exigent un JWT COURIER (branché via client.ts).
 */

export type Earnings = {
  today: { count: number; totalXof: number };
  week: { count: number; totalXof: number };
  allTime: { count: number; totalXof: number };
};

export function getEarnings(): Promise<Earnings> {
  return api('/couriers/me/earnings');
}

export type CourierDelivery = {
  id: string;
  status: string;
  createdAt: string;
  deliveredAt: string | null;
  order: {
    id: string;
    total: number;
    deliveryFee: number;
    restaurant: { name: string; address: string; latitude: number; longitude: number };
    deliveryAddress: { line: string; latitude: number; longitude: number };
  };
};

/** Historique des livraisons de ce livreur (50 dernières). */
export function getMyDeliveries(): Promise<CourierDelivery[]> {
  return api('/couriers/me/deliveries');
}

export type CourierProfile = {
  id: string;
  name: string | null;
  phone: string;
  avatarUrl: string | null;
  courierAvailable: boolean;
  vehicleType: string | null;
  vehicleBrand: string | null;
  vehicleColor: string | null;
  vehiclePlate: string | null;
  rating: number | null;
  ratingCount: number;
  stats: {
    totalDeliveries: number;
    totalAssigned: number;
    cancelled: number;
    completionRate: number | null;
  };
};

export function getProfile(): Promise<CourierProfile> {
  return api('/couriers/me/profile');
}
