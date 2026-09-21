// ─── Color Palette ────────────────────────────────────────────────────────────
export const colors = {
  // Brand blues (from the UI mockup)
  brand: {
    50:  '#EFF8FF',
    100: '#DBEFFE',
    200: '#C0E2FD',
    300: '#93CFFC',
    400: '#5FB4F8',
    500: '#3B96F3',
    600: '#2277E8',
    700: '#1A5FD5',
    800: '#1C4DAC',
    900: '#1C4287',
    950: '#152852',
  },

  // Soft background blues (the app's signature background)
  sky: {
    bg:      '#E8F4FE',  // main background
    circle1: '#D1E9FD',  // outer mascot circle
    circle2: '#B8DAFC',  // inner mascot circle
  },

  // Neutral
  white:   '#FFFFFF',
  black:   '#000000',
  grey: {
    50:  '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },

  // Semantic
  success:  '#22C55E',
  warning:  '#F59E0B',
  danger:   '#EF4444',
  info:     '#3B82F6',
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
export const fontSizes = {
  xs:   12,
  sm:   14,
  md:   16,
  lg:   18,
  xl:   20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

export const fontWeights = {
  regular:   '400',
  medium:    '500',
  semibold:  '600',
  bold:      '700',
  extrabold: '800',
} as const;

export const lineHeights = {
  tight:  1.2,
  snug:   1.35,
  normal: 1.5,
  relaxed: 1.625,
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────
export const spacing = {
  0:   0,
  1:   4,
  2:   8,
  3:   12,
  4:   16,
  5:   20,
  6:   24,
  7:   28,
  8:   32,
  10:  40,
  12:  48,
  16:  64,
  20:  80,
  24:  96,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────
export const radii = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  full: 9999,
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────
export const shadows = {
  sm: {
    shadowColor: '#1A4287',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#1A4287',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1A4287',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ─── Animation ────────────────────────────────────────────────────────────────
export const motion = {
  fast:   150,
  normal: 250,
  slow:   400,
  spring: { damping: 18, stiffness: 200, mass: 0.8 },
} as const;
