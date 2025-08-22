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
  Image,
  ImageStyle,
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
  CREATE_SPORT,
  DELETE_SPORT,
} from "@/lib/graphql/admin";
import AppDialog from "@/components/ui/AppDialog";
import * as ImagePicker from "expo-image-picker";
import { uploadFilesWeb } from "@/lib/api/webUpload";
import { uploadFilesMobile } from "@/lib/api/mobileUpload";
import { ProgressCallback, UploadedMedia } from "@/lib/api/common";
import { isWeb } from "@/lib/platform";
import { generateSafeFileName } from "@/lib/utils/file-utils";
import TeamLogo from "@/components/TeamLogo";

// 팀 정보 타입
interface TeamInfo {
  id: string;
  name: string;
  /** (Deprecated) 단일 컬러 */
  color?: string;
  /** 라이트 메인 */
  mainColor: string;
  /** 라이트 서브 */
  subColor: string;
  /** 다크 메인 */
  darkMainColor: string;
  /** 다크 서브 */
  darkSubColor: string;
  icon: string;
  sport: {
    id: string;
    name: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  logoUrl?: string;
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
  const [categoryToDelete, setCategoryToDelete] =
    useState<SportCategoryInfo | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  // GraphQL 쿼리 및 뮤테이션
  const { data, loading, error, refetch } = useQuery<TeamsResponse>(
    GET_ADMIN_TEAMS_BY_CATEGORY,
    {
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    },
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

  const [createSport, { loading: createSportLoading }] = useMutation(
    CREATE_SPORT,
    {
      refetchQueries: [{ query: GET_ADMIN_TEAMS_BY_CATEGORY }],
      onCompleted: () => {
        showToast({
          type: "success",
          title: "카테고리 생성 완료",
          message: `${categoryFormData.name} 카테고리가 생성되었습니다.`,
          duration: 2000,
        });
        setShowCreateCategoryModal(false);
        resetCategoryForm();
      },
      onError: (error) => {
        console.error("카테고리 생성 실패:", error);
        showToast({
          type: "error",
          title: "생성 실패",
          message: error.message || "카테고리 생성 중 오류가 발생했습니다.",
          duration: 3000,
        });
      },
    },
  );

  const [deleteSport] = useMutation(DELETE_SPORT, {
    refetchQueries: [{ query: GET_ADMIN_TEAMS_BY_CATEGORY }],
    onCompleted: () => {
      showToast({
        type: "success",
        title: "카테고리 삭제 완료",
        message: "카테고리가 삭제되었습니다.",
        duration: 2000,
      });
    },
    onError: (error) => {
      console.error("카테고리 삭제 실패:", error);
      showToast({
        type: "error",
        title: "삭제 실패",
        message: error.message || "카테고리 삭제 중 오류가 발생했습니다.",
        duration: 3000,
      });
    },
  });

  // 폼 상태
  const [formData, setFormData] = useState({
    name: "",
    // legacy 단일 컬러 (선택)
    color: "",
    mainColor: "#00204B",
    subColor: "#ED1C24",
    darkMainColor: "#00132E",
    darkSubColor: "#8C1218",
    icon: "🏆",
    sportId: "",
  });

  // 카테고리 생성 관련 상태
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    icon: "🏆",
    description: "",
    defaultTeamName: "",
  });

  // 로고 업로드 상태
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [isLogoUploading, setIsLogoUploading] = useState<boolean>(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState<number>(0);

  // 데이터 처리
  const categories = data?.adminGetTeamsByCategory || [];
  const totalTeams = categories.reduce(
    (sum, category) => sum + category.teams.length,
    0,
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
    if (!formData.name.trim()) {
      showToast({
        type: "error",
        title: "입력 오류",
        message: "팀 이름을 입력해주세요.",
        duration: 3000,
      });
      return;
    }

    try {
      const result = await createTeam({
        variables: {
          input: {
            name: formData.name,
            // 하위호환 color 필드(옵션)
            color: formData.color || formData.mainColor,
            mainColor: formData.mainColor,
            subColor: formData.subColor,
            darkMainColor: formData.darkMainColor,
            darkSubColor: formData.darkSubColor,
            icon: formData.icon,
            sportId: formData.sportId,
          },
        },
      });

      // 로고 URL은 createTeam 뮤테이션에 포함되지 않으므로,
      // 생성 후 별도 업데이트가 필요하다면 다른 방식으로 처리해야 합니다.
      // 현재 로직에서는 생성 시 로고를 함께 처리하지 않습니다.
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
            color: formData.color || formData.mainColor,
            mainColor: formData.mainColor,
            subColor: formData.subColor,
            darkMainColor: formData.darkMainColor,
            darkSubColor: formData.darkSubColor,
            icon: formData.icon,
            sportId: formData.sportId,
            logoUrl: logoUrl || undefined,
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
      name: team.name,
      color: team.color ?? "",
      mainColor: team.mainColor || team.color || "#000000",
      subColor: team.subColor || team.color || "#000000",
      darkMainColor:
        team.darkMainColor || team.mainColor || team.color || "#000000",
      darkSubColor:
        team.darkSubColor || team.subColor || team.color || "#000000",
      icon: team.icon,
      sportId: team.sport.id,
    });
    setLogoUrl(team.logoUrl || "");
    setShowEditModal(true);
  };

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      name: "",
      color: "",
      mainColor: "#00204B",
      subColor: "#ED1C24",
      darkMainColor: "#00132E",
      darkSubColor: "#8C1218",
      icon: "🏆",
      sportId: "",
    });
    setLogoUrl("");
  };

  // 카테고리 폼 초기화
  const resetCategoryForm = () => {
    setCategoryFormData({
      name: "",
      icon: "🏆",
      description: "",
      defaultTeamName: "",
    });
  };

  // 팀 로고 이미지 선택 및 업로드
  const handleSelectLogoImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
        allowsMultipleSelection: false,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];

      // 파일 타입/크기 검증
      if (!asset.mimeType?.startsWith("image/")) {
        showToast({
          type: "error",
          title: "파일 형식 오류",
          message: "이미지 파일만 업로드 가능합니다.",
          duration: 3000,
        });
        return;
      }
      const maxSize = 5 * 1024 * 1024;
      if (asset.fileSize && asset.fileSize > maxSize) {
        showToast({
          type: "error",
          title: "파일 크기 초과",
          message: "로고 이미지는 5MB 이하만 가능합니다.",
          duration: 3000,
        });
        return;
      }

      // 업로드 준비
      setIsLogoUploading(true);
      setLogoUploadProgress(0);

      const progress: ProgressCallback = (p) =>
        setLogoUploadProgress(p.percentage);

      let uploaded: UploadedMedia[] = [];

      if (isWeb()) {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const safeName = generateSafeFileName(
          asset.fileName || "team_logo.jpg",
          "team_logo",
          selectedTeam?.id || formData.name || "team",
        );
        const file = new File([blob], safeName, {
          type: asset.mimeType || "image/jpeg",
        });
        uploaded = await uploadFilesWeb([file], progress);
      } else {
        const safeName = generateSafeFileName(
          asset.fileName || "team_logo.jpg",
          "team_logo",
          selectedTeam?.id || formData.name || "team",
        );
        uploaded = await uploadFilesMobile(
          [
            {
              uri: asset.uri,
              name: safeName,
              type: asset.mimeType || "image/jpeg",
            },
          ],
          progress,
        );
      }

      if (!uploaded.length) {
        throw new Error("업로드 응답이 비어있습니다.");
      }

      const media = uploaded[0];
      if (media.status === "FAILED" || !media.url) {
        throw new Error(media.failureReason || "업로드에 실패했습니다.");
      }

      // 미리보기 및 상태 반영
      setLogoUrl(media.url);

      // 편집 모달인 경우 즉시 백엔드 반영 (기존 updateTeam 뮤테이션 사용)
      if (selectedTeam?.id) {
        await updateTeam({
          variables: {
            teamId: selectedTeam.id,
            input: {
              name: formData.name,
              color: formData.color,
              icon: formData.icon,
              sportId: formData.sportId,
              logoUrl: media.url,
            },
          },
        });
      }

      showToast({
        type: "success",
        title: "완료",
        message: "로고 이미지가 업로드되었습니다.",
        duration: 2000,
      });
    } catch (error: any) {
      console.error("팀 로고 업로드 실패:", error);
      showToast({
        type: "error",
        title: "업로드 실패",
        message: error?.message || "로고 업로드 중 오류가 발생했습니다.",
        duration: 3000,
      });
    } finally {
      setIsLogoUploading(false);
      setLogoUploadProgress(0);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
  };

  // 카테고리 생성 핸들러
  const handleCreateCategory = async () => {
    if (!categoryFormData.name.trim()) {
      showToast({
        type: "error",
        title: "입력 오류",
        message: "카테고리 이름을 입력해주세요.",
        duration: 3000,
      });
      return;
    }

    try {
      await createSport({
        variables: {
          input: {
            name: categoryFormData.name,
            icon: categoryFormData.icon,
            description: categoryFormData.description || undefined,
            defaultTeamName: categoryFormData.defaultTeamName || undefined,
          },
        },
      });
    } catch (error) {
      // 에러는 onError에서 처리됨
    }
  };

  // 카테고리 삭제 핸들러
  const handleDeleteCategory = (category: SportCategoryInfo) => {
    setCategoryToDelete(category);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteSport({
        variables: { id: categoryToDelete.id },
      });
    } catch (error) {
      // 에러는 onError에서 처리됨
    } finally {
      setCategoryToDelete(null);
    }
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
          <View style={themed($headerActions)}>
            <TouchableOpacity
              onPress={() => setShowCreateCategoryModal(true)}
              style={themed($headerButton)}
            >
              <Ionicons
                name="folder-outline"
                color={theme.colors.tint}
                size={20}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCreateModal(true)}>
              <Ionicons name="add" color={theme.colors.tint} size={24} />
            </TouchableOpacity>
          </View>
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
                  0,
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
                    <TouchableOpacity
                      style={themed($actionButton)}
                      onPress={() => handleDeleteCategory(category)}
                    >
                      <Ionicons
                        name="trash-outline"
                        color="#EF4444"
                        size={18}
                      />
                    </TouchableOpacity>
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
                            <TeamLogo
                              logoUrl={team.logoUrl}
                              fallbackIcon={team.icon}
                              teamName={team.name}
                              size={24}
                            />
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
                            카테고리: {team.sport.name}
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

                {/* 팔레트 컬러 입력 (생성) */}
                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>라이트 메인 색상 *</Text>
                  <TextInput
                    style={themed($textInput)}
                    value={formData.mainColor}
                    onChangeText={(text) =>
                      setFormData({ ...formData, mainColor: text })
                    }
                    placeholder="#00204B"
                    placeholderTextColor={theme.colors.textDim}
                  />
                </View>
                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>라이트 서브 색상 *</Text>
                  <TextInput
                    style={themed($textInput)}
                    value={formData.subColor}
                    onChangeText={(text) =>
                      setFormData({ ...formData, subColor: text })
                    }
                    placeholder="#ED1C24"
                    placeholderTextColor={theme.colors.textDim}
                  />
                </View>
                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>다크 메인 색상 *</Text>
                  <TextInput
                    style={themed($textInput)}
                    value={formData.darkMainColor}
                    onChangeText={(text) =>
                      setFormData({ ...formData, darkMainColor: text })
                    }
                    placeholder="#00132E"
                    placeholderTextColor={theme.colors.textDim}
                  />
                </View>
                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>다크 서브 색상 *</Text>
                  <TextInput
                    style={themed($textInput)}
                    value={formData.darkSubColor}
                    onChangeText={(text) =>
                      setFormData({ ...formData, darkSubColor: text })
                    }
                    placeholder="#8C1218"
                    placeholderTextColor={theme.colors.textDim}
                  />
                </View>
                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>
                    (선택) Legacy 단일 색상
                  </Text>
                  <TextInput
                    style={themed($textInput)}
                    value={formData.color}
                    onChangeText={(text) =>
                      setFormData({ ...formData, color: text })
                    }
                    placeholder="#FF6600"
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

                {/* 팀 로고 업로드 */}
                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>팀 로고</Text>
                  <View style={themed($logoRow)}>
                    {logoUrl ? (
                      <Image
                        source={{ uri: logoUrl }}
                        style={themed($logoPreview)}
                      />
                    ) : (
                      <View style={themed($logoPlaceholder)}>
                        <Text style={themed($logoPlaceholderText)}>
                          미리보기 없음
                        </Text>
                      </View>
                    )}
                    <View style={themed($logoButtons)}>
                      <TouchableOpacity
                        style={themed($smallButton)}
                        onPress={handleSelectLogoImage}
                        disabled={isLogoUploading}
                      >
                        <Text style={themed($smallButtonText)}>
                          {isLogoUploading
                            ? `업로드 ${logoUploadProgress}%`
                            : "로고 선택"}
                        </Text>
                      </TouchableOpacity>
                      {logoUrl ? (
                        <TouchableOpacity
                          style={[themed($smallButton), themed($dangerButton)]}
                          onPress={handleRemoveLogo}
                          disabled={isLogoUploading}
                        >
                          <Text style={themed($dangerButtonText)}>제거</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>카테고리</Text>
                  <View style={themed($categorySelector)}>
                    {categories.map((sport) => (
                      <TouchableOpacity
                        key={sport.id}
                        style={[
                          themed($categoryOption),
                          formData.sportId === sport.id &&
                            themed($categoryOptionSelected),
                        ]}
                        onPress={() =>
                          setFormData({ ...formData, sportId: sport.id })
                        }
                      >
                        <Text
                          style={[
                            themed($categoryOptionText),
                            formData.sportId === sport.id &&
                              themed($categoryOptionTextSelected),
                          ]}
                        >
                          {sport.name}
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
                    value={selectedTeam?.id || ""}
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

                {/* 팔레트 컬러 입력 (수정) */}
                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>라이트 메인 색상 *</Text>
                  <TextInput
                    style={themed($textInput)}
                    value={formData.mainColor}
                    onChangeText={(text) =>
                      setFormData({ ...formData, mainColor: text })
                    }
                    placeholder="#00204B"
                    placeholderTextColor={theme.colors.textDim}
                  />
                </View>
                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>라이트 서브 색상 *</Text>
                  <TextInput
                    style={themed($textInput)}
                    value={formData.subColor}
                    onChangeText={(text) =>
                      setFormData({ ...formData, subColor: text })
                    }
                    placeholder="#ED1C24"
                    placeholderTextColor={theme.colors.textDim}
                  />
                </View>
                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>다크 메인 색상 *</Text>
                  <TextInput
                    style={themed($textInput)}
                    value={formData.darkMainColor}
                    onChangeText={(text) =>
                      setFormData({ ...formData, darkMainColor: text })
                    }
                    placeholder="#00132E"
                    placeholderTextColor={theme.colors.textDim}
                  />
                </View>
                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>다크 서브 색상 *</Text>
                  <TextInput
                    style={themed($textInput)}
                    value={formData.darkSubColor}
                    onChangeText={(text) =>
                      setFormData({ ...formData, darkSubColor: text })
                    }
                    placeholder="#8C1218"
                    placeholderTextColor={theme.colors.textDim}
                  />
                </View>
                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>
                    (선택) Legacy 단일 색상
                  </Text>
                  <TextInput
                    style={themed($textInput)}
                    value={formData.color}
                    onChangeText={(text) =>
                      setFormData({ ...formData, color: text })
                    }
                    placeholder="#FF6600"
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

                {/* 팀 로고 업로드 (편집) */}
                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>팀 로고</Text>
                  <View style={themed($logoRow)}>
                    {logoUrl ? (
                      <Image
                        source={{ uri: logoUrl }}
                        style={themed($logoPreview)}
                      />
                    ) : (
                      <View style={themed($logoPlaceholder)}>
                        <Text style={themed($logoPlaceholderText)}>
                          미리보기 없음
                        </Text>
                      </View>
                    )}
                    <View style={themed($logoButtons)}>
                      <TouchableOpacity
                        style={themed($smallButton)}
                        onPress={handleSelectLogoImage}
                        disabled={isLogoUploading}
                      >
                        <Text style={themed($smallButtonText)}>
                          {isLogoUploading
                            ? `업로드 ${logoUploadProgress}%`
                            : "로고 변경"}
                        </Text>
                      </TouchableOpacity>
                      {logoUrl ? (
                        <TouchableOpacity
                          style={[themed($smallButton), themed($dangerButton)]}
                          onPress={handleRemoveLogo}
                          disabled={isLogoUploading}
                        >
                          <Text style={themed($dangerButtonText)}>제거</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>카테고리</Text>
                  <View style={themed($categorySelector)}>
                    {categories.map((sport) => (
                      <TouchableOpacity
                        key={sport.id}
                        style={[
                          themed($categoryOption),
                          formData.sportId === sport.id &&
                            themed($categoryOptionSelected),
                        ]}
                        onPress={() =>
                          setFormData({ ...formData, sportId: sport.id })
                        }
                      >
                        <Text
                          style={[
                            themed($categoryOptionText),
                            formData.sportId === sport.id &&
                              themed($categoryOptionTextSelected),
                          ]}
                        >
                          {sport.name}
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

        {/* 카테고리 생성 모달 */}
        <Modal
          visible={showCreateCategoryModal}
          transparent
          animationType="slide"
        >
          <View style={themed($modalOverlay)}>
            <View style={themed($modalContent)}>
              <View style={themed($modalHeader)}>
                <Text style={themed($modalTitle)}>카테고리 생성</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowCreateCategoryModal(false);
                    resetCategoryForm();
                  }}
                >
                  <Ionicons name="close" color={theme.colors.text} size={24} />
                </TouchableOpacity>
              </View>

              <ScrollView style={themed($formContainer)}>
                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>카테고리 이름 *</Text>
                  <TextInput
                    style={themed($textInput)}
                    value={categoryFormData.name}
                    onChangeText={(text) =>
                      setCategoryFormData({ ...categoryFormData, name: text })
                    }
                    placeholder="카테고리 이름을 입력하세요 (예: 축구, 야구)"
                    placeholderTextColor={theme.colors.textDim}
                  />
                </View>

                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>카테고리 아이콘</Text>
                  <TextInput
                    style={themed($textInput)}
                    value={categoryFormData.icon}
                    onChangeText={(text) =>
                      setCategoryFormData({ ...categoryFormData, icon: text })
                    }
                    placeholder="🏆"
                    placeholderTextColor={theme.colors.textDim}
                  />
                </View>

                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>카테고리 설명</Text>
                  <TextInput
                    style={themed($textInput)}
                    value={categoryFormData.description}
                    onChangeText={(text) =>
                      setCategoryFormData({
                        ...categoryFormData,
                        description: text,
                      })
                    }
                    placeholder="카테고리 설명 (선택사항)"
                    placeholderTextColor={theme.colors.textDim}
                    multiline
                  />
                </View>

                <View style={themed($inputGroup)}>
                  <Text style={themed($inputLabel)}>기본 팀 이름</Text>
                  <TextInput
                    style={themed($textInput)}
                    value={categoryFormData.defaultTeamName}
                    onChangeText={(text) =>
                      setCategoryFormData({
                        ...categoryFormData,
                        defaultTeamName: text,
                      })
                    }
                    placeholder="함께 생성할 기본 팀 이름 (선택사항)"
                    placeholderTextColor={theme.colors.textDim}
                  />
                </View>
              </ScrollView>

              <View style={themed($modalActions)}>
                <TouchableOpacity
                  style={themed($cancelButton)}
                  onPress={() => {
                    setShowCreateCategoryModal(false);
                    resetCategoryForm();
                  }}
                >
                  <Text style={themed($cancelButtonText)}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    themed($confirmButton),
                    { opacity: createSportLoading ? 0.5 : 1 },
                  ]}
                  onPress={handleCreateCategory}
                  disabled={createSportLoading}
                >
                  <Text style={themed($confirmButtonText)}>
                    {createSportLoading ? "생성 중..." : "생성"}
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
      <AppDialog
        visible={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        title="카테고리 삭제"
        description={`${
          categoryToDelete?.name
        } 카테고리를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        onConfirm={confirmDeleteCategory}
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
  maxHeight: 600,
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

// 로고 업로드 UI 스타일
const $logoRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.md,
});

const $logoPreview: ThemedStyle<ImageStyle> = ({ colors }) => ({
  width: 56,
  height: 56,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
});

const $logoPlaceholder: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 56,
  height: 56,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
  alignItems: "center",
  justifyContent: "center",
});

const $logoPlaceholderText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 10,
  color: colors.textDim,
});

const $logoButtons: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
});

const $smallButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.sm,
  backgroundColor: colors.tint,
  borderRadius: 6,
});

const $smallButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  color: "white",
  fontWeight: "600",
});

const $dangerButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.error,
});

const $dangerButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  color: "white",
  fontWeight: "600",
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

const $headerActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
});

const $headerButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});
