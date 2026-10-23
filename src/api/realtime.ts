import { io, Socket } from 'socket.io-client';

import { API_URL, getToken } from './client';

/**
 * Canal temps réel du livreur.
 *
 * Deux usages distincts :
 *  - le dispatch : on écoute les courses qui deviennent disponibles, au lieu
 *    de rafraîchir un écran en boucle ;
 *  - le suivi d'une course acceptée : on est prévenu des changements de
 *    statut de la commande (annulation par le client, par exemple).
 *
 * Le serveur reste la seule source de vérité : à la réception d'un
 * événement, on recharge depuis l'API plutôt que de se fier à sa charge
 * utile. Cela évite de diverger si un message se perd ou arrive dans le
 * désordre, et c'est le motif déjà retenu dans les autres applications.
 *
 * Le socket ne remplace pas un rafraîchissement de secours : sur mobile il
 * meurt en arrière-plan et derrière certains réseaux. Les écrans gardent un
 * rechargement périodique et une resynchronisation au retour au premier plan.
 */

/** Origine du serveur : l'adresse de l'API sans son suffixe « /api ». */
const ORIGIN = API_URL.replace(/\/api\/?$/, '');

let socket: Socket | null = null;
let socketToken: string | null = null;

/**
 * Renvoie le socket courant, en le créant si besoin. Reconnecte avec un
 * nouveau jeton si la session a changé entre-temps (après un renouvellement
 * de jeton, le socket ouvert porte encore l'ancien).
 */
async function getSocket(): Promise<Socket | null> {
  const token = await getToken();
  if (!token) return null;

  if (socket?.connected && socketToken === token) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socketToken = token;
  socket = io(`${ORIGIN}/realtime`, {
    // `polling` en repli : certains réseaux mobiles et proxys bloquent les
    // websockets. Mieux vaut un canal dégradé que pas de canal du tout.
    transports: ['websocket', 'polling'],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });
  return socket;
}

/** Ferme le canal — à appeler à la déconnexion, sinon le jeton reste ouvert. */
export function closeRealtime() {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketToken = null;
  }
}

export type AvailableDeliveryEvent = {
  deliveryId: string;
  orderId: string;
  restaurantName?: string;
  restaurantAddress?: string;
  deliveryAddress?: string;
  deliveryFee?: number;
  distanceKm?: number;
};

export type CourierFeedHandlers = {
  /** Une course vient d'être proposée au dispatch. */
  onDeliveryAvailable?: (evt: AvailableDeliveryEvent) => void;
  /** Une course a été prise par quelqu'un : la retirer de la liste. */
  onDeliveryTaken?: (evt: { deliveryId: string }) => void;
  /** Une course qui m'était attribuée a été annulée. */
  onDeliveryCancelled?: (evt: { deliveryId: string; orderId: string; reason?: string }) => void;
  /** Passe à vrai quand l'abonnement est confirmé par le serveur. */
  onStatusChange?: (live: boolean) => void;
};

/**
 * S'abonne au flux de dispatch. Renvoie une fonction de désabonnement.
 *
 * L'accusé de réception du serveur est la seule preuve que le canal est
 * réellement vivant : tant qu'il n'est pas arrivé, l'écran doit continuer
 * de se fier à son rafraîchissement périodique.
 */
export function subscribeCourierFeed(handlers: CourierFeedHandlers): () => void {
  let cancelled = false;
  let cleanup: (() => void) | null = null;

  (async () => {
    const s = await getSocket();
    if (!s || cancelled) return;

    const join = () => {
      s.emit('subscribe_courier', {}, (ack: unknown) => {
        if (!cancelled) handlers.onStatusChange?.(Boolean(ack));
      });
    };

    const onAvailable = (evt: AvailableDeliveryEvent) => handlers.onDeliveryAvailable?.(evt);
    const onTaken = (evt: { deliveryId: string }) => handlers.onDeliveryTaken?.(evt);
    const onCancelled = (evt: { deliveryId: string; orderId: string; reason?: string }) =>
      handlers.onDeliveryCancelled?.(evt);
    const onDisconnect = () => handlers.onStatusChange?.(false);

    if (s.connected) join();
    s.on('connect', join);
    s.on('disconnect', onDisconnect);
    s.on('courier:delivery-available', onAvailable);
    s.on('courier:delivery-taken', onTaken);
    s.on('courier:delivery-cancelled', onCancelled);

    cleanup = () => {
      s.off('connect', join);
      s.off('disconnect', onDisconnect);
      s.off('courier:delivery-available', onAvailable);
      s.off('courier:delivery-taken', onTaken);
      s.off('courier:delivery-cancelled', onCancelled);
      s.emit('unsubscribe_courier', {});
      handlers.onStatusChange?.(false);
    };
  })();

  return () => {
    cancelled = true;
    cleanup?.();
  };
}

export type OrderStatusEvent = {
  orderId: string;
  status: string;
  from?: string | null;
  at?: string;
};

/**
 * S'abonne aux changements de statut d'une commande que le livreur a
 * acceptée. Le serveur autorise déjà le livreur assigné sur cette room :
 * aucun changement côté backend n'est nécessaire.
 *
 * `onChange` est volontairement appelé sans la charge utile : l'appelant
 * doit recharger la commande depuis l'API.
 */
export function subscribeToOrder(orderId: string, onChange: () => void): () => void {
  let cancelled = false;
  let cleanup: (() => void) | null = null;

  (async () => {
    const s = await getSocket();
    if (!s || cancelled) return;

    const event = `order:${orderId}:status`;
    const join = () => s.emit('subscribe_order', { orderId });
    const handler = () => onChange();

    if (s.connected) join();
    s.on('connect', join);
    s.on(event, handler);

    cleanup = () => {
      s.off('connect', join);
      s.off(event, handler);
      s.emit('unsubscribe_order', { orderId });
    };
  })();

  return () => {
    cancelled = true;
    cleanup?.();
  };
}
