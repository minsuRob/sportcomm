const palette = {
  neutral100: "#0F172A",
  neutral200: "#1E293B",
  neutral300: "#334155",
  neutral400: "#475569",
  neutral500: "#64748B",
  neutral600: "#94A3B8",
  neutral700: "#CBD5E1",
  neutral800: "#E2E8F0",
  neutral900: "#F8FAFC",

  primary100: "#075985",
  primary200: "#0284C7",
  primary300: "#0EA5E9",
  primary400: "#38BDF8",
  primary500: "#7DD3FC",
  primary600: "#BAE6FD",

  secondary100: "#0C4A6E",
  secondary200: "#075985",
  secondary300: "#0EA5E9",
  secondary400: "#7DD3FC",
  secondary500: "#BAE6FD",

  // 다크모드에서 생동감 있는 스포츠 액센트 컬러
  accent100: "#064E3B",
  accent200: "#047857",
  accent300: "#10B981",
  accent400: "#34D399",
  accent500: "#6EE7B7",

  // 에너지 넘치는 강조색 (다크모드에서 더 선명하게)
  energy100: "#7F1D1D",
  energy200: "#991B1B",
  energy300: "#DC2626",
  energy400: "#F87171",
  energy500: "#FCA5A5",

  // e스포츠 느낌의 네온 색상 (다크모드에서 빛나게)
  neon100: "#166534",
  neon200: "#16A34A",
  neon300: "#22C55E",
  neon400: "#4ADE80",
  neon500: "#86EFAC",

  angry100: "#7F1D1D",
  angry500: "#FCA5A5",

  overlay20: "rgba(248, 250, 252, 0.1)",
  overlay50: "rgba(248, 250, 252, 0.2)",
} as const;

export const colors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)",
  text: palette.neutral800,
  textDim: palette.neutral600,
  background: palette.neutral100,
  card: palette.neutral200,
  border: palette.neutral300,
  tint: palette.primary300,
  tintInactive: palette.neutral500,
  separator: palette.neutral300,
  error: palette.angry500,
  errorBackground: palette.angry100,
  success: palette.neon300,
  warning: palette.energy300,
  energy: palette.energy400,
  accent: palette.accent300,
  neon: palette.neon400,
  backgroundAlt: palette.neutral200,
  backgroundDim: palette.neutral300,
  shadowLight: "rgba(0, 0, 0, 0.3)",
  shadowMedium: "rgba(0, 0, 0, 0.5)",
} as const;
