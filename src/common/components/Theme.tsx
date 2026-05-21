import { createTheme, rem } from '@mantine/core';

// ─── Color palettes ───────────────────────────────────────────────────────────
// Index convention: 0 = lightest, 9 = darkest. Primary shade at index 6 for navy, 5 for sky.
// Exact brand values from DESIGN.md:
//   brand.navy      = #0F4C81 (index 6)
//   brand.navyDark  = #0A3660 (index 7)
//   brand.sky       = #0EA5E9 (index 5)
//   brand.skyLight  = #E0F2FE (index 0)

type TenShades = [string, string, string, string, string, string, string, string, string, string];

const navy: TenShades = [
  '#E8F1FB', // 0
  '#C5D8F3', // 1
  '#9EBCE9', // 2
  '#73A0DE', // 3
  '#4D83D0', // 4
  '#2B67BC', // 5
  '#0F4C81', // 6 ← brand.navy  (primaryShade)
  '#0A3660', // 7 ← brand.navyDark
  '#072A4A', // 8
  '#041B30', // 9
];

const sky: TenShades = [
  '#E0F2FE', // 0 ← brand.skyLight
  '#BAE8FF', // 1
  '#87D6FF', // 2
  '#4EC2FC', // 3
  '#20ADF0', // 4
  '#0EA5E9', // 5 ← brand.sky
  '#0289C5', // 6
  '#026EA1', // 7
  '#01547E', // 8
  '#003D5C', // 9
];

// Semantic palettes mapped to Mantine built-in names so color="success" etc. works
const success: TenShades = [
  '#ECFDF5', '#D1FAE5', '#A7F3D0', '#6EE7B7', '#34D399',
  '#10B981', // 5 ← exact value from DESIGN.md
  '#059669', '#047857', '#065F46', '#064E3B',
];

const warning: TenShades = [
  '#FFFBEB', '#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24',
  '#F59E0B', // 5 ← exact value from DESIGN.md
  '#D97706', '#B45309', '#92400E', '#78350F',
];

const danger: TenShades = [
  '#FEF2F2', '#FEE2E2', '#FECACA', '#FCA5A5', '#F87171',
  '#EF4444', // 5 ← exact value from DESIGN.md
  '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D',
];

export const theme = createTheme({
  // ─── Colors ─────────────────────────────────────────────────────────────────
  primaryColor: 'navy',
  primaryShade: { light: 6, dark: 7 },
  colors: { navy, sky, success, warning, danger },

  // ─── Typography ──────────────────────────────────────────────────────────────
  fontFamily:          "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontFamilyMonospace: "'JetBrains Mono', 'Fira Code', monospace",

  fontSizes: {
    xs: rem(12),  // badges, chips, metadata — weight 500 set per-component
    sm: rem(14),  // secondary labels
    md: rem(15),  // body text
    lg: rem(18),  // card titles / sub-headings
    xl: rem(20),  // section headings
  },

  lineHeights: {
    xs: '1.4',
    sm: '1.5',
    md: '1.6',
    lg: '1.5',
    xl: '1.4',
  },

  headings: {
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    sizes: {
      h1: { fontSize: rem(24), fontWeight: '700', lineHeight: '1.3' },
      h2: { fontSize: rem(20), fontWeight: '700', lineHeight: '1.3' },
      h3: { fontSize: rem(18), fontWeight: '600', lineHeight: '1.4' },
      h4: { fontSize: rem(16), fontWeight: '600', lineHeight: '1.4' },
      h5: { fontSize: rem(15), fontWeight: '600', lineHeight: '1.5' },
      h6: { fontSize: rem(14), fontWeight: '600', lineHeight: '1.5' },
    },
  },

  // ─── Spacing — 4px base unit ──────────────────────────────────────────────
  spacing: {
    xs: rem(4),
    sm: rem(8),
    md: rem(16),
    lg: rem(24),
    xl: rem(32),
  },

  // ─── Border radius ────────────────────────────────────────────────────────
  radius: {
    xs: rem(4),
    sm: rem(6),
    md: rem(8),   // buttons, inputs, selects
    lg: rem(12),  // cards, panels
    xl: rem(16),  // modals
  },
  defaultRadius: 'md',

  // ─── Shadows ──────────────────────────────────────────────────────────────
  shadows: {
    xs: '0 1px 3px rgba(0,0,0,0.08)',
    sm: '0 2px 8px rgba(0,0,0,0.08)',
    md: '0 4px 16px rgba(0,0,0,0.10)',
    lg: '0 8px 32px rgba(0,0,0,0.12)',
    xl: '0 16px 48px rgba(0,0,0,0.14)',
  },

  // ─── Design token passthrough (access via theme.other in components) ───────
  other: {
    // Brand
    colorNavy:      '#0F4C81',
    colorNavyDark:  '#0A3660',
    colorSky:       '#0EA5E9',
    colorSkyLight:  '#E0F2FE',
    // Semantic
    colorSuccess:   '#10B981',
    colorWarning:   '#F59E0B',
    colorDanger:    '#EF4444',
    // Surfaces
    bgPage:         '#F8FAFC',
    bgCard:         '#FFFFFF',
    bgSubtle:       '#F1F5F9',
    borderColor:    '#E2E8F0',
    borderFocus:    '#0EA5E9',
    // Text
    textPrimary:    '#0F172A',
    textSecondary:  '#475569',
    textMuted:      '#94A3B8',
    textInverse:    '#FFFFFF',
  },

  // ─── Component defaults ───────────────────────────────────────────────────
  components: {
    Card: {
      defaultProps: {
        padding:    'lg',
        radius:     'lg',
        shadow:     'sm',
        withBorder: true,
      },
    },
    Paper: {
      defaultProps: {
        radius:     'lg',
        shadow:     'sm',
        withBorder: true,
      },
    },
    Button: {
      defaultProps: { radius: 'md' },
      styles: { root: { fontWeight: '600' } },
    },
    Badge: {
      defaultProps: { radius: 'xl', size: 'sm' },
      styles: { root: { fontWeight: '600' } },
    },
    TextInput:     { defaultProps: { radius: 'md' } },
    PasswordInput: { defaultProps: { radius: 'md' } },
    NumberInput:   { defaultProps: { radius: 'md' } },
    Select:        { defaultProps: { radius: 'md' } },
    MultiSelect:   { defaultProps: { radius: 'md' } },
    Textarea:      { defaultProps: { radius: 'md' } },
    Modal:         { defaultProps: { radius: 'xl' } },
    ActionIcon:    { defaultProps: { radius: 'md' } },
  },
});

// Convenience re-export so components can import tokens without theme context
export const tokens = theme.other!;
