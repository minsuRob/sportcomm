import { colors as colorsLight } from "./colors";
import { colors as colorsDark } from "./colorsDark";
import { spacing as spacingLight } from "./spacing";
import { spacing as spacingDark } from "./spacingDark";
import { timing } from "./timing";
import type { Theme, Colors } from "./types";
import { typography } from "./typography";

// Here we define our themes.
export const lightTheme: Theme = {
  colors: colorsLight as Colors, // widened Colors 인터페이스 대응 (동적 팀 컬러 오버라이드용)
  spacing: spacingLight,
  typography,
  timing,
  isDark: false,
};
export const darkTheme: Theme = {
  colors: colorsDark as Colors, // widened Colors 인터페이스 대응 (동적 팀 컬러 오버라이드용)
  spacing: spacingDark,
  typography,
  timing,
  isDark: true,
};
