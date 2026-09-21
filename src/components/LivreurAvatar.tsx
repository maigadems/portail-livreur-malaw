import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '../constants/theme';
import { getStoredUser } from '../api/client';

interface Props {
  size?: number;
  borderColor?: string;
  borderWidth?: number;
  /** Photo de profil réelle (avatarUrl). Si non fourni, on lit celle de la
   *  session locale ; sinon image par défaut. */
  uri?: string | null;
}

export default function LivreurAvatar({ size = 40, borderColor = Colors.gold, borderWidth = 2, uri }: Props) {
  // Repli sur la photo de la session stockée quand aucun uri explicite n'est
  // passé — ainsi la vraie photo s'affiche partout (top bars) sans que chaque
  // écran ait à charger le profil.
  const [sessionUri, setSessionUri] = useState<string | null>(null);
  useEffect(() => {
    if (uri !== undefined) return; // uri contrôlé par le parent
    let active = true;
    getStoredUser<{ avatarUrl?: string | null }>()
      .then((u) => { if (active) setSessionUri(u?.avatarUrl ?? null); })
      .catch(() => {});
    return () => { active = false; };
  }, [uri]);

  const finalUri = uri !== undefined ? uri : sessionUri;
  const inner = size - borderWidth * 2;
  return (
    <View
      style={[
        styles.border,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor,
          borderWidth,
        },
      ]}
    >
      <Image
        source={finalUri ? { uri: finalUri } : require('../public/profil-livreur.avif')}
        style={{ width: inner, height: inner, borderRadius: inner / 2 }}
        contentFit="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  border: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
