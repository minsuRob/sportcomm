import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Modal,
  TextInput,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { showToast } from "@/components/CustomToast";
import {
  GET_ADMIN_TEAMS_BY_CATEGORY,
  CREATE_TEAM,
  UPDATE_TEAM,
  DELETE_TEAM,
  TOGGLE_TEAM_STATUS,
} from "@/lib/graphql/admin";
import AppDialog from "@/components/ui/AppDialog";

// 팀 카테고리 타입
enum TeamCategory {
  SOCCER = "SOCCER",
  BASEBALL = "BASEBALL",
  ESPORTS = "ESPORTS",
  BASKETBALL = "BASKETBALL",
  VOLLEYBALL = "VOLLEYBALL",
}

// 팀 정보 타입
interface TeamInfo {
  id: string;
  name: string;
  color: string;
  icon: string;
  category: TeamCategory;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 스포츠 카테고리 정보 타입
interface SportCategoryInfo {
  id: string;
  name: string;
  icon: string;
  teams: TeamInfo[];
}

// GraphQL 응답 타입
interface TeamsResponse {
  adminGetTeamsByCategory: SportCategoryInfo[];
}

/**
 * 팀 관리 화면
 *
 * 관리자가 스포츠 팀을 생성, 수정, 삭제할 수 있는 화면입니다.
 */
export default function AdminTeamsScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamInfo | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<TeamInfo | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  // GraphQL 쿼리 및 뮤테이션
  const { data, loading, error, refetch } = useQuery<TeamsResponse>(
    GET_ADMIN_TEAMS_BY_CATEGORY,
    {
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );

  const [createTeam, { loading: createLoading }] = useMutation(CREATE_TEAM, {
    refetchQueries: [{ query: GET_ADMIN_TEAMS_BY_CATEGORY }],
    onCompleted: () => {
      showToast({
        type: "success",
        title: "팀 생성 완료",
        message: `${formData.name} 팀이 생성되었습니다.`,
        duration: 2000,
      });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error) => {
      console.error("팀 생성 실패:", error);
      showToast({
        type: "error",
        title: "생성 실패",
        message: error.message || "팀 생성 중 오류가 발생했습니다.",
        duration: 3000,
      });
    },
  });

  const [updateTeam, { loading: updateLoading }] = useMutation(UPDATE_TEAM, {
    refetchQueries: [{ query: GET_ADMIN_TEAMS_BY_CATEGORY }],
    onCompleted: () => {
      showToast({
        type: "success",
        title: "팀 수정 완료",
        message: `${formData.name} 팀이 수정되었습니다.`,
        duration: 2000,
      });
      setShowEditModal(false);
      setSelectedTeam(null);
      resetForm();
    },
    onError: (error) => {
      console.error("팀 수정 실패:", error);
      showToast({
        type: "error",
        title: "수정 실패",
        message: error.message || "팀 수정 중 오류가 발생했습니다.",
        duration: 3000,
      });
    },
  });

  const [deleteTeam] = useMutation(DELETE_TEAM, {
    refetchQueries: [{ query: GET_ADMIN_TEAMS_BY_CATEGORY }],
    onCompleted: () => {
      showToast({
        type: "success",
        title: "팀 삭제 완료",
        message: "팀이 삭제되었습니다.",
        duration: 2000,
      });
    },
    onError: (error) => {
      console.error("팀 삭제 실패:", error);
      showToast({
        type: "error",
        title: "삭제 실패",
        message: error.message || "팀 삭제 중 오류가 발생했습니다.",
        duration: 3000,
      });
    },
  });

  const [toggleTeamStatus] = useMutation(TOGGLE_TEAM_STATUS, {
    refetchQueries: [{ query: GET_ADMIN_TEAMS_BY_CATEGORY }],
    onCompleted: (data) => {
      const team = data.adminToggleTeamStatus;
      showToast({
        type: "success",
        title: "상태 변경 완료",
        message: `${team.name} 팀이 ${
          team.isActive ? "활성화" : "비활성화"
        }되었습니다.`,
        duration: 2000,
      });
    },
    onError: (error) => {
      console.error("팀 상태 변경 실패:", error);
      showToast({
        type: "error",
        title: "상태 변경 실패",
        message: error.message || "팀 상태 변경 중 오류가 발생했습니다.",
        duration: 3000,
      });
    },
  });

  // 폼 상태
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    color: "#000000",
    icon: "🏆",
    category: TeamCategory.SOCCER,
  });

  // 데이터 처리
  const categories = data?.adminGetTeamsByCategory || [];
  const totalTeams = categories.reduce(
    (sum, category) => sum + category.teams.length,
    0
  );

  // 에러 처리
  useEffect(() => {
    if (error) {
      console.error("팀 데이터 로드 실패:", error);
      showToast({
        type: "error",
        title: "데이터 로드 실패",
        message:
          error.message || "팀 데이터를 불러오는 중 오류가 발생했습니다.",
        duration: 3000,
      });
    }
  }, [error]);

  // 카테고리 확장/축소 토글
  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // 팀 생성 핸들러
  const handleCreateTeam = async () => {
    if (!formData.id.trim() || !formData.name.trim()) {
      showToast({
        type: "error",
        title: "입력 오류",
        message: "팀 ID와 이름을 모두 입력해주세요.",
        duration: 3000,
      });
      return;
    }

    try {
      await createTeam({
        variables: {
          input: {
            id: formData.id,
            name: formData.name,
            color: formData.color,
            icon: formData.icon,
            category: formData.category,
          },
        },
      });
    } catch (error) {
      // 에러는 onError에서 처리됨
    }
  };

  // 팀 수정 핸들러
  const handleEditTeam = async () => {
    if (!selectedTeam || !formData.name.trim()) {
      showToast({
        type: "error",
        title: "입력 오류",
        message: "팀 이름을 입력해주세요.",
        duration: 3000,
      });
      return;
    }

    try {
      await updateTeam({
        variables: {
          teamId: selectedTeam.id,
          input: {
            name: formData.name,
            color: formData.color,
            icon: formData.icon,
            category: formData.category,
          },
        },
      });
    } catch (error) {
      // 에러는 onError에서 처리됨
    }
  };

  // 팀 삭제 핸들러
  const handleDeleteTeam = (team: TeamInfo) => {
    setTeamToDelete(team);
  };

  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;
    try {
      await deleteTeam({
        variables: { teamId: teamToDelete.id },
      });
    } catch (error) {
      // 에러는 onError에서 처리됨
    } finally {
      setTeamToDelete(null);
    }
  };

  // 팀 상태 토글 핸들러
  const handleToggleTeamStatus = async (team: TeamInfo) => {
    try {
      await toggleTeamStatus({
        variables: { teamId: team.id },
      });
    } catch (error) {
      // 에러는 onError에서 처리됨
    }
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
      color: "#000000",
      icon: "🏆",
      category: TeamCategory.SOCCER,
    });
  };

  // 카테고리 이름 표시
  const getCategoryDisplayName = (category: string) => {
    const categoryMap = {
      SOCCER: "축구",
      BASEBALL: "야구",
      ESPORTS: "e스포츠",
      BASKETBALL: "농구",
      VOLLEYBALL: "배구",
    };
    return categoryMap[category as keyof typeof categoryMap] || category;
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading && !data) {
    return (
      <View style={themed($container)}>
        <View style={themed($loadingContainer)}>
          <Text style={themed($loadingText)}>팀 데이터 로딩 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={themed($container)}>
        {/* 헤더 */}
        <View style={themed($header)}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={themed($headerTitle)}>팀 관리</Text>
          <TouchableOpacity onPress={() => setShowCreateModal(true)}>
            <Ionicons name="add" color={theme.colors.tint} size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={themed($scrollContainer)}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => refetch()} />
          }
        >
          {/* 통계 정보 */}
          <View style={themed($statsSection)}>
            <View style={themed($statCard)}>
              <Text style={themed($statNumber)}>{totalTeams}</Text>
              <Text style={themed($statLabel)}>총 팀</Text>
            </View>
            <View style={themed($statCard)}>
              <Text style={themed($statNumber)}>{categories.length}</Text>
              <Text style={themed($statLabel)}>카테고리</Text>
            </View>
            <View style={themed($statCard)}>
              <Text style={themed($statNumber)}>
                {categories.reduce(
                  (sum, category) =>
                    sum + category.teams.filter((team) => team.isActive).length,
                  0
                )}
              </Text>
              <Text style={themed($statLabel)}>활성 팀</Text>
            </View>
          </View>

          {/* 카테고리별 팀 목록 */}
          <View style={themed($categoriesSection)}>
            {categories.map((category) => (
              <View key={category.id} style={themed($categoryCard)}>
                <TouchableOpacity
                  style={themed($categoryHeader)}
                  onPress={() => toggleCategory(category.id)}
                >
                  <View style={themed($categoryTitleSection)}>
                    <Text style={themed($categoryIcon)}>{category.icon}</Text>
                    <Text style={themed($categoryName)}>{category.name}</Text>
                    <View style={themed($teamCountBadge)}>
                      <Text style={themed($teamCountText)}>
                        {category.teams.length}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={
                      expandedCategories.has(category.id)
                        ? "chevron-up"
                        : "chevron-down"
                    }
                    color={theme.colors.textDim}
                    size={20}
                  />
                </TouchableOpacity>

                {expandedCategories.has(category.id) && (
                  <View style={themed($teamsContainer)}>
                    {category.teams.map((team) => (
                      <View key={team.id} style={themed($teamCard)}>
                        <View style={themed($teamHeader)}>
                          <View style={themed($teamInfo)}>
                            <View
                              style={[
                                themed($teamColorIndicator),
                                { backgroundColor: team.color },
                              ]}
                            />
                            <Text style={themed($teamIcon)}>{team.icon}</Text>
                            <View style={themed($teamDetails)}>
                              <Text style={themed($teamName)}>{team.name}</Text>
                              <Text style={themed($teamId)}>ID: {team.id}</Text>
                            </View>
                          </View>

                          <View style={themed($teamActions)}>
                            <TouchableOpacity
                              style={[
                                themed($statusButton),
                                {
                                  backgroundColor: team.isActive
                                    ? "#10B98120"
                                    : "#EF444420",
                                },
                              ]}
                              onPress={() => handleToggleTeamStatus(team)}
                            >
                              <Text
                                style={[
                                  themed($statusButtonText),
                                  {
                                    color: team.isActive
                                      ? "#10B981"
                                      : "#EF4444",
                                  },
                                ]}
                              >
                                {team.isActive ? "활성" : "비활성"}
                              </Text>
                            </TouchableOpacity>

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

                        <View style={themed($teamMeta)}>
                          <Text style={themed($teamMetaText)}>
                            생성일: {formatDate(team.createdAt)}
                          </Text>
                          <Text style={themed($teamMetaText)}>
                            카테고리: {getCategoryDisplayName(team.category)}
                          </Text>
                        </View>
                      </View>
                    ))}

                    {category.teams.length === 0 && (
                      <View style={themed($emptyTeamsContainer)}>
                        <Text style={themed($emptyTeamsText)}>
                          이 카테고리에는 팀이 없습니다.
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* 팀 생성 모달 */}
        <Modal visible={showCreateModal} transparent animationType="slide">
          <View style={themed($modalOverlay)}>
            <View style={themed($modalContent)}>
              <View style={themed($modalHeader)}>
                <Text style={themed($modalTitle)}>팀 생성</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                >
                  <Ionicons name="close" color={theme.colors.text} size={24} />
                </TouchableOpacity>
              </View>

              <ScrollView style={themed($formContainer)}>
                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>팀 ID *</Text>
                  <TextInput
                    style={themed($textInput)}
                    value={formData.id}
                    onChangeText={(text) =>
                      setFormData({ ...formData, id: text.toUpperCase() })
                    }
                    placeholder="TEAM_ID (영문 대문자, 언더스코어)"
                    placeholderTextColor={theme.colors.textDim}
                  />
                </View>

                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>팀 이름 *</Text>
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
                    placeholder="#000000"
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
                    placeholder="🏆"
                    placeholderTextColor={theme.colors.textDim}
                  />
                </View>

                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>카테고리</Text>
                  <View style={themed($categorySelector)}>
                    {Object.values(TeamCategory).map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          themed($categoryOption),
                          formData.category === category &&
                            themed($categoryOptionSelected),
                        ]}
                        onPress={() => setFormData({ ...formData, category })}
                      >
                        <Text
                          style={[
                            themed($categoryOptionText),
                            formData.category === category &&
                              themed($categoryOptionTextSelected),
                          ]}
                        >
                          {getCategoryDisplayName(category)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

              <View style={themed($modalActions)}>
                <TouchableOpacity
                  style={themed($cancelButton)}
                  onPress={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                >
                  <Text style={themed($cancelButtonText)}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    themed($confirmButton),
                    { opacity: createLoading ? 0.5 : 1 },
                  ]}
                  onPress={handleCreateTeam}
                  disabled={createLoading}
                >
                  <Text style={themed($confirmButtonText)}>
                    {createLoading ? "생성 중..." : "생성"}
                  </Text>
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

              <ScrollView style={themed($formContainer)}>
                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>팀 ID</Text>
                  <TextInput
                    style={[themed($textInput), themed($disabledInput)]}
                    value={formData.id}
                    editable={false}
                    placeholder="팀 ID (수정 불가)"
                    placeholderTextColor={theme.colors.textDim}
                  />
                </View>

                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>팀 이름 *</Text>
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
                    placeholder="#000000"
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
                    placeholder="🏆"
                    placeholderTextColor={theme.colors.textDim}
                  />
                </View>

                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>카테고리</Text>
                  <View style={themed($categorySelector)}>
                    {Object.values(TeamCategory).map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          themed($categoryOption),
                          formData.category === category &&
                            themed($categoryOptionSelected),
                        ]}
                        onPress={() => setFormData({ ...formData, category })}
                      >
                        <Text
                          style={[
                            themed($categoryOptionText),
                            formData.category === category &&
                              themed($categoryOptionTextSelected),
                          ]}
                        >
                          {getCategoryDisplayName(category)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

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
                  style={[
                    themed($confirmButton),
                    { opacity: updateLoading ? 0.5 : 1 },
                  ]}
                  onPress={handleEditTeam}
                  disabled={updateLoading}
                >
                  <Text style={themed($confirmButtonText)}>
                    {updateLoading ? "수정 중..." : "수정"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
      <AppDialog
        visible={!!teamToDelete}
        onClose={() => setTeamToDelete(null)}
        title="팀 삭제"
        description={`${
          teamToDelete?.name
        } 팀을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        onConfirm={confirmDeleteTeam}
        cancelText="취소"
      />
    </>
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

const $statsSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
  gap: spacing.sm,
});

const $statCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  backgroundColor: colors.card,
  padding: spacing.md,
  borderRadius: 12,
  alignItems: "center",
  borderWidth: 1,
  borderColor: colors.border,
});

const $statNumber: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 20,
  fontWeight: "bold",
  color: colors.text,
});

const $statLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  color: colors.textDim,
  marginTop: spacing.xs,
});

const $categoriesSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.xl,
  gap: spacing.md,
});

const $categoryCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  overflow: "hidden",
});

const $categoryHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: spacing.md,
});

const $categoryTitleSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
});

const $categoryIcon: ThemedStyle<TextStyle> = () => ({
  fontSize: 20,
});

const $categoryName: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
});

const $teamCountBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint + "20",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
});

const $teamCountText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  fontWeight: "500",
  color: colors.tint,
});

const $teamsContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderTopWidth: 1,
  borderTopColor: colors.border,
  padding: spacing.md,
  gap: spacing.sm,
});

const $teamCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  padding: spacing.md,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
});

const $teamHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.sm,
});

const $teamInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
  gap: spacing.sm,
});

const $teamColorIndicator: ThemedStyle<ViewStyle> = () => ({
  width: 16,
  height: 16,
  borderRadius: 8,
});

const $teamIcon: ThemedStyle<TextStyle> = () => ({
  fontSize: 18,
});

const $teamDetails: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $teamName: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "600",
  color: colors.text,
});

const $teamId: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});

const $teamActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
});

const $statusButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
});

const $statusButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  fontWeight: "500",
});

const $actionButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
});

const $teamMeta: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  gap: spacing.md,
});

const $teamMetaText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});

const $emptyTeamsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.lg,
  alignItems: "center",
});

const $emptyTeamsText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  fontStyle: "italic",
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
  maxHeight: "80%",
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
  maxHeight: 400,
});

const $inputGroup: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
});

const $inputLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  fontWeight: "500",
  color: colors.text,
  marginBottom: spacing.sm,
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

const $disabledInput: ThemedStyle<any> = ({ colors }) => ({
  backgroundColor: colors.border + "20",
  color: colors.textDim,
});

const $categorySelector: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
});

const $categoryOption: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.card,
});

const $categoryOptionSelected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
  borderColor: colors.tint,
});

const $categoryOptionText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.text,
});

const $categoryOptionTextSelected: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontWeight: "500",
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
