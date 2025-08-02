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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { showToast } from "@/components/CustomToast";

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
  createdAt: string;
  lastMessageAt?: string;
}

/**
 * 채팅방 관리 화면
 *
 * 관리자가 채팅방을 생성, 수정, 삭제할 수 있는 화면입니다.
 */
export default function AdminChatRoomsScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const [chatRooms, setChatRooms] = useState<ChatRoomInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomInfo | null>(null);

  // 폼 상태
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "PUBLIC" as "PRIVATE" | "GROUP" | "PUBLIC",
    maxParticipants: 100,
    isRoomActive: true,
  });

  // 채팅방 데이터 로드
  const loadChatRooms = async () => {
    try {
      setIsLoading(true);

      // TODO: GraphQL 쿼리로 실제 데이터 로드
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockChatRooms: ChatRoomInfo[] = [
        {
          id: "1",
          name: "일반 채팅",
          description: "자유롭게 대화할 수 있는 공간입니다.",
          type: "PUBLIC",
          isRoomActive: true,
          maxParticipants: 100,
          currentParticipants: 45,
          totalMessages: 1250,
          createdAt: "2024-01-15T10:00:00Z",
          lastMessageAt: "2024-02-08T14:30:00Z",
        },
        {
          id: "2",
          name: "축구 토론방",
          description: "축구에 대해 이야기하는 방입니다.",
          type: "PUBLIC",
          isRoomActive: true,
          maxParticipants: 50,
          currentParticipants: 23,
          totalMessages: 890,
          createdAt: "2024-01-20T15:30:00Z",
          lastMessageAt: "2024-02-08T16:45:00Z",
        },
        {
          id: "3",
          name: "야구 팬클럽",
          description: "야구 팬들의 모임입니다.",
          type: "GROUP",
          isRoomActive: false,
          maxParticipants: 30,
          currentParticipants: 12,
          totalMessages: 456,
          createdAt: "2024-02-01T09:15:00Z",
          lastMessageAt: "2024-02-07T11:20:00Z",
        },
      ];

      setChatRooms(mockChatRooms);
    } catch (error) {
      console.error("채팅방 데이터 로드 실패:", error);
      showToast({
        type: "error",
        title: "데이터 로드 실패",
        message: "채팅방 데이터를 불러오는 중 오류가 발생했습니다.",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChatRooms();
  }, []);

  // 채팅방 생성 핸들러
  const handleCreateRoom = async () => {
    try {
      if (!formData.name.trim()) {
        showToast({
          type: "error",
          title: "입력 오류",
          message: "채팅방 이름을 입력해주세요.",
          duration: 3000,
        });
        return;
      }

      // TODO: GraphQL 뮤테이션으로 채팅방 생성
      console.log("채팅방 생성:", formData);

      showToast({
        type: "success",
        title: "채팅방 생성 완료",
        message: `${formData.name} 채팅방이 생성되었습니다.`,
        duration: 2000,
      });

      setShowCreateModal(false);
      resetForm();
      loadChatRooms();
    } catch (error) {
      console.error("채팅방 생성 실패:", error);
      showToast({
        type: "error",
        title: "생성 실패",
        message: "채팅방 생성 중 오류가 발생했습니다.",
        duration: 3000,
      });
    }
  };

  // 채팅방 수정 핸들러
  const handleEditRoom = async () => {
    try {
      if (!selectedRoom || !formData.name.trim()) {
        showToast({
          type: "error",
          title: "입력 오류",
          message: "채팅방 이름을 입력해주세요.",
          duration: 3000,
        });
        return;
      }

      // TODO: GraphQL 뮤테이션으로 채팅방 수정
      console.log("채팅방 수정:", selectedRoom.id, formData);

      showToast({
        type: "success",
        title: "채팅방 수정 완료",
        message: `${formData.name} 채팅방이 수정되었습니다.`,
        duration: 2000,
      });

      setShowEditModal(false);
      setSelectedRoom(null);
      resetForm();
      loadChatRooms();
    } catch (error) {
      console.error("채팅방 수정 실패:", error);
      showToast({
        type: "error",
        title: "수정 실패",
        message: "채팅방 수정 중 오류가 발생했습니다.",
        duration: 3000,
      });
    }
  };

  // 채팅방 삭제 핸들러
  const handleDeleteRoom = (room: ChatRoomInfo) => {
    Alert.alert(
      "채팅방 삭제",
      `${room.name} 채팅방을 삭제하시겠습니까?\n모든 메시지가 함께 삭제되며, 이 작업은 되돌릴 수 없습니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              // TODO: GraphQL 뮤테이션으로 채팅방 삭제
              console.log("채팅방 삭제:", room.id);

              showToast({
                type: "success",
                title: "채팅방 삭제 완료",
                message: `${room.name} 채팅방이 삭제되었습니다.`,
                duration: 2000,
              });

              loadChatRooms();
            } catch (error) {
              console.error("채팅방 삭제 실패:", error);
              showToast({
                type: "error",
                title: "삭제 실패",
                message: "채팅방 삭제 중 오류가 발생했습니다.",
                duration: 3000,
              });
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

  if (isLoading) {
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
        <TouchableOpacity onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add" color={theme.colors.tint} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={themed($scrollContainer)}>
        {/* 통계 정보 */}
        <View style={themed($statsSection)}>
          <View style={themed($statCard)}>
            <Text style={themed($statNumber)}>{chatRooms.length}</Text>
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
                  </View>

                  <View style={themed($roomActions)}>
                    <TouchableOpacity
                      style={themed($actionButton)}
                      onPress={() => openEditModal(room)}
                    >
                      <Ionicons
                        name="create-outline"
                        color={theme.colors.tint}
                        size={18}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={themed($actionButton)}
                      onPress={() => handleDeleteRoom(room)}
                    >
                      <Ionicons
                        name="trash-outline"
                        color="#EF4444"
                        size={18}
                      />
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
                      {room.currentParticipants}/{room.maxParticipants}
                    </Text>
                  </View>
                  <View style={themed($statItem)}>
                    <Ionicons
                      name="chatbubble-outline"
                      color={theme.colors.textDim}
                      size={16}
                    />
                    <Text style={themed($statText)}>
                      {room.totalMessages.toLocaleString()}
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
                style={themed($confirmButton)}
                onPress={handleCreateRoom}
              >
                <Text style={themed($confirmButtonText)}>생성</Text>
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
                style={themed($confirmButton)}
                onPress={handleEditRoom}
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

const $roomActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
});

const $actionButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
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
