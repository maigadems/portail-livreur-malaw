import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface MalawLogoProps {
  size?: number;
}

export default function MalawLogo({ size = 40 }: MalawLogoProps) {
  const radius = size / 2;
  return (
    <View style={[styles.wrapper, { width: size, height: size, borderRadius: radius }]}>
      <Image
        source={require('../../assets/malaw-logo.png')}
        style={{ width: size, height: size }}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
});
