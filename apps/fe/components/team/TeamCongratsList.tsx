import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  ViewStyle,
  TextStyle,
  StyleProp,
  AccessibilityProps,
} from "react-native";
import TeamLogo from "@/components/TeamLogo";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

/* =========================================================
 * TeamRegistrationCongratsList
 * ---------------------------------------------------------
 * - 팀 등록 순번(teamRegistrationOrder)을 활용하여
 *   "OO팀의 N번째 팬이 된 걸 축하드립니다!" 문구를
 *   세로로 나열해 주는 전용 컴포넌트
 * - 선택/인터랙션 UI 제거 (순수 표시용)
 * - TeamList 의 vertical 변형을 새 디자인으로 분리
 * ========================================================= */

export interface TeamRegistrationCongratsListProps extends AccessibilityProps {
  /** 표시할 팀 배열 */
  teams: Array<{
    id: string;
    team: {
      id: string;
      name: string;
      logoUrl?: string;
      icon?: string;
    };
    /** 팀 등록 순번 (0 이 들어오면 1로 보정하여 노출) */
    teamRegistrationOrder?: number | null;
  }>;
  /** 로고 크기 (기본 48) */
  logoSize?: number;
  /** 최대 표시 개수 (옵션) */
  maxItems?: number;
  /** 항목 간 수직 간격 조정 (기본 true: 넉넉한 간격) */
  relaxedSpacing?: boolean;
  /** 애니메이션 표시 여부 (기본 true) */
  animated?: boolean;
  /** 팀 없음 시 표시할 메시지 (null 이면 렌더 생략) */
  emptyMessage?: string | null;
  /** 외부 스타일 오버라이드 (컨테이너) */
  style?: StyleProp<ViewStyle>;
  /** 축하 문구 앞에 추가로 붙일 prefix (예: "축하! " ) */
  prefixText?: string;
  /** 문구 끝 커스터마이즈 (기본: '!') */
  suffixText?: string;
}

const FADE_DURATION = 320;
const STAGGER_INTERVAL = 70;

export default function TeamCongratsList({
  teams,
  logoSize = 48,
  maxItems,
  relaxedSpacing = true,
  animated = true,
  emptyMessage = "등록된 팀 정보가 없습니다.",
  style,
  prefixText = "",
  suffixText = "!",
  accessibilityLabel,
  accessibilityHint,
}: TeamRegistrationCongratsListProps): React.ReactElement | null {
  const { themed, theme } = useAppTheme();

  const displayTeams = maxItems ? teams.slice(0, maxItems) : teams;

  // 팀이 없을 때 처리
  if (!displayTeams.length) {
    if (emptyMessage === null) return null;
    return (
      <View
        style={themed([$emptyWrapper, style])}
        accessibilityRole="text"
        accessibilityLabel={emptyMessage}
      >
        <Text style={themed($emptyText)}>{emptyMessage}</Text>
      </View>
    );
  }

  // 애니메이션 값 배열 (각 행마다) - displayTeams 길이에 맞게 동기화
  const animValues = useRef<Animated.Value[]>([]).current;

  // displayTeams 길이가 변경되면 animValues 재생성
  useEffect(() => {
    if (animValues.length !== displayTeams.length) {
      animValues.length = 0; // 배열 초기화
      displayTeams.forEach(() => {
        animValues.push(new Animated.Value(animated ? 0 : 1));
      });
    }
  }, [displayTeams.length, animated]);

  useEffect(() => {
    if (!animated) return;
    // 순차 페이드 + 살짝 위→아래 이동
    const animations = animValues.map((val, idx) =>
      Animated.timing(val, {
        toValue: 1,
        duration: FADE_DURATION,
        delay: idx * STAGGER_INTERVAL,
        useNativeDriver: true,
      }),
    );
    Animated.stagger(STAGGER_INTERVAL / 2, animations).start();
  }, [animValues, animated, displayTeams.length]);

  return (
    <View
      style={themed([$container, relaxedSpacing && $relaxedContainer, style])}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="list"
    >
      {displayTeams.map((userTeam, index) => {
        const orderRaw = userTeam.teamRegistrationOrder;
        const displayOrder =
            orderRaw === null || orderRaw === undefined
              ? null
              : orderRaw === 0
                ? 1
                : orderRaw;

        const message = `${prefixText}${userTeam.team.name}의 ${
          displayOrder ?? "?"
        }번째 팬이 된 걸 축하드립니다${suffixText}`;

        const animatedStyle: StyleProp<ViewStyle> = animated && animValues[index]
          ? {
              opacity: animValues[index],
              transform: [
                {
                  translateY: animValues[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            }
          : undefined;

        return (
          <Animated.View
            key={userTeam.id}
            style={[themed($row), animatedStyle]}
            accessibilityRole="listitem"
            accessibilityLabel={`${userTeam.team.name} 팀 축하 메시지`}
          >
            <TeamLogo
              logoUrl={userTeam.team.logoUrl}
              fallbackIcon={userTeam.team.icon}
              teamName={userTeam.team.name}
              size={logoSize}
            />
            <View style={themed($textCol)}>
              <Text style={themed($teamName)} numberOfLines={1}>
                {userTeam.team.name}
              </Text>
              <Text
                style={themed([
                  $congratsText,
                  displayOrder === null && $pendingText,
                ])}
                numberOfLines={2}
              >
                {message}
              </Text>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

/* ================================
   스타일 (ThemedStyle)
   ================================ */

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "column",
  gap: spacing.md,
});

const $relaxedContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.lg,
});

const $row: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.md,
});

const $textCol: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  flexDirection: "column",
  gap: spacing.xs / 2,
  minWidth: 0, // 긴 텍스트 줄바꿈 안전
});

const $teamName: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 13,
  fontWeight: "700",
  color: colors.tint,
});

const $congratsText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  lineHeight: 18,
  fontWeight: "600",
  color: colors.text,
});

const $pendingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontStyle: "italic",
});

const $emptyWrapper: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing.md,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.card,
  alignItems: "center",
  justifyContent: "center",
});

const $emptyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 13,
});

/* ================================
   사용 예 (참고)
   ----------------
   <TeamRegistrationCongratsList
      teams={mappedTeams}
      logoSize={56}
      maxItems={6}
      prefixText=""
      suffixText="!"
   />
   ================================ */

/**
 * 구현 메모:
 * - order가 0인 경우 1로 보정 (백엔드 0-based 저장 가정 케이스)
 * - order 미존재(null/undefined) 시 "?" 로 대체하여 사용자 혼란 최소화
 * - Animated.Value 를 항목 수만큼 생성, mount 시 순차 페이드/슬라이드
 *
 * 접근성:
 * - list / listitem 롤 지정
 *
 * 성능:
 * - 단순 정적 리스트이므로 memo 불필요. 항목 많아지면 VirtualizedList 고려.
 */
