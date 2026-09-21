import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';

import { API_URL, getToken } from '../api/client';
import { Colors } from '../constants/theme';

/**
 * Carte statique servie par notre API (qui relaie Mapbox et garde le token).
 *
 * Deux points fournis → cadrage automatique sur les deux (position du livreur
 * et destination). Un seul → carte centrée dessus.
 *
 * Si l'API n'a pas de token Mapbox, elle répond 204 : l'image échoue et on
 * retombe sur le visuel d'origine, sans écran cassé.
 */
export default function StaticMap({
  latitude,
  longitude,
  toLatitude,
  toLongitude,
  polyline,
  label,
  style,
}: {
  latitude?: number | null;
  longitude?: number | null;
  toLatitude?: number | null;
  toLongitude?: number | null;
  /** Tracé polyline (précision 5) renvoyé par getRoute() — dessine l'itinéraire. */
  polyline?: string | null;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [source, setSource] = useState<{ uri: string; headers: Record<string, string> } | null>(
    null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    if (latitude == null || longitude == null) {
      setSource(null);
      return;
    }
    (async () => {
      const token = await getToken();
      if (!token || !active) return;
      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        width: '640',
        height: '400',
      });
      if (toLatitude != null && toLongitude != null) {
        params.set('toLatitude', String(toLatitude));
        params.set('toLongitude', String(toLongitude));
      }
      if (polyline) params.set('polyline', polyline);
      setSource({
        uri: `${API_URL}/geo/static-map?${params}`,
        headers: { Authorization: `Bearer ${token}` },
      });
    })();
    return () => { active = false; };
  }, [latitude, longitude, toLatitude, toLongitude, polyline]);

  if (!source || failed) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.emoji}>🗺️</Text>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={source}
        style={styles.image}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.darkGreen,
  },
  emoji: { fontSize: 44, opacity: 0.35 },
  label: {
    fontSize: 13,
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.8,
  },
});
