import React, {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { StyleProp, useColorScheme } from "react-native";
import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavDefaultTheme,
  Theme as NavTheme,
} from "@react-navigation/native";

import * as storage from "@/lib/storage";
import { setImperativeTheming } from "./context.utils";
import { darkTheme, lightTheme } from "./theme";
import { getTeamColors } from "./teams/teamColor";
import type {
  AllowedStylesT,
  AppColorT,
  ImmutableThemeContextModeT,
  Theme,
  ThemeContextModeT,
  ThemedFnT,
  ThemedStyle,
} from "./types";

/**
 * ThemeProvider 개선된 구현
 *
 * 변경/목적 요약:
 * - 팀 컬러 오버라이드(`teamColorTeamId`)가 설정되면 `getTeamColors` 의 `mainColor`/`subColor`
 *   값을 `theme.colors.tint` 및 `theme.colors.accent` 로 반영합니다.
 * - (신규) teamMain / teamSub / isTeamColorOverridden 동적 컬러 필드를 colors 객체에 추가하여
 *   tint/accent 와 UI 레이어 분리 → 점진적 마이그레이션 용이
 * - 단일 useMemo에서 테마를 계산하여 예측 가능성과 성능을 개선합니다.
 * - setTeamColorTeamId (영구 저장 포함)을 컨텍스트에 노출합니다.
 *
 * 현재 Colors 타입이 문자열 기반으로 확장되어 동적 hex 적용이 가능하므로 any 캐스트 없이 안전하게 병합합니다.
 */

export type ThemeContextType = {
  navigationTheme: NavTheme;
  setThemeContextOverride: (newTheme: ThemeContextModeT) => void;
  theme: Theme;
  themeContext: ImmutableThemeContextModeT;
  themed: ThemedFnT;
  toggleTheme: () => void;
  appColor: AppColorT;
  setAppColor: (color: AppColorT) => void;
  // 팀 색상 오버라이드 관련 (기존: teamColorTeamId / 신규: teamColorKey + 통합 setter)
  teamColorTeamId: string | null;
  teamColorKey: string | null;
  setTeamColorTeamId: (teamId: string | null) => void;
  setTeamColorOverride: (
    teamId: string | null,
    teamKey?: string | null,
  ) => void;
};

export const ThemeContext = createContext<ThemeContextType | null>(null);

export interface ThemeProviderProps {
  initialContext?: ThemeContextModeT;
}

export const ThemeProvider: FC<PropsWithChildren<ThemeProviderProps>> = ({
  children,
  initialContext,
}) => {
  // 시스템 테마
  const systemColorScheme = useColorScheme();

  // 저장된 테마/앱 컬러/팀 오버라이드 로드
  const [themeScheme, setThemeSchemeState] = useState<ThemeContextModeT>();
  const [appColor, setAppColorState] = useState<AppColorT>("blue");
  const [teamColorTeamId, setTeamColorTeamIdState] = useState<string | null>(
    null,
  );
  // 팀 컬러 매칭용 key (slug 또는 영어/한글 팀명 일부)
  const [teamColorKey, setTeamColorKeyState] = useState<string | null>(null);

  useEffect(() => {
    // 초기 설정을 비동기로 불러옴
    async function loadTheme() {
      try {
        const storedTheme = await storage.loadString("ignite.themeScheme");
        if (storedTheme) setThemeSchemeState(storedTheme as ThemeContextModeT);

        const storedColor = await storage.loadString("app.appColor");
        if (storedColor) setAppColorState(storedColor as AppColorT);

        const storedTeam = await storage.loadString("app.teamColorTeamId");
        if (storedTeam) setTeamColorTeamIdState(storedTeam);

        const storedTeamKey = await storage.loadString("app.teamColorKey");
        if (storedTeamKey) setTeamColorKeyState(storedTeamKey);
      } catch (e) {
        if (__DEV__) console.warn("ThemeProvider: loadTheme 실패", e);
      }
    }
    loadTheme();
  }, []);

  // themeContext 결정: initialContext > stored scheme > system
  const themeContext: ImmutableThemeContextModeT = useMemo(() => {
    const t =
      initialContext ||
      themeScheme ||
      (!!systemColorScheme ? systemColorScheme : "light");
    return t === "dark" ? "dark" : "light";
  }, [initialContext, themeScheme, systemColorScheme]);

  // 내비게이션 테마 (react-navigation)
  const navigationTheme: NavTheme = useMemo(
    () => (themeContext === "dark" ? NavDarkTheme : NavDefaultTheme),
    [themeContext],
  );

  /**
   * 단일 useMemo에서 computedTheme 생성
   * - baseTheme (light/dark)
   * - appColor 기반 기본 tint
   * - 팀 오버라이드(mainColor/subColor)
   * - palette 주요 색상(primary/red/orange 500 계열) 동기화
   * - (신규) teamMain/teamSub/isTeamColorOverridden 추가
   */
  const computedTheme: Theme = useMemo(() => {
    const baseTheme = themeContext === "dark" ? darkTheme : lightTheme;

    // appColor 기반 기본 tint 결정
    let computedTint: string =
      appColor === "blue"
        ? (baseTheme.colors.palette.primary500 as string)
        : appColor === "red"
          ? (baseTheme.colors.palette.red500 as string)
          : (baseTheme.colors.palette.orange500 as string);

    // 기본 accent
    let computedAccent: string = baseTheme.colors.accent || "#10B981";

    // team main/sub 별도 보관 (추가 요구사항: teamMain, teamSub 동적 필드 제공)
    let teamMain: string | null = null;
    let teamSub: string | null = null;

    // 팀 오버라이드가 있으면 mainColor/subColor 적용
    // teamColorKey (slug/이름) 우선 사용, 없으면 legacy teamColorTeamId 사용
    const colorIdentifier = teamColorKey || teamColorTeamId;

    if (colorIdentifier) {
      try {
        const teamColors = getTeamColors(
          colorIdentifier,
          themeContext === "dark",
          colorIdentifier,
        );
        if ((teamColors as any)?.mainColor) {
          computedTint = (teamColors as any).mainColor as string;
          teamMain = (teamColors as any).mainColor as string;
        }
        if ((teamColors as any)?.subColor) {
          computedAccent = (teamColors as any).subColor as string;
          teamSub = (teamColors as any).subColor as string;
        }
      } catch (e) {
        if (__DEV__) console.warn("getTeamColors 실패:", e);
      }
    }

    // palette 일부 key 재지정
    const basePalette = baseTheme.colors.palette || {};
    const palette = {
      ...basePalette,
      primary500: computedTint,
      red500: computedTint,
      orange500: computedTint,
    };

    const merged: Theme = {
      ...baseTheme,
      appColor,
      colors: {
        ...baseTheme.colors,
        palette,
        tint: computedTint,
        accent: computedAccent,
        // 신규 동적 팀 색상 필드: UI 컴포넌트에서 teamMain/teamSub 로 분기 가능
        teamMain: teamMain ?? computedTint,
        teamSub: teamSub ?? computedAccent,
        isTeamColorOverridden: !!(teamColorKey || teamColorTeamId),
      },
    };

    return merged;
  }, [themeContext, appColor, teamColorTeamId]);

  // imperative theming (외부 스코프에서 스타일 참조 가능하도록)
  useEffect(() => {
    try {
      setImperativeTheming(computedTheme);
    } catch (e) {
      if (__DEV__) console.warn("setImperativeTheming 실패:", e);
    }
  }, [computedTheme]);

  // 테마 변경 저장 및 제공 함수들
  const setThemeContextOverride = useCallback(
    async (newTheme: ThemeContextModeT) => {
      setThemeSchemeState(newTheme);
      if (newTheme) {
        await storage.saveString("ignite.themeScheme", newTheme);
      } else {
        await storage.remove("ignite.themeScheme");
      }
    },
    [],
  );

  const setAppColor = useCallback(async (newColor: AppColorT) => {
    setAppColorState(newColor);
    await storage.saveString("app.appColor", newColor);
  }, []);

  const setTeamColorTeamId = useCallback(async (teamId: string | null) => {
    // legacy 지원: teamColorTeamId 단독 저장
    setTeamColorTeamIdState(teamId);
    if (teamId) {
      await storage.saveString("app.teamColorTeamId", teamId);
    } else {
      await storage.remove("app.teamColorTeamId");
    }
  }, []);

  /**
   * 신규 통합 세터
   * - teamId: 실제 UUID 등 원본 식별자 (선택적)
   * - teamKey: getTeamColors 매칭용 slug/이름 키 (영문 소문자 권장)
   * 사용 예) setTeamColorOverride(team.id, "hanwha")
   */
  const setTeamColorOverride = useCallback(
    async (teamId: string | null, teamKey?: string | null) => {
      setTeamColorTeamIdState(teamId);
      setTeamColorKeyState(teamKey ?? null);

      if (teamId) {
        await storage.saveString("app.teamColorTeamId", teamId);
      } else {
        await storage.remove("app.teamColorTeamId");
      }

      if (teamKey) {
        await storage.saveString("app.teamColorKey", teamKey);
      } else {
        await storage.remove("app.teamColorKey");
      }
    },
    [],
  );

  // themed 함수: 기존 사용방식 유지
  const themed = useCallback(
    <T,>(styleOrStyleFn: AllowedStylesT<T>) => {
      const flatStyles = [styleOrStyleFn].flat(3) as (
        | ThemedStyle<T>
        | StyleProp<T>
      )[];
      const stylesArray = flatStyles.map((f) =>
        typeof f === "function" ? (f as ThemedStyle<T>)(computedTheme) : f,
      );
      return Object.assign({}, ...stylesArray) as T;
    },
    [computedTheme],
  );

  const toggleTheme = useCallback(() => {
    const newTheme = themeContext === "light" ? "dark" : "light";
    setThemeContextOverride(newTheme);
  }, [themeContext, setThemeContextOverride]);

  // 컨텍스트 값 노출
  const value: ThemeContextType = {
    navigationTheme,
    theme: computedTheme,
    setThemeContextOverride,
    themeContext,
    themed,
    toggleTheme,
    appColor,
    setAppColor,
    teamColorTeamId,
    teamColorKey,
    setTeamColorTeamId,
    setTeamColorOverride,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within an ThemeProvider");
  }
  return context;
};

/*
커밋 메시지 (git): feat(theme): teamColorKey 및 setTeamColorOverride 추가 (UUID 대신 slug 기반 팀 컬러 매칭 지원)
*/
