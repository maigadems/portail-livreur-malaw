import { api } from './client';

/**
 * Remontée de position du livreur.
 *
 * Deux canaux distincts, volontairement :
 *  - PENDANT une course : PATCH /deliveries/:id/location — historisé
 *    (DeliveryLocation) et diffusé en temps réel au client qui suit sa
 *    commande. Cadence fine.
 *  - EN LIGNE sans course : PATCH /couriers/me/location — écrase la position
 *    courante sur le compte, sans historique. Sert uniquement au dispatch
 *    (« qui est dans quelle zone ? »). Refusé par le serveur si le livreur
 *    est hors ligne.
 */

export type CourierPosition = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

/** Position pendant une livraison — diffusée au client en temps réel. */
export function pushDeliveryLocation(deliveryId: string, pos: CourierPosition) {
  return api(`/deliveries/${encodeURIComponent(deliveryId)}/location`, {
    method: 'PATCH',
    body: pos,
  });
}

/** Position hors course, quand le livreur est en ligne. */
export function pushCourierLocation(pos: CourierPosition) {
  return api('/couriers/me/location', { method: 'PATCH', body: pos });
}

export type GeoRoute = {
  distanceKm: number;
  durationMin: number;
  geometry: string | null;
  /** true = estimation à vol d'oiseau (Mapbox indisponible), pas un vrai ETA. */
  estimated: boolean;
};

/** Itinéraire routier entre deux points — distance, durée et tracé. */
export function getRoute(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): Promise<GeoRoute> {
  const qs = new URLSearchParams({
    fromLatitude: String(from.latitude),
    fromLongitude: String(from.longitude),
    toLatitude: String(to.latitude),
    toLongitude: String(to.longitude),
  });
  return api(`/geo/route?${qs}`);
}
