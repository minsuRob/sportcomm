const palette = {
  neutral100: "#FFFFFF",
  neutral200: "#F5F7FA",
  neutral300: "#E4E8ED",
  neutral400: "#C5CCD6",
  neutral500: "#A2AAB8",
  neutral600: "#64748B",
  neutral700: "#475569",
  neutral800: "#1E293B",
  neutral900: "#0F172A",

  primary100: "#E0F2FE",
  primary200: "#BAE6FD",
  primary300: "#7DD3FC",
  primary400: "#38BDF8",
  primary500: "#0EA5E9",
  primary600: "#0284C7",

  secondary100: "#F0F9FF",
  secondary200: "#E0F2FE",
  secondary300: "#38BDF8",
  secondary400: "#0284C7",
  secondary500: "#075985",

  // 생동감 있는 스포츠 액센트 컬러
  accent100: "#ECFDF5",
  accent200: "#D1FAE5",
  accent300: "#6EE7B7",
  accent400: "#10B981",
  accent500: "#059669",

  // 에너지 넘치는 강조색
  energy100: "#FEF2F2",
  energy200: "#FEE2E2",
  energy300: "#FECACA",
  energy400: "#F87171",
  energy500: "#EF4444",

  // e스포츠 느낌의 네온 색상
  neon100: "#F0FDF4",
  neon200: "#DCFCE7",
  neon300: "#86EFAC",
  neon400: "#4ADE80",
  neon500: "#22C55E",

  angry100: "#FEE2E2",
  angry500: "#DC2626",

  overlay20: "rgba(15, 23, 42, 0.1)",
  overlay50: "rgba(15, 23, 42, 0.3)",
} as const;

export const colors = {
  /**
   * The palette is available to use, but prefer using the name.
   * This is only included for rare, one-off cases. Try to use
   * semantic names as much as possible.
   */
  palette,
  /**
   * A helper for making something see-thru.
   */
  transparent: "rgba(0, 0, 0, 0)",
  /**
   * The default text color in many components.
   */
  text: palette.neutral800,
  /**
   * Secondary text information.
   */
  textDim: palette.neutral600,
  /**
   * The default color of the screen background.
   */
  background: palette.neutral100,
  /**
   * Card and elevated components background
   */
  card: palette.neutral100,
  /**
   * The default border color.
   */
  border: palette.neutral300,
  /**
   * The main tinting color.
   */
  tint: palette.primary500,
  /**
   * The inactive tinting color.
   */
  tintInactive: palette.neutral300,
  /**
   * A subtle color used for lines.
   */
  separator: palette.neutral200,
  /**
   * Error messages.
   */
  error: palette.angry500,
  /**
   * Error Background.
   */
  errorBackground: palette.angry100,
  /**
   * Success color
   */
  success: palette.neon500,
  /**
   * Warning color
   */
  warning: palette.energy500,
  /**
   * Energy accent color (for sports activities)
   */
  energy: palette.energy400,
  /**
   * Secondary accent color
   */
  accent: palette.accent400,
  /**
   * Neon highlight for e-sports elements
   */
  neon: palette.neon400,
  /**
   * Subtle background shades
   */
  backgroundAlt: palette.neutral200,
  backgroundDim: palette.neutral300,
  /**
   * Shadow colors
   */
  shadowLight: "rgba(15, 23, 42, 0.05)",
  shadowMedium: "rgba(15, 23, 42, 0.1)",
} as const;
