import type { StyleProp } from "react-native";

import { colors as colorsLight } from "./colors";
import { colors as colorsDark } from "./colorsDark";
import { spacing as spacingLight } from "./spacing";
import { spacing as spacingDark } from "./spacingDark";
import { timing } from "./timing";
import { typography } from "./typography";

// 앱의 아이덴티티 색상 타입
export type AppColorT = "blue" | "red" | "orange";

// This supports "light" and "dark" themes by default. If undefined, it'll use the system theme
export type ImmutableThemeContextModeT = "light" | "dark";
export type ThemeContextModeT = ImmutableThemeContextModeT | undefined;

// Colors 타입 리팩터
// - 팀 컬러 오버라이드(mainColor/subColor -> tint/accent) 적용 시 기존 literal string 좁은 타입 때문에
//   동적 hex 값 대입이 불가능하여 any 캐스트가 필요했음
// - 이를 해결하기 위해 colorsLight/colorsDark 객체의 구조를 포괄하는, 값이 string 으로 넓은 인터페이스 정의
// - palette 내부 key 확장 및 팀별 커스텀 색상 추가를 위해 인덱스 시그니처 허용
export interface Colors {
  palette: { [k: string]: string };
  transparent: string;
  text: string;
  textDim: string;
  background: string;
  card: string;
  border: string;
  tint: string;
  tintInactive: string;
  separator: string;
  error: string;
  errorBackground: string;
  success: string;
  warning: string;
  energy: string;
  accent: string;
  neon: string;
  backgroundAlt: string;
  backgroundDim: string;
  shadowLight: string;
  shadowMedium: string;
  // 팀별 커스터마이징이나 추가 색상 키 확장을 위한 여유 슬롯
  [extra: string]: any;
}
// The spacing type needs to take into account the different spacing values for light and dark themes.
export type Spacing = typeof spacingLight | typeof spacingDark;

// These two are consistent across themes.
export type Timing = typeof timing;
export type Typography = typeof typography;

// The overall Theme object should contain all of the data you need to style your app.
export interface Theme {
  colors: Colors;
  spacing: Spacing;
  typography: Typography;
  timing: Timing;
  isDark: boolean;
  appColor?: AppColorT;
}

/**
 * Represents a function that returns a styled component based on the provided theme.
 * @template T The type of the style.
 * @param theme The theme object.
 * @returns The styled component.
 *
 * @example
 * const $container: ThemedStyle<ViewStyle> = (theme) => ({
 *   flex: 1,
 *   backgroundColor: theme.colors.background,
 *   justifyContent: "center",
 *   alignItems: "center",
 * })
 * // Then use in a component like so:
 * const Component = () => {
 *   const { themed } = useAppTheme()
 *   return <View style={themed($container)} />
 * }
 */
export type ThemedStyle<T> = (theme: Theme) => T;
export type ThemedStyleArray<T> = (
  | ThemedStyle<T>
  | StyleProp<T>
  | (StyleProp<T> | ThemedStyle<T>)[]
)[];

/**
 */
export type AllowedStylesT<T> =
  | ThemedStyle<T>
  | StyleProp<T>
  | ThemedStyleArray<T>;
/**
 */
export type ThemedFnT = <T>(styleOrStyleFn: AllowedStylesT<T>) => T;
