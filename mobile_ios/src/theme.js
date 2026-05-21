// Theme colors for Stag & Hen app
export const colors = {
  // Backgrounds
  background: '#0A0A0A',
  surface: '#141414',
  surfaceLight: '#1E1E1E',
  card: '#1A1A1A',
  
  // Primary colors
  primary: '#FF1493',      // Deep Pink
  primaryLight: '#FF69B4', // Hot Pink
  primaryDark: '#C71585',  // Medium Violet Red
  
  // Secondary colors
  secondary: '#0D9488',    // Teal
  secondaryLight: '#14B8A6',
  
  // Accent
  gold: '#FFD700',
  goldDark: '#DAA520',
  
  // Text
  text: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  
  // Borders
  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.2)',
  
  // Status
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  
  // Glows
  glowPink: 'rgba(255, 20, 147, 0.3)',
  glowTeal: 'rgba(13, 148, 136, 0.3)',
  glowGold: 'rgba(255, 215, 0, 0.3)',
};

export const eventThemes = {
  stag: {
    accent: '#00B7FF',
    accentLight: '#38D5FF',
    accentDark: '#006DFF',
    glow: 'rgba(0, 183, 255, 0.34)',
    shopIcon: '⌚',
    partyIcon: '🦌',
    label: 'Stag Do',
  },
  hen: {
    accent: colors.primary,
    accentLight: colors.primaryLight,
    accentDark: colors.primaryDark,
    glow: colors.glowPink,
    shopIcon: '👜',
    partyIcon: '🐔',
    label: 'Hen Party',
  },
};

export const getEventTheme = (eventType) =>
  eventThemes[eventType === 'stag' ? 'stag' : 'hen'];

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 8,
  },
  glow: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  }),
};
