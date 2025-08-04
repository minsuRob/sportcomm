import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  TextStyle,
  FlatList,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { User, getSession, saveSession } from "@/lib/auth";
import { showToast } from "@/components/CustomToast";

const { width: screenWidth } = Dimensions.get("window");

// 팀 정보 타입
interface TeamInfo {
  id: string;
  name: string;
  color: string;
  icon: string;
}

// 스포츠 카테고리 타입
interface SportCategory {
  id: string;
  name: string;
  icon: string;
  teams: TeamInfo[];
}

// 스포츠 카테고리 및 팀 데이터
const SPORT_CATEGORIES: SportCategory[] = [
  {
    id: "soccer",
    name: "축구",
    icon: "⚽",
    teams: [
      {
        id: "TOTTENHAM",
        name: "토트넘",
        color: "#132257",
        icon: "⚽",
      },
      {
        id: "NEWCASTLE",
        name: "뉴캐슬",
        color: "#241F20",
        icon: "⚽",
      },
      {
        id: "ATLETICO_MADRID",
        name: "아틀레티코",
        color: "#CE2029",
        icon: "⚽",
      },
      {
        id: "MANCHESTER_CITY",
        name: "맨시티",
        color: "#6CABDD",
        icon: "⚽",
      },
      {
        id: "LIVERPOOL",
        name: "리버풀",
        color: "#C8102E",
        icon: "⚽",
      },
    ],
  },
  {
    id: "baseball",
    name: "야구",
    icon: "⚾",
    teams: [
      {
        id: "DOOSAN_BEARS",
        name: "두산",
        color: "#131230",
        icon: "⚾",
      },
      {
        id: "HANWHA_EAGLES",
        name: "한화",
        color: "#FF6600",
        icon: "⚾",
      },
      {
        id: "LG_TWINS",
        name: "LG",
        color: "#C30452",
        icon: "⚾",
      },
      {
        id: "SAMSUNG_LIONS",
        name: "삼성",
        color: "#074CA1",
        icon: "⚾",
      },
      {
        id: "KIA_TIGERS",
        name: "KIA",
        color: "#EA0029",
        icon: "⚾",
      },
    ],
  },
  {
    id: "esports",
    name: "e스포츠",
    icon: "🎮",
    teams: [
      { id: "T1", name: "T1", color: "#E2012D", icon: "🎮" },
      {
        id: "GENG",
        name: "Gen.G",
        color: "#AA8B56",
        icon: "🎮",
      },
      { id: "DRX", name: "DRX", color: "#2E5BFF", icon: "🎮" },
      {
        id: "KT_ROLSTER",
        name: "KT",
        color: "#D4002A",
        icon: "🎮",
      },
      {
        id: "DAMWON_KIA",
        name: "담원",
        color: "#004B9F",
        icon: "🎮",
      },
    ],
  },
];

// 모든 팀을 하나의 배열로 합치기 (기존 로직 호환성을 위해)
const ALL_TEAMS: TeamInfo[] = SPORT_CATEGORIES.flatMap(
  (category) => category.teams
);

/**
 * 팀 선택 모달 화면
 * 사용자가 선호하는 팀을 선택할 수 있습니다.
 */
export default function TeamSelectionScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);

  // 사용자 정보 로드
  useEffect(() => {
    const loadUser = async () => {
      const { user } = await getSession();
      if (user) {
        setCurrentUser(user);
        setSelectedTeam(user.team || null);
      }
    };
    loadUser();
  }, []);

  /**
   * 팀 선택 핸들러
   */
  const handleTeamSelect = (teamId: string) => {
    setSelectedTeam(selectedTeam === teamId ? null : teamId);
  };

  /**
   * 팀 선택 저장 핸들러
   */
  const handleSave = async () => {
    if (!currentUser) return;

    setIsSubmitting(true);

    try {
      // TODO: 백엔드 API 호출로 사용자 선호 팀 업데이트
      // 현재는 로컬 세션만 업데이트
      const updatedUser = {
        ...currentUser,
        team: selectedTeam || undefined,
      };

      await saveSession(updatedUser);
      setCurrentUser(updatedUser);

      const selectedTeamInfo = ALL_TEAMS.find(
        (t) => t.id === selectedTeam
      );

      showToast({
        type: "success",
        title: "팀 선택 완료",
        message: selectedTeam
          ? `${selectedTeamInfo?.name} 팀이 선택되었습니다!`
          : "팀 선택이 저장되었습니다.",
        duration: 2000,
      });

      router.back();
    } catch (error) {
      console.error("팀 선택 저장 실패:", error);
      showToast({
        type: "error",
        title: "저장 실패",
        message: "팀 선택을 저장하는 중 오류가 발생했습니다.",
        duration: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 카테고리 탭 렌더링
   */
  const renderCategoryTab = ({
    item,
    index,
  }: {
    item: SportCategory;
    index: number;
  }) => {
    const isActive = index === activeCategoryIndex;

    return (
      <TouchableOpacity
        style={[
          themed($categoryTab),
          {
            backgroundColor: isActive ? theme.colors.tint : "transparent",
            borderColor: isActive ? theme.colors.tint : theme.colors.border,
          },
        ]}
        onPress={() => setActiveCategoryIndex(index)}
      >
        <Text style={themed($categoryTabIcon)}>{item.icon}</Text>
        <Text
          style={[
            themed($categoryTabText),
            {
              color: isActive ? "white" : theme.colors.text,
            },
          ]}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  /**
   * 팀 그리드 렌더링
   */
  const renderTeamGrid = (teams: TeamInfo[]) => {
    const rows = [];
    const teamsPerRow = 2;

    for (let i = 0; i < teams.length; i += teamsPerRow) {
      const rowTeams = teams.slice(i, i + teamsPerRow);
      rows.push(
        <View key={i} style={themed($teamRow)}>
          {rowTeams.map((team) => (
            <TouchableOpacity
              key={team.id}
              style={[
                themed($teamCard),
                {
                  borderColor:
                    selectedTeam === team.id ? team.color : theme.colors.border,
                  backgroundColor:
                    selectedTeam === team.id
                      ? team.color + "20"
                      : theme.colors.card,
                },
              ]}
              onPress={() => handleTeamSelect(team.id)}
            >
              <View style={themed($teamIconContainer)}>
                <Text style={themed($teamCardIcon)}>{team.icon}</Text>
              </View>
              <Text
                style={[
                  themed($teamCardName),
                  {
                    color:
                      selectedTeam === team.id ? team.color : theme.colors.text,
                  },
                ]}
              >
                {team.name}
              </Text>
            </TouchableOpacity>
          ))}
          {/* 빈 공간 채우기 */}
          {rowTeams.length < teamsPerRow && (
            <View style={[themed($teamCard), { opacity: 0 }]} />
          )}
        </View>
      );
    }

    return rows;
  };

  return (
    <View style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={themed($headerTitle)}>My Team 선택</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSubmitting}
          style={[themed($saveButton), { opacity: isSubmitting ? 0.5 : 1 }]}
        >
          <Text style={themed($saveButtonText)}>
            {isSubmitting ? "저장 중..." : "저장"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 설명 */}
      <View style={themed($descriptionSection)}>
        <Text style={themed($descriptionTitle)}>응원할 팀을 선택하세요</Text>
        <Text style={themed($descriptionText)}>
          선택한 팀은 게시물 작성 시 기본 팀으로 설정되며, 언제든지 변경할 수
          있습니다.
        </Text>
      </View>

      {/* 카테고리 슬라이더 */}
      <View style={themed($categorySliderContainer)}>
        <FlatList
          data={SPORT_CATEGORIES}
          renderItem={renderCategoryTab}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={themed($categorySliderContent)}
        />
      </View>

      <ScrollView style={themed($scrollContainer)}>
        {/* 선택된 카테고리의 팀 목록 */}
        <View style={themed($teamsContainer)}>
          {renderTeamGrid(SPORT_CATEGORIES[activeCategoryIndex].teams)}
        </View>
      </ScrollView>
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
});

const $saveButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.tint,
  borderRadius: 8,
});

const $saveButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 14,
  fontWeight: "600",
});

const $scrollContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $descriptionSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
});

const $descriptionTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 20,
  fontWeight: "bold",
  color: colors.text,
  marginBottom: spacing.sm,
});

const $descriptionText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  lineHeight: 20,
});

const $categorySliderContainer: ThemedStyle<ViewStyle> = ({
  colors,
  spacing,
}) => ({
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $categorySliderContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
});

const $categoryTab: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  marginRight: spacing.sm,
  borderWidth: 1,
  borderRadius: 20,
});

const $categoryTabIcon: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 16,
  marginRight: spacing.xs,
});

const $categoryTabText: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
  fontWeight: "600",
});

const $teamsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
});

const $teamRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: spacing.md,
});

const $teamCard: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  alignItems: "center",
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing.md,
  marginHorizontal: spacing.xs,
  borderWidth: 2,
  borderRadius: 16,
  minHeight: 100,
  justifyContent: "center",
});

const $teamIconContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
});

const $teamCardIcon: ThemedStyle<TextStyle> = () => ({
  fontSize: 32,
  textAlign: "center",
});

const $teamCardName: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
  fontWeight: "600",
  textAlign: "center",
});
