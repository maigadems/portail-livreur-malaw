export const Colors = {
  darkGreen: '#1A3D2B',
  deepBlack: '#03170C',
  nearBlack: '#001207',
  darkSurface: '#0F2418',
  cardDark: '#192E22',
  darkCard: '#0A2014',
  cream: '#F5F0E2',
  creamAlt: '#EAE3D1',
  gold: '#C8963E',
  goldLight: '#F4BD61',
  goldPale: '#FFDB A5',
  white: '#FFFFFF',
  creamText: '#F5F0E2',
  greenLight: '#D0E9D5',
  greenMid: '#A9D0B6',
  greenText: '#82A890',
  muted: '#C1C8C1',
  dimText: '#8B928C',
  success: '#22C55E',
  successDark: '#27AE60',
  error: '#C0392B',
  errorLight: '#FFB4AB',
  errorBg: '#93000A',
  forestGreen: '#1A3D2B',
  darkGreenTint: '#243C2C',
  medGreen: '#2B4E3B',
  whatsapp: '#25D366',
} as const;

/**
 * Mêmes familles typographiques que le portail-client (Epilogue pour les
 * titres/boutons, Manrope pour le corps/labels/inputs) — chargées dans
 * App.tsx. Assure une cohérence visuelle totale entre les deux apps.
 */
export const Fonts = {
  epilogue: {
    regular: 'Epilogue_400Regular',
    medium: 'Epilogue_500Medium',
    semiBold: 'Epilogue_600SemiBold',
    bold: 'Epilogue_700Bold',
    extraBold: 'Epilogue_800ExtraBold',
    black: 'Epilogue_900Black',
  },
  manrope: {
    regular: 'Manrope_400Regular',
    medium: 'Manrope_500Medium',
    semiBold: 'Manrope_600SemiBold',
    bold: 'Manrope_700Bold',
    extraBold: 'Manrope_800ExtraBold',
  },
} as const;

export const Radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  full: 9999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;
