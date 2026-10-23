import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ActiveDelivery,
  getActiveDeliveries,
  setAvailability,
  MAX_ACTIVE_DELIVERIES,
} from '../api/deliveries';
import { getProfile } from '../api/couriers';
import { subscribeCourierFeed } from '../api/realtime';
import {
  getCurrentPosition,
  startTracking,
  stopTracking,
} from '../services/locationTracking';

/**
 * État de service du livreur : ce qu'il transporte et s'il est en ligne.
 *
 * Pourquoi un contexte plutôt que des paramètres de navigation : les
 * identifiants de course circulaient d'écran en écran par `route.params`.
 * Conséquence, l'app ne savait plus rien après une fermeture, aucun écran
 * ne pouvait s'abonner au temps réel pour l'ensemble des courses, et rien
 * n'affichait qu'il restait une deuxième course à livrer.
 *
 * C'est aussi le seul endroit qui pilote le suivi de position. Le faire
 * depuis un écran liait le suivi à sa présence dans la pile de navigation,
 * ce qui est fragile : les écrans ne doivent plus appeler `startTracking`
 * ni `stopTracking` eux-mêmes.
 */

const CURRENT_KEY = '@malaw-livreur/currentDeliveryId';

type CourseContextValue = {
  /** Courses acceptées et non terminées, de la plus ancienne à la plus récente. */
  activeDeliveries: ActiveDelivery[];
  /** Course sur laquelle le livreur travaille en ce moment. */
  current: ActiveDelivery | null;
  currentId: string | null;
  /** Vrai tant que le premier chargement n'a pas abouti. */
  loading: boolean;
  /** Le livreur est-il en service ? */
  online: boolean;
  /** Il ne peut plus accepter de course. */
  atCapacity: boolean;
  /** Le canal temps réel est-il confirmé par le serveur ? */
  live: boolean;
  refresh: () => Promise<void>;
  selectCourse: (deliveryId: string | null) => void;
  goOnline: () => Promise<void>;
  goOffline: () => Promise<void>;
};

const CourseContext = createContext<CourseContextValue | null>(null);

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [live, setLive] = useState(false);

  // Évite de replanifier le suivi à chaque rendu : on ne réagit qu'à un
  // changement réel de la liste des courses.
  const trackedIds = useRef<string>('');

  const refresh = useCallback(async () => {
    try {
      const [items, profile] = await Promise.all([
        getActiveDeliveries().catch(() => [] as ActiveDelivery[]),
        getProfile().catch(() => null),
      ]);
      setActiveDeliveries(items);
      if (profile) setOnline(Boolean(profile.courierAvailable));

      // Une course choisie qui n'existe plus (livrée, abandonnée, annulée)
      // ne doit pas rester sélectionnée.
      setCurrentId((prev) => {
        if (prev && items.some((d) => d.id === prev)) return prev;
        return items.length > 0 ? items[0].id : null;
      });
    } catch {
      // Hors ligne ou session expirée : on conserve le dernier état connu
      // plutôt que de vider l'écran.
    } finally {
      setLoading(false);
    }
  }, []);

  // Chargement initial, en réutilisant la course laissée en cours.
  useEffect(() => {
    let alive = true;
    (async () => {
      const stored = await AsyncStorage.getItem(CURRENT_KEY).catch(() => null);
      if (alive && stored) setCurrentId(stored);
      await refresh();
    })();
    return () => {
      alive = false;
    };
  }, [refresh]);

  // Persiste la course courante pour la retrouver après fermeture de l'app.
  useEffect(() => {
    if (currentId) AsyncStorage.setItem(CURRENT_KEY, currentId).catch(() => {});
    else AsyncStorage.removeItem(CURRENT_KEY).catch(() => {});
  }, [currentId]);

  // Resynchronisation au retour au premier plan : le canal temps réel meurt
  // en arrière-plan, l'état a pu changer entre-temps.
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') void refresh();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [refresh]);

  // Canal temps réel : une course annulée doit interrompre le livreur tout
  // de suite, pas au prochain rafraîchissement.
  useEffect(() => {
    const unsubscribe = subscribeCourierFeed({
      onStatusChange: setLive,
      onDeliveryCancelled: () => {
        void refresh();
      },
    });
    return unsubscribe;
  }, [refresh]);

  // Suivi de position, piloté par le seul état de service.
  useEffect(() => {
    const ids = activeDeliveries.map((d) => d.id);
    const key = `${online}|${ids.join(',')}`;
    if (trackedIds.current === key) return;
    trackedIds.current = key;

    if (!online) {
      stopTracking();
      return;
    }
    if (ids.length > 0) startTracking('delivering', ids);
    else startTracking('online');
  }, [online, activeDeliveries]);

  // Filet de sécurité : ne jamais laisser un suivi tourner après démontage.
  useEffect(() => () => stopTracking(), []);

  const goOnline = useCallback(async () => {
    const pos = await getCurrentPosition();
    await setAvailability(true, pos ?? undefined);
    setOnline(true);
    await refresh();
  }, [refresh]);

  const goOffline = useCallback(async () => {
    await setAvailability(false);
    setOnline(false);
    stopTracking();
  }, []);

  const selectCourse = useCallback((deliveryId: string | null) => {
    setCurrentId(deliveryId);
  }, []);

  const value = useMemo<CourseContextValue>(() => {
    const current = activeDeliveries.find((d) => d.id === currentId) ?? null;
    return {
      activeDeliveries,
      current,
      currentId: current?.id ?? null,
      loading,
      online,
      atCapacity: activeDeliveries.length >= MAX_ACTIVE_DELIVERIES,
      live,
      refresh,
      selectCourse,
      goOnline,
      goOffline,
    };
  }, [activeDeliveries, currentId, loading, online, live, refresh, selectCourse, goOnline, goOffline]);

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
}

/** Accès à l'état de service. À utiliser dans tout écran du cycle de course. */
export function useCourse(): CourseContextValue {
  const ctx = useContext(CourseContext);
  if (!ctx) {
    throw new Error('useCourse doit être utilisé à l’intérieur de CourseProvider.');
  }
  return ctx;
}
