import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Courses "ignorées" par le livreur (bouton Ignorer du dashboard). Persistées
 * localement (AsyncStorage) : une course ignorée reste masquée de SA liste de
 * courses à proximité, même après redémarrage de l'app, tant qu'elle est
 * disponible. C'est un choix strictement local au livreur — le backend ne sait
 * pas qu'elle est ignorée (la course reste disponible pour les autres livreurs).
 */
const KEY = '@malaw-livreur/ignoredDeliveries';

export async function getIgnoredIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function ignoreDelivery(deliveryId: string): Promise<void> {
  const list = await getIgnoredIds();
  if (list.includes(deliveryId)) return;
  await AsyncStorage.setItem(KEY, JSON.stringify([...list, deliveryId]));
}

/** Retire des IDs de la liste ignorée (nettoyage des courses qui ne sont plus
 *  disponibles, pour éviter que la liste grossisse indéfiniment). */
export async function pruneIgnored(stillAvailableIds: string[]): Promise<void> {
  const list = await getIgnoredIds();
  const available = new Set(stillAvailableIds);
  const kept = list.filter((id) => available.has(id));
  if (kept.length !== list.length) {
    await AsyncStorage.setItem(KEY, JSON.stringify(kept));
  }
}
