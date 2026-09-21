import * as Location from 'expo-location';
import { AppState, AppStateStatus } from 'react-native';

import { pushCourierLocation, pushDeliveryLocation } from '../api/location';

/**
 * Suivi de position du livreur.
 *
 * Deux cadences, comme demandé :
 *  - EN COURSE   : toutes les 60 s → PATCH /deliveries/:id/location.
 *                  Historisé côté serveur et poussé en temps réel au client.
 *  - EN LIGNE    : toutes les 5 min → PATCH /couriers/me/location.
 *                  Position courante seulement, pour le dispatch par zone.
 *
 * Le suivi ne tourne QUE lorsque le livreur est en ligne : `stop()` est
 * appelé dès qu'il passe hors ligne. On ne suit personne hors de son service.
 *
 * Pas de localisation en arrière-plan : le suivi se met en pause quand l'app
 * part en arrière-plan et reprend au retour. C'est un choix délibéré (revue
 * App Store, batterie, vie privée) — voir README pour l'activer si besoin.
 */

const DELIVERY_INTERVAL_MS = 60_000; // 1 min pendant une course
const ONLINE_INTERVAL_MS = 5 * 60_000; // 5 min en ligne, sans course

type Mode = 'off' | 'online' | 'delivering';

let mode: Mode = 'off';
let timer: ReturnType<typeof setInterval> | null = null;
let appStateSub: { remove: () => void } | null = null;
/** Courses en cours : on remonte la position sur chacune d'elles. */
let activeDeliveryIds: string[] = [];
/** Dernier échec journalisé — évite de spammer la console hors ligne. */
let lastErrorAt = 0;

/**
 * Demande la permission de localisation « pendant l'utilisation ».
 * Renvoie false si refusée : l'appelant doit alors expliquer au livreur que
 * les courses proches et le suivi client ne fonctionneront pas.
 */
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function hasLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === 'granted';
}

/** Position ponctuelle, ou null si la permission manque / le GPS échoue. */
export async function getCurrentPosition(): Promise<{
  latitude: number;
  longitude: number;
  accuracy?: number;
} | null> {
  try {
    if (!(await hasLocationPermission())) return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? undefined,
    };
  } catch {
    return null;
  }
}

/** Lit la position et l'envoie sur le bon canal selon le mode courant. */
async function pushOnce() {
  const pos = await getCurrentPosition();
  if (!pos) return;

  try {
    if (mode === 'delivering' && activeDeliveryIds.length > 0) {
      // Un livreur peut porter jusqu'à 3 courses : chaque client suit la
      // sienne, donc la position part sur toutes les livraisons actives.
      await Promise.all(activeDeliveryIds.map((id) => pushDeliveryLocation(id, pos)));
    } else if (mode === 'online') {
      await pushCourierLocation(pos);
    }
  } catch (e: any) {
    // Le serveur refuse (400) si le livreur est passé hors ligne entre-temps :
    // on arrête plutôt que de marteler une route qui refusera toujours.
    if (e?.status === 400) {
      stopTracking();
      return;
    }
    const now = Date.now();
    if (now - lastErrorAt > 60_000) {
      lastErrorAt = now;
      // eslint-disable-next-line no-console
      console.warn('[location] envoi impossible :', e?.message ?? e);
    }
  }
}

function schedule() {
  if (timer) clearInterval(timer);
  if (mode === 'off') return;
  const interval = mode === 'delivering' ? DELIVERY_INTERVAL_MS : ONLINE_INTERVAL_MS;
  timer = setInterval(pushOnce, interval);
  // Un premier envoi immédiat : sans lui, le client ne verrait rien pendant
  // la première minute après l'acceptation d'une course.
  void pushOnce();
}

function handleAppState(state: AppStateStatus) {
  if (mode === 'off') return;
  if (state === 'active') {
    // Retour au premier plan : on resynchronise tout de suite puis on relance
    // le rythme normal.
    schedule();
  } else if (timer) {
    // Arrière-plan : sans permission « always », le GPS n'est de toute façon
    // pas lisible. On coupe le timer plutôt que d'accumuler des échecs.
    clearInterval(timer);
    timer = null;
  }
}

/**
 * Démarre (ou ajuste) le suivi.
 * @param nextMode 'online' = en ligne sans course ; 'delivering' = course(s) en cours
 * @param deliveryIds identifiants des livraisons actives, requis en mode 'delivering'
 */
export function startTracking(nextMode: Exclude<Mode, 'off'>, deliveryIds: string[] = []) {
  const changed = mode !== nextMode || deliveryIds.join(',') !== activeDeliveryIds.join(',');
  mode = nextMode;
  activeDeliveryIds = deliveryIds;

  if (!appStateSub) {
    appStateSub = AppState.addEventListener('change', handleAppState);
  }
  // Ne pas replanifier si rien n'a changé : sinon chaque re-render de l'écran
  // relancerait un envoi immédiat.
  if (changed || !timer) schedule();
}

/** Arrête tout suivi — à appeler quand le livreur passe hors ligne. */
export function stopTracking() {
  mode = 'off';
  activeDeliveryIds = [];
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (appStateSub) {
    appStateSub.remove();
    appStateSub = null;
  }
}

/** État courant — utile pour l'affichage d'un indicateur de suivi. */
export function trackingMode(): Mode {
  return mode;
}

/**
 * Suivi local à cadence fine, pour piloter l'affichage de l'écran de
 * navigation (position du livreur sur la carte, recalcul de l'itinéraire).
 *
 * Distinct de `startTracking()` : celui-ci pousse au serveur toutes les 60 s
 * pour le suivi client, un rythme bien trop lent pour une carte qu'on veut
 * voir bouger. Celui-ci ne pousse rien nulle part — juste un flux GPS local,
 * actif uniquement tant que l'écran de navigation est affiché.
 */
export function watchPositionLocally(
  onUpdate: (pos: { latitude: number; longitude: number }) => void,
): () => void {
  let sub: Location.LocationSubscription | null = null;
  let cancelled = false;

  (async () => {
    if (!(await hasLocationPermission())) return;
    if (cancelled) return;
    sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 4000, distanceInterval: 15 },
      (pos) => onUpdate({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
    );
    // L'abonnement a pu être annulé pendant l'attente de la permission.
    if (cancelled) sub.remove();
  })();

  return () => {
    cancelled = true;
    sub?.remove();
  };
}
