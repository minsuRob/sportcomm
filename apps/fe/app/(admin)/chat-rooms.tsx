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
  Switch,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { showToast } from "@/components/CustomToast";
import TeamSelector from "@/components/team/TeamSelector";
import {
  GET_ADMIN_CHAT_ROOMS,
  CREATE_CHAT_ROOM,
  UPDATE_CHAT_ROOM,
  DELETE_CHAT_ROOM,
} from "@/lib/graphql/admin";

// 채팅방 정보 타입
interface ChatRoomInfo {
  id: string;
  name: string;
  description?: string;
  type: "PRIVATE" | "GROUP" | "PUBLIC";
  isRoomActive: boolean;
  maxParticipants: number;
  currentParticipants: number;
  totalMessages: number;
  teamId?: string;
  team?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
  createdAt: string;
  updatedAt: string;
  lastMessageContent?: string;
  lastMessageAt?: string;
}

// GraphQL 응답 타입
interface ChatRoomsResponse {
  adminGetAllChatRooms: {
    chatRooms: ChatRoomInfo[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * 채팅방 관리 화면
 *
 * 관리자가 채팅방을 생성, 수정, 삭제할 수 있는 화면입니다.
 */
export default function AdminChatRoomsScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomInfo | null>(null);
  const [page, setPage] = useState(1);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

  // GraphQL 쿼리 및 뮤테이션
  const { data, loading, error, refetch } = useQuery<ChatRoomsResponse>(
    GET_ADMIN_CHAT_ROOMS,
    {
      variables: { page, limit: 20 },
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );

  const [createChatRoom, { loading: createLoading }] = useMutation(
    CREATE_CHAT_ROOM,
    {
      refetchQueries: [
        { query: GET_ADMIN_CHAT_ROOMS, variables: { page, limit: 20 } },
      ],
      onCompleted: () => {
        showToast({
          type: "success",
          title: "채팅방 생성 완료",
          message: `${formData.name} 채팅방이 생성되었습니다.`,
          duration: 2000,
        });
        setShowCreateModal(false);
        resetForm();
      },
      onError: (error) => {
        console.error("채팅방 생성 실패:", error);
        showToast({
          type: "error",
          title: "생성 실패",
          message: error.message || "채팅방 생성 중 오류가 발생했습니다.",
          duration: 3000,
        });
      },
    }
  );

  const [updateChatRoom, { loading: updateLoading }] = useMutation(
    UPDATE_CHAT_ROOM,
    {
      refetchQueries: [
        { query: GET_ADMIN_CHAT_ROOMS, variables: { page, limit: 20 } },
      ],
      onCompleted: () => {
        showToast({
          type: "success",
          title: "채팅방 수정 완료",
          message: `${formData.name} 채팅방이 수정되었습니다.`,
          duration: 2000,
        });
        setShowEditModal(false);
        setSelectedRoom(null);
        resetForm();
      },
      onError: (error) => {
        console.error("채팅방 수정 실패:", error);
        showToast({
          type: "error",
          title: "수정 실패",
          message: error.message || "채팅방 수정 중 오류가 발생했습니다.",
          duration: 3000,
        });
      },
    }
  );

  const [deleteChatRoom, { loading: deleteLoading }] = useMutation(
    DELETE_CHAT_ROOM,
    {
      refetchQueries: [
        { query: GET_ADMIN_CHAT_ROOMS, variables: { page, limit: 20 } },
      ],
      onCompleted: (data, { variables }) => {
        console.log("✅ 삭제 뮤테이션 성공:", data, variables);
        showToast({
          type: "success",
          title: "채팅방 삭제 완료",
          message: "채팅방이 성공적으로 삭제되었습니다.",
          duration: 2000,
        });
        setDeletingRoomId(null); // 삭제 중인 방 ID 초기화
      },
      onError: (error) => {
        console.error("❌ 삭제 뮤테이션 실패:", error);
        console.error(
          "❌ 에러 상세:",
          error.message,
          error.graphQLErrors,
          error.networkError
        );
        showToast({
          type: "error",
          title: "삭제 실패",
          message: error.message || "채팅방 삭제 중 오류가 발생했습니다.",
          duration: 3000,
        });
        setDeletingRoomId(null); // 삭제 중인 방 ID 초기화
      },
    }
  );

  // 폼 상태
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "PUBLIC" as "PRIVATE" | "GROUP" | "PUBLIC",
    maxParticipants: 100,
    isRoomActive: true,
    teamId: "",
  });

  // 데이터 처리
  const chatRooms = data?.adminGetAllChatRooms?.chatRooms || [];
  const totalRooms = data?.adminGetAllChatRooms?.total || 0;

  // 에러 처리
  useEffect(() => {
    if (error) {
      console.error("채팅방 데이터 로드 실패:", error);
      showToast({
        type: "error",
        title: "데이터 로드 실패",
        message:
          error.message || "채팅방 데이터를 불러오는 중 오류가 발생했습니다.",
        duration: 3000,
      });
    }
  }, [error]);

  // 채팅방 생성 핸들러
  const handleCreateRoom = async () => {
    if (!formData.name.trim()) {
      showToast({
        type: "error",
        title: "입력 오류",
        message: "채팅방 이름을 입력해주세요.",
        duration: 3000,
      });
      return;
    }

    try {
      await createChatRoom({
        variables: {
          name: formData.name,
          description: formData.description || null,
          type: formData.type,
          maxParticipants: formData.maxParticipants,
          teamId: formData.teamId || null,
        },
      });
    } catch (error) {
      // 에러는 onError에서 처리됨
    }
  };

  // 채팅방 수정 핸들러
  const handleEditRoom = async () => {
    if (!selectedRoom || !formData.name.trim()) {
      showToast({
        type: "error",
        title: "입력 오류",
        message: "채팅방 이름을 입력해주세요.",
        duration: 3000,
      });
      return;
    }

    try {
      await updateChatRoom({
        variables: {
          roomId: selectedRoom.id,
          name: formData.name,
          description: formData.description || null,
          maxParticipants: formData.maxParticipants,
          isRoomActive: formData.isRoomActive,
          teamId: formData.teamId || null,
        },
      });
    } catch (error) {
      // 에러는 onError에서 처리됨
    }
  };

  // 채팅방 삭제 핸들러
  const handleDeleteRoom = (room: ChatRoomInfo) => {
    console.log("🗑️ 삭제 버튼 클릭됨:", room.name, room.id);

    // 이미 삭제 중인 경우 중복 실행 방지
    if (deletingRoomId === room.id) {
      console.log("⚠️ 이미 삭제 중인 채팅방:", room.id);
      return;
    }

    console.log("📋 삭제 확인 다이얼로그 표시");
    Alert.alert(
      "채팅방 삭제",
      `${room.name} 채팅방을 삭제하시겠습니까?\n\n⚠️ 주의사항:\n• 모든 메시지가 함께 삭제됩니다\n• 참여자들이 채팅방에서 제외됩니다\n• 이 작업은 되돌릴 수 없습니다`,
      [
        {
          text: "취소",
          style: "cancel",
          onPress: () => {
            console.log("❌ 삭제 취소됨");
            setDeletingRoomId(null);
          },
        },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            console.log("🚀 삭제 시작:", room.id);
            setDeletingRoomId(room.id); // 삭제 중 상태 설정
            try {
              console.log("📡 GraphQL 뮤테이션 호출");
              const result = await deleteChatRoom({
                variables: { roomId: room.id },
              });
              console.log("✅ 삭제 뮤테이션 완료:", result);
            } catch (error) {
              // 에러는 onError에서 처리됨
              console.error("❌ 채팅방 삭제 중 오류:", error);
            }
          },
        },
      ]
    );
  };

  // 채팅방 수정 모달 열기
  const openEditModal = (room: ChatRoomInfo) => {
    setSelectedRoom(room);
    setFormData({
      name: room.name,
      description: room.description || "",
      type: room.type,
      maxParticipants: room.maxParticipants,
      isRoomActive: room.isRoomActive,
      teamId: room.teamId || "",
    });
    setShowEditModal(true);
  };

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "PUBLIC",
      maxParticipants: 100,
      isRoomActive: true,
      teamId: "",
    });
  };

  // 채팅방 유형 표시
  const getRoomTypeDisplay = (type: string) => {
    const typeMap = {
      PRIVATE: { label: "개인", color: "#8B5CF6" },
      GROUP: { label: "그룹", color: "#10B981" },
      PUBLIC: { label: "공개", color: "#3B82F6" },
    };
    return (
      typeMap[type as keyof typeof typeMap] || {
        label: "알 수 없음",
        color: "#6B7280",
      }
    );
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && !data) {
    return (
      <View style={themed($container)}>
        <View style={themed($loadingContainer)}>
          <Text style={themed($loadingText)}>채팅방 데이터 로딩 중...</Text>
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
        <Text style={themed($headerTitle)}>채팅방 관리</Text>
        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          disabled={!!deletingRoomId}
          style={{ opacity: deletingRoomId ? 0.5 : 1 }}
        >
          <Ionicons
            name="add"
            color={deletingRoomId ? theme.colors.textDim : theme.colors.tint}
            size={24}
          />
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
            <Text style={themed($statNumber)}>{totalRooms}</Text>
            <Text style={themed($statLabel)}>총 채팅방</Text>
          </View>
          <View style={themed($statCard)}>
            <Text style={themed($statNumber)}>
              {chatRooms.filter((room) => room.isRoomActive).length}
            </Text>
            <Text style={themed($statLabel)}>활성 채팅방</Text>
          </View>
          <View style={themed($statCard)}>
            <Text style={themed($statNumber)}>
              {chatRooms.reduce(
                (sum, room) => sum + room.currentParticipants,
                0
              )}
            </Text>
            <Text style={themed($statLabel)}>총 참여자</Text>
          </View>
        </View>

        {/* 채팅방 목록 */}
        <View style={themed($roomsSection)}>
          {chatRooms.map((room) => {
            const typeInfo = getRoomTypeDisplay(room.type);

            return (
              <View key={room.id} style={themed($roomCard)}>
                <View style={themed($roomHeader)}>
                  <View style={themed($roomTitleSection)}>
                    <Text style={themed($roomName)}>{room.name}</Text>
                    <View
                      style={[
                        themed($roomTypeBadge),
                        { backgroundColor: typeInfo.color + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          themed($roomTypeText),
                          { color: typeInfo.color },
                        ]}
                      >
                        {typeInfo.label}
                      </Text>
                    </View>
                    {!room.isRoomActive && (
                      <View style={themed($inactiveBadge)}>
                        <Text style={themed($inactiveBadgeText)}>비활성</Text>
                      </View>
                    )}
                    {room.team && (
                      <View
                        style={[
                          themed($teamBadge),
                          { backgroundColor: room.team.color + "20" },
                        ]}
                      >
                        <Text
                          style={[
                            themed($teamBadgeText),
                            { color: room.team.color },
                          ]}
                        >
                          {room.team.name}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={themed($roomActions)}>
                    <TouchableOpacity
                      style={[
                        themed($actionButton),
                        { opacity: deletingRoomId === room.id ? 0.5 : 1 },
                      ]}
                      onPress={() => openEditModal(room)}
                      disabled={deletingRoomId === room.id}
                    >
                      <Ionicons
                        name="create-outline"
                        color={
                          deletingRoomId === room.id
                            ? theme.colors.textDim
                            : theme.colors.tint
                        }
                        size={18}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        themed($actionButton),
                        {
                          opacity: deletingRoomId === room.id ? 0.5 : 1,
                          backgroundColor: "rgba(239, 68, 68, 0.1)", // 디버깅용 배경색
                          borderRadius: 4,
                        },
                      ]}
                      onPress={() => {
                        console.log("🔴 삭제 버튼 터치됨 - 방:", room.name);
                        // 간단한 테스트: Alert만 표시
                        Alert.alert(
                          "삭제 테스트",
                          `${room.name} 삭제 버튼이 작동합니다!`,
                          [
                            { text: "취소", style: "cancel" },
                            {
                              text: "실제 삭제",
                              style: "destructive",
                              onPress: () => handleDeleteRoom(room),
                            },
                          ]
                        );
                      }}
                      disabled={deletingRoomId === room.id}
                      activeOpacity={0.7}
                    >
                      {deletingRoomId === room.id ? (
                        <View style={themed($loadingSpinner)}>
                          <Text style={themed($loadingText)}>삭제중...</Text>
                        </View>
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          color="#EF4444"
                          size={18}
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {room.description && (
                  <Text style={themed($roomDescription)}>
                    {room.description}
                  </Text>
                )}

                <View style={themed($roomStats)}>
                  <View style={themed($statItem)}>
                    <Ionicons
                      name="people-outline"
                      color={theme.colors.textDim}
                      size={16}
                    />
                    <Text style={themed($statText)}>
                      {room.currentParticipants}/{room.maxParticipants}명
                    </Text>
                  </View>
                  <View style={themed($statItem)}>
                    <Ionicons
                      name="chatbubble-outline"
                      color={theme.colors.textDim}
                      size={16}
                    />
                    <Text style={themed($statText)}>
                      {room.totalMessages.toLocaleString()}개 메시지
                    </Text>
                  </View>
                  <View style={themed($statItem)}>
                    <Ionicons
                      name="time-outline"
                      color={theme.colors.textDim}
                      size={16}
                    />
                    <Text style={themed($statText)}>
                      {room.lastMessageAt
                        ? formatDate(room.lastMessageAt)
                        : "메시지 없음"}
                    </Text>
                  </View>
                </View>

                {/* 삭제 중인 경우 오버레이 표시 */}
                {deletingRoomId === room.id && (
                  <View style={themed($deletingOverlay)}>
                    <Text style={themed($deletingText)}>삭제 중...</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* 채팅방 생성 모달 */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={themed($modalOverlay)}>
          <View style={themed($modalContent)}>
            <View style={themed($modalHeader)}>
              <Text style={themed($modalTitle)}>채팅방 생성</Text>
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
                <Text style={themed($inputLabel)}>채팅방 이름 *</Text>
                <TextInput
                  style={themed($textInput)}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="채팅방 이름을 입력하세요"
                  placeholderTextColor={theme.colors.textDim}
                />
              </View>

              <View style={themed($inputGroup)}>
                <Text style={themed($inputLabel)}>설명</Text>
                <TextInput
                  style={[themed($textInput), themed($textArea)]}
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  placeholder="채팅방 설명을 입력하세요"
                  placeholderTextColor={theme.colors.textDim}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={themed($inputGroup)}>
                <Text style={themed($inputLabel)}>최대 참여자 수</Text>
                <TextInput
                  style={themed($textInput)}
                  value={formData.maxParticipants.toString()}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      maxParticipants: parseInt(text) || 100,
                    })
                  }
                  placeholder="100"
                  placeholderTextColor={theme.colors.textDim}
                  keyboardType="numeric"
                />
              </View>

              <View style={themed($inputGroup)}>
                <Text style={themed($inputLabel)}>연결할 팀 (선택사항)</Text>
                <TeamSelector
                  selectedTeamId={formData.teamId || undefined}
                  onTeamSelect={(teamId) =>
                    setFormData({ ...formData, teamId: teamId || "" })
                  }
                  placeholder="공용 채팅방 (팀 없음)"
                  showClearButton={true}
                />
              </View>

              <View style={themed($switchGroup)}>
                <Text style={themed($inputLabel)}>채팅방 활성화</Text>
                <Switch
                  value={formData.isRoomActive}
                  onValueChange={(value) =>
                    setFormData({ ...formData, isRoomActive: value })
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.tint + "40",
                  }}
                  thumbColor={
                    formData.isRoomActive ? theme.colors.tint : "#f4f3f4"
                  }
                />
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
                onPress={handleCreateRoom}
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

      {/* 채팅방 수정 모달 */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={themed($modalOverlay)}>
          <View style={themed($modalContent)}>
            <View style={themed($modalHeader)}>
              <Text style={themed($modalTitle)}>채팅방 수정</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedRoom(null);
                  resetForm();
                }}
              >
                <Ionicons name="close" color={theme.colors.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={themed($formContainer)}>
              <View style={themed($inputGroup)}>
                <Text style={themed($inputLabel)}>채팅방 이름 *</Text>
                <TextInput
                  style={themed($textInput)}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="채팅방 이름을 입력하세요"
                  placeholderTextColor={theme.colors.textDim}
                />
              </View>

              <View style={themed($inputGroup)}>
                <Text style={themed($inputLabel)}>설명</Text>
                <TextInput
                  style={[themed($textInput), themed($textArea)]}
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  placeholder="채팅방 설명을 입력하세요"
                  placeholderTextColor={theme.colors.textDim}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={themed($inputGroup)}>
                <Text style={themed($inputLabel)}>최대 참여자 수</Text>
                <TextInput
                  style={themed($textInput)}
                  value={formData.maxParticipants.toString()}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      maxParticipants: parseInt(text) || 100,
                    })
                  }
                  placeholder="100"
                  placeholderTextColor={theme.colors.textDim}
                  keyboardType="numeric"
                />
              </View>

              <View style={themed($inputGroup)}>
                <Text style={themed($inputLabel)}>연결할 팀 (선택사항)</Text>
                <TeamSelector
                  selectedTeamId={formData.teamId || undefined}
                  onTeamSelect={(teamId) =>
                    setFormData({ ...formData, teamId: teamId || "" })
                  }
                  placeholder="공용 채팅방 (팀 없음)"
                  showClearButton={true}
                />
              </View>

              <View style={themed($switchGroup)}>
                <Text style={themed($inputLabel)}>채팅방 활성화</Text>
                <Switch
                  value={formData.isRoomActive}
                  onValueChange={(value) =>
                    setFormData({ ...formData, isRoomActive: value })
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.tint + "40",
                  }}
                  thumbColor={
                    formData.isRoomActive ? theme.colors.tint : "#f4f3f4"
                  }
                />
              </View>
            </ScrollView>

            <View style={themed($modalActions)}>
              <TouchableOpacity
                style={themed($cancelButton)}
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedRoom(null);
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
                onPress={handleEditRoom}
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

const $roomsSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.xl,
  gap: spacing.md,
});

const $roomCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  padding: spacing.md,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
});

const $roomHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: spacing.sm,
});

const $roomTitleSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  flexWrap: "wrap",
  gap: spacing.sm,
});

const $roomName: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
});

const $roomTypeBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
});

const $roomTypeText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  fontWeight: "500",
});

const $inactiveBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
  backgroundColor: "#EF444420",
});

const $inactiveBadgeText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  fontWeight: "500",
  color: "#EF4444",
});

const $teamBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
});

const $teamBadgeText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  fontWeight: "500",
});

const $roomActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
});

const $actionButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md, // 더 큰 터치 영역
  minWidth: 44, // 최소 터치 영역 보장
  minHeight: 44,
  justifyContent: "center",
  alignItems: "center",
  borderRadius: 8,
});

const $roomDescription: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.textDim,
  marginBottom: spacing.sm,
});

const $roomStats: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.lg,
});

const $statItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
});

const $statText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
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
  maxHeight: 300,
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

const $textArea: ThemedStyle<any> = () => ({
  height: 80,
  textAlignVertical: "top",
});

const $switchGroup: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.md,
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

const $loadingSpinner: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.xs,
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 10,
  color: "#EF4444",
  fontWeight: "500",
});

const $deletingOverlay: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: colors.background + "E6", // 90% 투명도
  borderRadius: 12,
  justifyContent: "center",
  alignItems: "center",
});

const $deletingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: "#EF4444",
  fontWeight: "600",
});
