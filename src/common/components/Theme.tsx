import { createTheme, rem } from "@mantine/core";

/**
 * CUSTOM THEME CONFIGURATION
 * Optimized for readability and professional medical UI
 */
export const theme = createTheme({
  /* 1. Brand Colors: A deep, trust-building clinical blue */
  primaryColor: "medical-blue",
  colors: {
    "medical-blue": [
      "#e7f5ff",
      "#d0ebff",
      "#a5d8ff",
      "#74c0fc",
      "#4dabf7",
      "#339af0",
      "#228be6",
      "#1c7ed6",
      "#1971c2",
      "#1864ab",
    ],
  },

  /* 2. Typography: Optimized for 2026 High-DPI screens */
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  fontFamilyMonospace: "JetBrains Mono, Courier New, monospace",

  headings: {
    fontFamily: "Outfit, Inter, sans-serif", // Slightly more rounded for titles
    fontWeight: "800",
    sizes: {
      h1: { fontSize: rem(34), lineHeight: "1.2" },
      h2: { fontSize: rem(26), lineHeight: "1.3" },
      h3: { fontSize: rem(20), lineHeight: "1.3" },
    },
  },

  /* 3. Global Sizing & Spacing */
  defaultRadius: "md",
  fontSizes: {
    xs: rem(12),
    sm: rem(14),
    md: rem(16), // Base text size for testing
    lg: rem(18),
    xl: rem(22),
  },

  /* 4. Component Default Props (Performance: reduces repetitive code in features) */
  components: {
    Card: {
      defaultProps: { padding: "lg", radius: "md", shadow: "sm" },
    },
    Button: {
      defaultProps: { fw: 600, radius: "md" },
    },
    Badge: {
      defaultProps: { radius: "sm", fw: 700 },
    },
  },
});
