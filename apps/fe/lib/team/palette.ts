/**
 * 팀 팔레트 유틸리티
 *
 * 백엔드 Team 엔티티 확장 컬러 (mainColor, subColor, darkMainColor, darkSubColor)를
 * 기반으로 프론트엔드 UI 컴포넌트에서 사용할 색상 팔레트를 계산/가공한다.
 *
 * 주요 목표:
 * 1. 하위 호환: legacy 단일 color 필드만 존재할 때도 동작
 * 2. 라이트/다크 모드 지원
 * 3. 텍스트 대비(명도 대비비) 기준 자동 텍스트 색상 선택
 * 4. 추가 파생 색상(gradient, border, hover 등) 간단 생성
 * 5. 확장 가능하고 테스트 용이한 순수 함수 구조
 *
 * 모든 함수는 부작용이 없도록 설계한다.
 */

// === 타입 정의 ===

/**
 * TeamLike: UI 레벨에서 필요한 최소 팀 컬러 필드만 정의 (GraphQL Team 일부)
 */
export interface TeamLike {
  id?: string;
  name?: string;
  // 팔레트 컬러만 사용 (legacy 단일 color 제거)
  mainColor?: string | null;
  subColor?: string | null;
  darkMainColor?: string | null;
  darkSubColor?: string | null;
}

/**
 * getTeamPalette 반환 구조
 */
export interface TeamPalette {
  // 핵심
  primary: string;
  secondary: string;
  // 파생
  accent: string;
  border: string;
  gradient: [string, string];
  // 텍스트 대비 색상
  textOnPrimary: string;
  textOnSecondary: string;
  textOnAccent: string;
  // 메타
  modeUsed: "light" | "dark";
  source: "palette" | "legacy" | "generated";
  // 진단 정보
  contrastPrimary: number;
  contrastSecondary: number;
  contrastAccent: number;
}

/**
 * 옵션
 */
export interface GetTeamPaletteOptions {
  themeMode?: "light" | "dark";
  /**
   * 대비 기준 (WCAG AA 일반 텍스트 4.5 이상 권장)
   */
  minContrast?: number;
}

// === 내부 유틸 함수 ===

/**
 * HEX 유효성 검사 (3 or 6 자리)
 */
const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * hex 문자열 정규화 (# 포함 6자리)
 */
function normalizeHex(hex?: string | null): string | null {
  if (!hex || typeof hex !== "string") return null;
  const trimmed = hex.trim();
  if (!HEX_RE.test(trimmed)) return null;
  let body = trimmed.replace("#", "");
  if (body.length === 3) {
    body = body
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return "#" + body.toUpperCase();
}

/**
 * 색상 밝기 조정 (단순 HSL 변환 없이 RGB 선형 scaling)
 * percent > 0 밝게, < 0 어둡게
 */
function adjust(hex: string, percent: number): string {
  const h = normalizeHex(hex);
  if (!h) return "#000000";
  const p = percent / 100;
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  const nr = clamp(Math.round(r + (255 - r) * p), 0, 255);
  const ng = clamp(Math.round(g + (255 - g) * p), 0, 255);
  const nb = clamp(Math.round(b + (255 - b) * p), 0, 255);
  return toHex(nr, ng, nb);
}

function darken(hex: string, percent: number): string {
  const h = normalizeHex(hex);
  if (!h) return "#000000";
  const p = percent / 100;
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  const nr = clamp(Math.round(r * (1 - p)), 0, 255);
  const ng = clamp(Math.round(g * (1 - p)), 0, 255);
  const nb = clamp(Math.round(b * (1 - p)), 0, 255);
  return toHex(nr, ng, nb);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function toHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

/**
 * WCAG 상대 휘도 계산
 */
function relativeLuminance(hex: string): number {
  const h = normalizeHex(hex) || "#000000";
  const rgb = [h.slice(1, 3), h.slice(3, 5), h.slice(5, 7)].map((c) =>
    parseInt(c, 16),
  );
  const srgb = rgb.map((v) => {
    const r = v / 255;
    return r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/**
 * 명도 대비 비율
 */
function contrastRatio(fg: string, bg: string): number {
  const L1 = relativeLuminance(fg);
  const L2 = relativeLuminance(bg);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * 텍스트 컬러 자동 선택 (흰색/검정 중 더 대비 높은 쪽)
 */
function pickTextColor(bg: string): { color: string; contrast: number } {
  const whiteContrast = contrastRatio("#FFFFFF", bg);
  const blackContrast = contrastRatio("#000000", bg);
  if (whiteContrast >= blackContrast) {
    return { color: "#FFFFFF", contrast: whiteContrast };
  }
  return { color: "#000000", contrast: blackContrast };
}

// === 핵심 로직 ===

/**
 * 팀 팔레트 계산
 */
export function getTeamPalette(
  team: TeamLike | null | undefined,
  options: GetTeamPaletteOptions = {},
): TeamPalette {
  const { themeMode = "light", minContrast = 4.5 } = options;

  // 1. 팔레트 컬러 후보 추출 (legacy 제거)
  const lightMain = normalizeHex(team?.mainColor);
  const lightSub = normalizeHex(team?.subColor);
  const darkMain = normalizeHex(team?.darkMainColor);
  const darkSub = normalizeHex(team?.darkSubColor);

  // 2. 모드별 primary/secondary 계산
  let primary: string;
  let secondary: string;
  let source: TeamPalette["source"] = "palette";

  if (themeMode === "light") {
    primary = lightMain || "#2D2F33";
    secondary = lightSub || adjust(primary, 20);
  } else {
    primary = darkMain || lightMain || "#1A1C1F";
    secondary = darkSub || lightSub || adjust(primary, 25);
  }

  // 3. 파생 색상 산출
  const accent = adjust(primary, 35);
  const border = darken(primary, themeMode === "light" ? 15 : 35);
  const gradient: [string, string] = [
    primary,
    themeMode === "light" ? darken(primary, 15) : adjust(primary, 10),
  ];

  // 4. 텍스트 컬러 대비 계산
  const tp = pickTextColor(primary);
  const ts = pickTextColor(secondary);
  const ta = pickTextColor(accent);

  // 5. 대비 미달 시 fallback (가독성 우선)
  const ensureContrast = (
    bg: string,
    picked: { color: string; contrast: number },
  ) => {
    if (picked.contrast >= minContrast) return picked;
    // 단순 보정: 대비가 낮다면 반대색 시도
    const alt = picked.color === "#FFFFFF" ? "#000000" : "#FFFFFF";
    const altContrast = contrastRatio(alt, bg);
    if (altContrast > picked.contrast) {
      return { color: alt, contrast: altContrast };
    }
    return picked; // 더 나은 대안 없음
  };

  const tpFixed = ensureContrast(primary, tp);
  const tsFixed = ensureContrast(secondary, ts);
  const taFixed = ensureContrast(accent, ta);

  return {
    primary,
    secondary,
    accent,
    border,
    gradient,
    textOnPrimary: tpFixed.color,
    textOnSecondary: tsFixed.color,
    textOnAccent: taFixed.color,
    modeUsed: themeMode,
    source,
    contrastPrimary: tpFixed.contrast,
    contrastSecondary: tsFixed.contrast,
    contrastAccent: taFixed.contrast,
  };
}

// === 추가 헬퍼 ===

/**
 * 팔레트에서 카드 UI에 바로 적용할 style snippet 생성
 */
export function buildCardStyles(palette: TeamPalette): {
  container: { backgroundColor: string; borderColor: string };
  badge: { backgroundColor: string };
  gradient: { colors: [string, string] };
  textPrimary: { color: string };
  textSecondary: { color: string };
} {
  return {
    container: {
      backgroundColor: palette.primary,
      borderColor: palette.border,
    },
    badge: {
      backgroundColor: palette.secondary,
    },
    gradient: {
      colors: palette.gradient,
    },
    textPrimary: {
      color: palette.textOnPrimary,
    },
    textSecondary: {
      color: palette.textOnSecondary,
    },
  };
}

/**
 * 안전 팔레트(팀 미존재 시)
 */
export function getFallbackPalette(
  mode: "light" | "dark" = "light",
): TeamPalette {
  return getTeamPalette(
    {
      mainColor: mode === "light" ? "#344155" : "#1E252E",
      subColor: mode === "light" ? "#4E6A89" : "#2C3947",
      darkMainColor: "#1E252E",
      darkSubColor: "#2C3947",
    },
    { themeMode: mode },
  );
}
