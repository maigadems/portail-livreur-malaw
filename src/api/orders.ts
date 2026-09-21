import { api } from './client';

/**
 * Commandes vues côté livreur — GET /orders/:id, PATCH /orders/:id/status.
 * Le livreur peut faire avancer READY_FOR_PICKUP → IN_TRANSIT (départ vers
 * le client) puis IN_TRANSIT → DELIVERED (remise, avec le code que le
 * client lui a donné à voix haute — jamais lu depuis l'API).
 */

export function getOrder(id: string) {
  return api(`/orders/${encodeURIComponent(id)}`);
}

/** Démarre la livraison : le colis est récupéré, direction le client. */
export function startDelivery(orderId: string) {
  return api(`/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    body: { status: 'IN_TRANSIT' },
  });
}

/**
 * Confirme la remise. `deliveryCode` = code à 4 chiffres demandé oralement
 * au client ; vérifié côté serveur (bcrypt), 401 si incorrect.
 */
export function confirmDelivery(orderId: string, deliveryCode: string) {
  return api(`/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    body: { status: 'DELIVERED', deliveryCode },
  });
}
