/*
 * Typed accessors for the design tokens defined in tokens.css.
 * Components import from here instead of hardcoding var() strings, so token names
 * are autocompleted and refactor-safe. Values are CSS var() references — the real
 * values live in tokens.css and stay themeable at runtime.
 */

const cssVar = (name: string) => `var(--nx-${name})`

export const color = {
  brand: {
    50: cssVar('brand-50'),
    100: cssVar('brand-100'),
    200: cssVar('brand-200'),
    300: cssVar('brand-300'),
    400: cssVar('brand-400'),
    500: cssVar('brand-500'),
    600: cssVar('brand-600'),
    700: cssVar('brand-700'),
  },
  accent: {
    cyan: cssVar('accent-cyan'),
    violet: cssVar('accent-violet'),
    pink: cssVar('accent-pink'),
  },
  fg: cssVar('fg'),
  fgMuted: cssVar('fg-muted'),
  fgSubtle: cssVar('fg-subtle'),
  bgBase: cssVar('bg-base'),
  bgRaised: cssVar('bg-raised'),
  bgSunken: cssVar('bg-sunken'),
  border: cssVar('border'),
  borderStrong: cssVar('border-strong'),
  success: cssVar('success'),
  warning: cssVar('warning'),
  danger: cssVar('danger'),
  info: cssVar('info'),
} as const

export const glass = {
  bg: cssVar('glass-bg'),
  bgStrong: cssVar('glass-bg-strong'),
  border: cssVar('glass-border'),
  highlight: cssVar('glass-highlight'),
  shadow: cssVar('glass-shadow'),
} as const

export const blur = {
  sm: cssVar('blur-sm'),
  md: cssVar('blur-md'),
  lg: cssVar('blur-lg'),
  xl: cssVar('blur-xl'),
} as const

export const space = (step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10) => cssVar(`space-${step}`)

export const radius = {
  sm: cssVar('radius-sm'),
  md: cssVar('radius-md'),
  lg: cssVar('radius-lg'),
  xl: cssVar('radius-xl'),
  full: cssVar('radius-full'),
} as const

export const shadow = {
  sm: cssVar('shadow-sm'),
  md: cssVar('shadow-md'),
  lg: cssVar('shadow-lg'),
  glow: cssVar('shadow-glow'),
  glowCyan: cssVar('shadow-glow-cyan'),
} as const

export const font = {
  sans: cssVar('font-sans'),
  display: cssVar('font-display'),
  mono: cssVar('font-mono'),
} as const

export const text = {
  xs: cssVar('text-xs'),
  sm: cssVar('text-sm'),
  base: cssVar('text-base'),
  lg: cssVar('text-lg'),
  xl: cssVar('text-xl'),
  '2xl': cssVar('text-2xl'),
  '3xl': cssVar('text-3xl'),
  hero: cssVar('text-hero'),
} as const

export const gradient = {
  brand: cssVar('gradient-brand'),
  aurora: cssVar('gradient-aurora'),
  text: cssVar('gradient-text'),
} as const

/* ---- Motion tokens (for Framer Motion transitions) ---- */
export const ease = {
  out: [0.16, 1, 0.3, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  spring: [0.34, 1.56, 0.64, 1] as const,
}

export const duration = {
  fast: 0.18,
  base: 0.32,
  slow: 0.6,
  slower: 1.1,
}

/** Shared Framer Motion spring — the house physics for magnetic/hover/lift interactions. */
export const springPhysics = { type: 'spring', stiffness: 260, damping: 26, mass: 0.9 } as const

/** Standard scroll-reveal variant used across sections for one consistent motion language. */
export const revealVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: ease.out },
  },
} as const

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
} as const
