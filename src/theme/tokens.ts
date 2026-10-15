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
  overlay: 'rgba(0, 0, 0, 0.45)',
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

  // Caregiver / Guardian teal palette
  caregiver: {
    50:  '#E0F7FA',
    100: '#B2EBF2',
    600: '#00ACC1',
    700: '#00838F',
    800: '#005F6B',
    900: '#006064',
  },

  // Surface & Semantic Variant tokens (backgrounds, borders, high-contrast text)
  surface: {
    // Success / Checked In
    success:            '#E6F9EE',
    successLight:       '#DCFCE7',
    successTrack:       '#D1FAE5',
    successBorder:      '#C3EEDB',
    successText:        '#15803D',
    successDark:        '#1A8A47',

    // Danger / Alerts / Error
    danger:             '#FEF2F2',
    dangerSubtle:       '#FFF0F0',
    dangerBorder:       '#FCA5A5',
    dangerBorderSubtle: '#FFCCCC',
    dangerText:         '#CC0000',

    // Warning / Due / Pending
    warning:            '#FFFBEB',
    warningSubtle:      '#FFF7E0',
    warningBorder:      '#FDE68A',
    warningText:        '#92400E',
    warningDark:        '#A87820',

    // Caregiver / App Linked
    caregiver:          '#E0F7FA',
    caregiverBorder:    '#B2EBF2',
    caregiverText:      '#00838F',
    caregiverDark:      '#006064',

    // Info / Sent / Draft
    info:               '#E8F0FE',
    infoTrack:          '#D0E5FC',
    infoLight:          '#D9ECFD',
    infoText:           '#1A56DB',
    draft:              '#F1F5F9',
    draftText:          '#64748B',
  },

  // Avatar and Card Accent Palettes
  avatar: {
    blue:   { bg: '#DBEFFE', text: '#1A5FD5' },
    orange: { bg: '#FFF0E0', text: '#C07830' },
    purple: { bg: '#F0E8FF', text: '#7B2FBE' },
    teal:   { bg: '#E0F7FA', text: '#00838F' },
    amber:  { bg: '#FFF7E0', text: '#A87820' },
    coral:  { bg: '#FBE9E7', text: '#BF360C' },
    violet: { bg: '#F0EBFF', text: '#9B6DFF' },
    green:  { bg: '#F0FDF4', text: '#22C55E' },
  },

  // Brand Accents
  accent: {
    hero:       '#1654D1',
    textMuted:  '#3F5D7E',
    navy:       '#1B3C6E',
    notify:     '#4F6BFF',
  },

  // Social
  social: {
    google: '#4285F4',
  },
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
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  caregiver: {
    shadowColor: '#005F6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
} as const;

// ─── Animation ────────────────────────────────────────────────────────────────
export const motion = {
  fast:   150,
  normal: 250,
  slow:   400,
  spring: { damping: 18, stiffness: 200, mass: 0.8 },
} as const;
