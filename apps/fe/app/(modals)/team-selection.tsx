import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  TextStyle,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { User, getSession, updateSession } from "@/lib/auth";
import { showToast } from "@/components/CustomToast";

// 팀 정보 타입
interface TeamInfo {
  id: string;
  name: string;
  color: string;
  icon: string;
  category: "축구" | "야구" | "e스포츠";
}

// 팀 데이터
const TEAMS: TeamInfo[] = [
  // 축구팀
  {
    id: "TOTTENHAM",
    name: "토트넘",
    color: "#132257",
    icon: "⚽",
    category: "축구",
  },
  {
    id: "NEWCASTLE",
    name: "뉴캐슬",
    color: "#241F20",
    icon: "⚽",
    category: "축구",
  },
  {
    id: "ATLETICO_MADRID",
    name: "아틀레티코",
    color: "#CE2029",
    icon: "⚽",
    category: "축구",
  },
  {
    id: "MANCHESTER_CITY",
    name: "맨시티",
    color: "#6CABDD",
    icon: "⚽",
    category: "축구",
  },
  {
    id: "LIVERPOOL",
    name: "리버풀",
    color: "#C8102E",
    icon: "⚽",
    category: "축구",
  },

  // 야구팀
  {
    id: "DOOSAN_BEARS",
    name: "두산",
    color: "#131230",
    icon: "⚾",
    category: "야구",
  },
  {
    id: "HANWHA_EAGLES",
    name: "한화",
    color: "#FF6600",
    icon: "⚾",
    category: "야구",
  },
  {
    id: "LG_TWINS",
    name: "LG",
    color: "#C30452",
    icon: "⚾",
    category: "야구",
  },
  {
    id: "SAMSUNG_LIONS",
    name: "삼성",
    color: "#074CA1",
    icon: "⚾",
    category: "야구",
  },
  {
    id: "KIA_TIGERS",
    name: "KIA",
    color: "#EA0029",
    icon: "⚾",
    category: "야구",
  },

  // e스포츠팀
  { id: "T1", name: "T1", color: "#E2012D", icon: "🎮", category: "e스포츠" },
  {
    id: "GENG",
    name: "Gen.G",
    color: "#AA8B56",
    icon: "🎮",
    category: "e스포츠",
  },
  { id: "DRX", name: "DRX", color: "#2E5BFF", icon: "🎮", category: "e스포츠" },
  {
    id: "KT_ROLSTER",
    name: "KT",
    color: "#D4002A",
    icon: "🎮",
    category: "e스포츠",
  },
  {
    id: "DAMWON_KIA",
    name: "담원",
    color: "#004B9F",
    icon: "🎮",
    category: "e스포츠",
  },
];

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

  // 사용자 정보 로드
  useEffect(() => {
    const loadUser = async () => {
      const { user } = await getSession();
      if (user) {
        setCurrentUser(user);
        setSelectedTeam(user.favoriteTeam || null);
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
        favoriteTeam: selectedTeam || undefined,
      };

      await updateSession(updatedUser);
      setCurrentUser(updatedUser);

      const selectedTeamInfo = TEAMS.find((team) => team.id === selectedTeam);

      showToast({
        type: "success",
        title: "팀 선택 완료",
        message: selectedTeam
          ? `${selectedTeamInfo?.name} 팀이 선택되었습니다!`
          : "팀 선택이 해제되었습니다.",
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
   * 카테고리별 팀 그룹화
   */
  const groupedTeams = TEAMS.reduce(
    (acc, team) => {
      if (!acc[team.category]) {
        acc[team.category] = [];
      }
      acc[team.category].push(team);
      return acc;
    },
    {} as Record<string, TeamInfo[]>
  );

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

      <ScrollView style={themed($scrollContainer)}>
        {/* 설명 */}
        <View style={themed($descriptionSection)}>
          <Text style={themed($descriptionTitle)}>응원할 팀을 선택하세요</Text>
          <Text style={themed($descriptionText)}>
            선택한 팀은 게시물 작성 시 기본 팀으로 설정되며, 언제든지 변경할 수
            있습니다.
          </Text>
        </View>

        {/* 팀 선택 해제 옵션 */}
        <View style={themed($categorySection)}>
          <Text style={themed($categoryTitle)}>기본 설정</Text>
          <TouchableOpacity
            style={[
              themed($teamOption),
              {
                borderColor:
                  selectedTeam === null
                    ? theme.colors.tint
                    : theme.colors.border,
                backgroundColor:
                  selectedTeam === null
                    ? theme.colors.tint + "20"
                    : "transparent",
              },
            ]}
            onPress={() => setSelectedTeam(null)}
          >
            <Text style={themed($teamIcon)}>🏆</Text>
            <Text
              style={[
                themed($teamName),
                {
                  color:
                    selectedTeam === null
                      ? theme.colors.tint
                      : theme.colors.text,
                },
              ]}
            >
              팀 선택 안함
            </Text>
          </TouchableOpacity>
        </View>

        {/* 카테고리별 팀 목록 */}
        {Object.entries(groupedTeams).map(([category, teams]) => (
          <View key={category} style={themed($categorySection)}>
            <Text style={themed($categoryTitle)}>{category}</Text>
            <View style={themed($teamsGrid)}>
              {teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    themed($teamOption),
                    {
                      borderColor:
                        selectedTeam === team.id
                          ? team.color
                          : theme.colors.border,
                      backgroundColor:
                        selectedTeam === team.id
                          ? team.color + "20"
                          : "transparent",
                    },
                  ]}
                  onPress={() => handleTeamSelect(team.id)}
                >
                  <Text style={themed($teamIcon)}>{team.icon}</Text>
                  <Text
                    style={[
                      themed($teamName),
                      {
                        color:
                          selectedTeam === team.id
                            ? team.color
                            : theme.colors.text,
                      },
                    ]}
                  >
                    {team.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
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

const $categorySection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.lg,
});

const $categoryTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.md,
});

const $teamsGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
});

const $teamOption: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderWidth: 2,
  borderRadius: 12,
  minWidth: 100,
  marginBottom: spacing.sm,
});

const $teamIcon: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 20,
  marginRight: spacing.sm,
});

const $teamName: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
  fontWeight: "600",
});
