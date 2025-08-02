import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { showToast } from "@/components/CustomToast";

// 팀 정보 타입
interface TeamInfo {
  id: string;
  name: string;
  color: string;
  icon: string;
  category: string;
  isActive: boolean;
}

// 스포츠 카테고리 타입
interface SportCategory {
  id: string;
  name: string;
  icon: string;
  teams: TeamInfo[];
}

/**
 * 팀 관리 화면
 *
 * 관리자가 스포츠 팀을 추가, 수정, 삭제할 수 있는 화면입니다.
 */
export default function AdminTeamsScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const [categories, setCategories] = useState<SportCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamInfo | null>(null);

  // 폼 상태
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    color: "",
    icon: "",
    category: "SOCCER",
  });

  // 팀 데이터 로드
  const loadTeams = async () => {
    try {
      setIsLoading(true);

      // TODO: GraphQL 쿼리로 실제 데이터 로드
      // 현재는 목업 데이터 사용
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockCategories: SportCategory[] = [
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
              category: "SOCCER",
              isActive: true,
            },
            {
              id: "NEWCASTLE",
              name: "뉴캐슬",
              color: "#241F20",
              icon: "⚽",
              category: "SOCCER",
              isActive: true,
            },
            {
              id: "ATLETICO_MADRID",
              name: "아틀레티코",
              color: "#CE2029",
              icon: "⚽",
              category: "SOCCER",
              isActive: true,
            },
            {
              id: "MANCHESTER_CITY",
              name: "맨시티",
              color: "#6CABDD",
              icon: "⚽",
              category: "SOCCER",
              isActive: true,
            },
            {
              id: "LIVERPOOL",
              name: "리버풀",
              color: "#C8102E",
              icon: "⚽",
              category: "SOCCER",
              isActive: true,
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
              category: "BASEBALL",
              isActive: true,
            },
            {
              id: "HANWHA_EAGLES",
              name: "한화",
              color: "#FF6600",
              icon: "⚾",
              category: "BASEBALL",
              isActive: true,
            },
            {
              id: "LG_TWINS",
              name: "LG",
              color: "#C30452",
              icon: "⚾",
              category: "BASEBALL",
              isActive: true,
            },
            {
              id: "SAMSUNG_LIONS",
              name: "삼성",
              color: "#074CA1",
              icon: "⚾",
              category: "BASEBALL",
              isActive: true,
            },
            {
              id: "KIA_TIGERS",
              name: "KIA",
              color: "#EA0029",
              icon: "⚾",
              category: "BASEBALL",
              isActive: true,
            },
          ],
        },
        {
          id: "esports",
          name: "e스포츠",
          icon: "🎮",
          teams: [
            {
              id: "T1",
              name: "T1",
              color: "#E2012D",
              icon: "🎮",
              category: "ESPORTS",
              isActive: true,
            },
            {
              id: "GENG",
              name: "Gen.G",
              color: "#AA8B56",
              icon: "🎮",
              category: "ESPORTS",
              isActive: true,
            },
            {
              id: "DRX",
              name: "DRX",
              color: "#2E5BFF",
              icon: "🎮",
              category: "ESPORTS",
              isActive: true,
            },
            {
              id: "KT_ROLSTER",
              name: "KT",
              color: "#D4002A",
              icon: "🎮",
              category: "ESPORTS",
              isActive: true,
            },
            {
              id: "DAMWON_KIA",
              name: "담원",
              color: "#004B9F",
              icon: "🎮",
              category: "ESPORTS",
              isActive: true,
            },
          ],
        },
      ];

      setCategories(mockCategories);
    } catch (error) {
      console.error("팀 데이터 로드 실패:", error);
      showToast({
        type: "error",
        title: "데이터 로드 실패",
        message: "팀 데이터를 불러오는 중 오류가 발생했습니다.",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  // 팀 추가 핸들러
  const handleAddTeam = async () => {
    try {
      if (!formData.id || !formData.name || !formData.color || !formData.icon) {
        showToast({
          type: "error",
          title: "입력 오류",
          message: "모든 필드를 입력해주세요.",
          duration: 3000,
        });
        return;
      }

      // TODO: GraphQL 뮤테이션으로 팀 추가
      console.log("팀 추가:", formData);

      showToast({
        type: "success",
        title: "팀 추가 완료",
        message: `${formData.name} 팀이 추가되었습니다.`,
        duration: 2000,
      });

      setShowAddModal(false);
      resetForm();
      loadTeams();
    } catch (error) {
      console.error("팀 추가 실패:", error);
      showToast({
        type: "error",
        title: "추가 실패",
        message: "팀 추가 중 오류가 발생했습니다.",
        duration: 3000,
      });
    }
  };

  // 팀 수정 핸들러
  const handleEditTeam = async () => {
    try {
      if (
        !selectedTeam ||
        !formData.name ||
        !formData.color ||
        !formData.icon
      ) {
        showToast({
          type: "error",
          title: "입력 오류",
          message: "모든 필드를 입력해주세요.",
          duration: 3000,
        });
        return;
      }

      // TODO: GraphQL 뮤테이션으로 팀 수정
      console.log("팀 수정:", selectedTeam.id, formData);

      showToast({
        type: "success",
        title: "팀 수정 완료",
        message: `${formData.name} 팀이 수정되었습니다.`,
        duration: 2000,
      });

      setShowEditModal(false);
      setSelectedTeam(null);
      resetForm();
      loadTeams();
    } catch (error) {
      console.error("팀 수정 실패:", error);
      showToast({
        type: "error",
        title: "수정 실패",
        message: "팀 수정 중 오류가 발생했습니다.",
        duration: 3000,
      });
    }
  };

  // 팀 삭제 핸들러
  const handleDeleteTeam = (team: TeamInfo) => {
    Alert.alert(
      "팀 삭제",
      `${team.name} 팀을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              // TODO: GraphQL 뮤테이션으로 팀 삭제
              console.log("팀 삭제:", team.id);

              showToast({
                type: "success",
                title: "팀 삭제 완료",
                message: `${team.name} 팀이 삭제되었습니다.`,
                duration: 2000,
              });

              loadTeams();
            } catch (error) {
              console.error("팀 삭제 실패:", error);
              showToast({
                type: "error",
                title: "삭제 실패",
                message: "팀 삭제 중 오류가 발생했습니다.",
                duration: 3000,
              });
            }
          },
        },
      ]
    );
  };

  // 팀 수정 모달 열기
  const openEditModal = (team: TeamInfo) => {
    setSelectedTeam(team);
    setFormData({
      id: team.id,
      name: team.name,
      color: team.color,
      icon: team.icon,
      category: team.category,
    });
    setShowEditModal(true);
  };

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      color: "",
      icon: "",
      category: "SOCCER",
    });
  };

  if (isLoading) {
    return (
      <View style={themed($container)}>
        <View style={themed($loadingContainer)}>
          <Text style={themed($loadingText)}>팀 데이터 로딩 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={themed($headerTitle)}>팀 관리</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" color={theme.colors.tint} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={themed($scrollContainer)}>
        {categories.map((category) => (
          <View key={category.id} style={themed($categorySection)}>
            <View style={themed($categoryHeader)}>
              <Text style={themed($categoryIcon)}>{category.icon}</Text>
              <Text style={themed($categoryTitle)}>{category.name}</Text>
              <Text style={themed($teamCount)}>
                ({category.teams.length}개)
              </Text>
            </View>

            <View style={themed($teamsGrid)}>
              {category.teams.map((team) => (
                <View key={team.id} style={themed($teamCard)}>
                  <View style={themed($teamHeader)}>
                    <View
                      style={[
                        themed($teamColorIndicator),
                        { backgroundColor: team.color },
                      ]}
                    />
                    <Text style={themed($teamIcon)}>{team.icon}</Text>
                    <Text style={themed($teamName)}>{team.name}</Text>
                  </View>

                  <View style={themed($teamActions)}>
                    <TouchableOpacity
                      style={themed($actionButton)}
                      onPress={() => openEditModal(team)}
                    >
                      <Ionicons
                        name="create-outline"
                        color={theme.colors.tint}
                        size={18}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={themed($actionButton)}
                      onPress={() => handleDeleteTeam(team)}
                    >
                      <Ionicons
                        name="trash-outline"
                        color="#EF4444"
                        size={18}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 팀 추가 모달 */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={themed($modalOverlay)}>
          <View style={themed($modalContent)}>
            <View style={themed($modalHeader)}>
              <Text style={themed($modalTitle)}>팀 추가</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <Ionicons name="close" color={theme.colors.text} size={24} />
              </TouchableOpacity>
            </View>

            <View style={themed($formContainer)}>
              <View style={themed($inputGroup)}>
                <Text style={themed($inputLabel)}>팀 ID</Text>
                <TextInput
                  style={themed($textInput)}
                  value={formData.id}
                  onChangeText={(text) =>
                    setFormData({ ...formData, id: text })
                  }
                  placeholder="예: BARCELONA"
                  placeholderTextColor={theme.colors.textDim}
                />
              </View>

              <View style={themed($inputGroup)}>
                <Text style={themed($inputLabel)}>팀 이름</Text>
                <TextInput
                  style={themed($textInput)}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="예: 바르셀로나"
                  placeholderTextColor={theme.colors.textDim}
                />
              </View>

              <View style={themed($inputGroup)}>
                <Text style={themed($inputLabel)}>팀 색상</Text>
                <TextInput
                  style={themed($textInput)}
                  value={formData.color}
                  onChangeText={(text) =>
                    setFormData({ ...formData, color: text })
                  }
                  placeholder="예: #A50044"
                  placeholderTextColor={theme.colors.textDim}
                />
              </View>

              <View style={themed($inputGroup)}>
                <Text style={themed($inputLabel)}>팀 아이콘</Text>
                <TextInput
                  style={themed($textInput)}
                  value={formData.icon}
                  onChangeText={(text) =>
                    setFormData({ ...formData, icon: text })
                  }
                  placeholder="예: ⚽"
                  placeholderTextColor={theme.colors.textDim}
                />
              </View>
            </View>

            <View style={themed($modalActions)}>
              <TouchableOpacity
                style={themed($cancelButton)}
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <Text style={themed($cancelButtonText)}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={themed($confirmButton)}
                onPress={handleAddTeam}
              >
                <Text style={themed($confirmButtonText)}>추가</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 팀 수정 모달 */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={themed($modalOverlay)}>
          <View style={themed($modalContent)}>
            <View style={themed($modalHeader)}>
              <Text style={themed($modalTitle)}>팀 수정</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedTeam(null);
                  resetForm();
                }}
              >
                <Ionicons name="close" color={theme.colors.text} size={24} />
              </TouchableOpacity>
            </View>

            <View style={themed($formContainer)}>
              <View style={themed($inputGroup)}>
                <Text style={themed($inputLabel)}>팀 이름</Text>
                <TextInput
                  style={themed($textInput)}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="팀 이름을 입력하세요"
                  placeholderTextColor={theme.colors.textDim}
                />
              </View>

              <View style={themed($inputGroup)}>
                <Text style={themed($inputLabel)}>팀 색상</Text>
                <TextInput
                  style={themed($textInput)}
                  value={formData.color}
                  onChangeText={(text) =>
                    setFormData({ ...formData, color: text })
                  }
                  placeholder="HEX 색상 코드를 입력하세요"
                  placeholderTextColor={theme.colors.textDim}
                />
              </View>

              <View style={themed($inputGroup)}>
                <Text style={themed($inputLabel)}>팀 아이콘</Text>
                <TextInput
                  style={themed($textInput)}
                  value={formData.icon}
                  onChangeText={(text) =>
                    setFormData({ ...formData, icon: text })
                  }
                  placeholder="이모지를 입력하세요"
                  placeholderTextColor={theme.colors.textDim}
                />
              </View>
            </View>

            <View style={themed($modalActions)}>
              <TouchableOpacity
                style={themed($cancelButton)}
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedTeam(null);
                  resetForm();
                }}
              >
                <Text style={themed($cancelButtonText)}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={themed($confirmButton)}
                onPress={handleEditTeam}
              >
                <Text style={themed($confirmButtonText)}>수정</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  fontSize: 20,
  fontWeight: "bold",
  color: colors.text,
});

const $scrollContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $loadingContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.textDim,
});

const $categorySection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
});

const $categoryHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing.md,
});

const $categoryIcon: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 20,
  marginRight: spacing.sm,
});

const $categoryTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 18,
  fontWeight: "600",
  color: colors.text,
  marginRight: spacing.sm,
});

const $teamCount: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
});

const $teamsGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
});

const $teamCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: colors.card,
  padding: spacing.md,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
});

const $teamHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
});

const $teamColorIndicator: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: 16,
  height: 16,
  borderRadius: 8,
  marginRight: spacing.sm,
});

const $teamIcon: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 18,
  marginRight: spacing.sm,
});

const $teamName: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "500",
  color: colors.text,
});

const $teamActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
});

const $actionButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
});

// 모달 스타일
const $modalOverlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  justifyContent: "center",
  alignItems: "center",
});

const $modalContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderRadius: 16,
  padding: spacing.lg,
  width: "90%",
  maxWidth: 400,
});

const $modalHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.lg,
});

const $modalTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
});

const $formContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.md,
});

const $inputGroup: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
});

const $inputLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "500",
  color: colors.text,
});

const $textInput: ThemedStyle<any> = ({ colors, spacing }) => ({
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  padding: spacing.md,
  fontSize: 16,
  color: colors.text,
  backgroundColor: colors.card,
});

const $modalActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "flex-end",
  gap: spacing.sm,
  marginTop: spacing.lg,
});

const $cancelButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
});

const $cancelButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.text,
});

const $confirmButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 8,
  backgroundColor: colors.tint,
});

const $confirmButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
  color: "white",
  fontWeight: "500",
});
