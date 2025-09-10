import React, { useState, useEffect } from "react";
// NOTE: 이후 중복된 핸들러(旧 handleRespondToFeedback / handleUpdateStatus / handleUpdatePriority)가 남아있다면
// 최신 GraphQL 연동 로직(위 useMutation 정의 및 새 핸들러)만 남기고 제거해야 합니다.
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import AppDialog from "@/components/ui/AppDialog";
import { showToast } from "@/components/CustomToast";
import { useQuery, useMutation } from "@apollo/client";
import {
  GET_ADMIN_FEEDBACKS,
  RESPOND_TO_FEEDBACK,
  UPDATE_FEEDBACK_STATUS,
  UPDATE_FEEDBACK_PRIORITY,
  ADMIN_AWARD_USER_POINTS,
} from "@/lib/graphql/admin";

// 피드백 정보 타입
interface FeedbackInfo {
  id: string;
  title: string;
  content: string;
  type:
    | "BUG_REPORT"
    | "FEATURE_REQUEST"
    | "IMPROVEMENT"
    | "GENERAL"
    | "COMPLIMENT"
    | "COMPLAINT";
  status: "NEW" | "REVIEWING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  submitter: {
    id: string;
    nickname: string;
    email: string;
  };
  adminResponse?: string;
  respondedAt?: string;
  contactInfo?: string;
  attachmentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 피드백 관리 화면
 *
 * 관리자가 사용자 피드백을 처리할 수 있는 화면입니다.
 */
export default function AdminFeedbacksScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();

  // 페이지네이션 (추후 확장 대비)
  const [page, setPage] = useState(1);

  // 서버 데이터 로드 (Mock 제거)
  interface FeedbacksResponse {
    adminGetAllFeedbacks: {
      feedbacks: FeedbackInfo[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }

  const { data, loading, error, refetch } = useQuery<FeedbacksResponse>(
    GET_ADMIN_FEEDBACKS,
    {
      variables: { page, limit: 50 },
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    },
  );

  const feedbacks = data?.adminGetAllFeedbacks.feedbacks ?? [];

  // UI 상태
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackInfo | null>(
    null,
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [adminResponse, setAdminResponse] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [showAwardDialog, setShowAwardDialog] = useState(false);
  const [awardTarget, setAwardTarget] = useState<{
    userId: string;
    nickname: string;
    feedbackId: string;
  } | null>(null);

  // 뮤테이션 정의
  const [respondToFeedback, { loading: respondLoading }] = useMutation(
    RESPOND_TO_FEEDBACK,
    {
      refetchQueries: [
        { query: GET_ADMIN_FEEDBACKS, variables: { page, limit: 50 } },
      ],
      onCompleted: () =>
        showToast({
          type: "success",
          title: "응답 완료",
          message: "피드백에 응답이 등록되었습니다.",
          duration: 2000,
        }),
      onError: (err) =>
        showToast({
          type: "error",
          title: "응답 실패",
          message: err.message,
          duration: 3000,
        }),
    },
  );

  const [updateFeedbackStatus, { loading: statusLoading }] = useMutation(
    UPDATE_FEEDBACK_STATUS,
    {
      refetchQueries: [
        { query: GET_ADMIN_FEEDBACKS, variables: { page, limit: 50 } },
      ],
      onCompleted: (d) =>
        showToast({
          type: "success",
          title: "상태 변경",
          message: `피드백 상태가 '${d.adminUpdateFeedbackStatus.status}'(으)로 변경되었습니다.`,
          duration: 2000,
        }),
      onError: (err) =>
        showToast({
          type: "error",
          title: "상태 변경 실패",
          message: err.message,
          duration: 3000,
        }),
    },
  );

  const [updateFeedbackPriority, { loading: priorityLoading }] = useMutation(
    UPDATE_FEEDBACK_PRIORITY,
    {
      refetchQueries: [
        { query: GET_ADMIN_FEEDBACKS, variables: { page, limit: 50 } },
      ],
      onCompleted: (d) =>
        showToast({
          type: "success",
          title: "우선순위 변경",
          message: `피드백 우선순위가 '${d.adminUpdateFeedbackPriority.priority}'(으)로 변경되었습니다.`,
          duration: 2000,
        }),
      onError: (err) =>
        showToast({
          type: "error",
          title: "우선순위 변경 실패",
          message: err.message,
          duration: 3000,
        }),
    },
  );

  // 포인트 지급 뮤테이션
  const [adminAwardUserPoints, { loading: awardLoading }] = useMutation(
    ADMIN_AWARD_USER_POINTS,
    {
      onCompleted: () =>
        showToast({
          type: "success",
          title: "포인트 지급",
          message: "사용자에게 포인트가 지급되었습니다.",
          duration: 2000,
        }),
      onError: (err) =>
        showToast({
          type: "error",
          title: "포인트 지급 실패",
          message: err.message,
          duration: 3000,
        }),
    },
  );

  // 에러 토스트
  useEffect(() => {
    if (error) {
      console.error("피드백 데이터 로드 실패:", error);
      showToast({
        type: "error",
        title: "데이터 로드 실패",
        message:
          error.message || "피드백 데이터를 불러오는 중 오류가 발생했습니다.",
        duration: 3000,
      });
    }
  }, [error]);

  // 상세 모달 열기 (단일 정의)
  const openFeedbackDetail = (feedback: FeedbackInfo) => {
    setSelectedFeedback(feedback);
    setAdminResponse(feedback.adminResponse || "");
    setShowDetailModal(true);
  };

  // 응답 처리
  const handleRespondToFeedback = (feedbackId: string, response: string) => {
    if (!response.trim()) {
      showToast({
        type: "error",
        title: "입력 오류",
        message: "응답 내용을 입력해주세요.",
        duration: 2500,
      });
      return;
    }
    respondToFeedback({
      variables: { feedbackId, response: response.trim() },
    });
    setShowDetailModal(false);
    setSelectedFeedback(null);
    setAdminResponse("");
  };

  // 상태 변경
  const handleUpdateStatus = (feedbackId: string, status: string) => {
    updateFeedbackStatus({ variables: { feedbackId, status } });
  };

  // 우선순위 변경
  const handleUpdatePriority = (feedbackId: string, priority: string) => {
    updateFeedbackPriority({ variables: { feedbackId, priority } });
  };

  // 10포인트 지급 핸들러
  // - 특정 사용자(userId)에게 지정된 양(amount)의 포인트를 지급합니다.
  // - reason은 지급 사유로, 서버 로그/분석 등에서 활용할 수 있습니다.
  const handleAwardPoints = (
    userId: string,
    amount: number,
    reason?: string,
  ) => {
    if (!userId || amount <= 0) {
      showToast({
        type: "error",
        title: "지급 실패",
        message: "올바르지 않은 포인트 지급 요청입니다.",
        duration: 2500,
      });
      return;
    }
    adminAwardUserPoints({ variables: { userId, amount, reason } });
  };

  // (중복 제거됨) - 기존에 중복 선언되었던 openFeedbackDetail 함수 제거

  // 피드백 유형 표시
  const getFeedbackTypeDisplay = (type: string) => {
    const typeMap = {
      BUG_REPORT: { label: "버그 신고", color: "#EF4444", icon: "bug-outline" },
      FEATURE_REQUEST: {
        label: "기능 요청",
        color: "#3B82F6",
        icon: "bulb-outline",
      },
      IMPROVEMENT: {
        label: "개선 제안",
        color: "#10B981",
        icon: "trending-up-outline",
      },
      GENERAL: {
        label: "일반 의견",
        color: "#6B7280",
        icon: "chatbubble-outline",
      },
      COMPLIMENT: { label: "칭찬", color: "#F59E0B", icon: "heart-outline" },
      COMPLAINT: { label: "불만", color: "#DC2626", icon: "sad-outline" },
    };
    return (
      typeMap[type as keyof typeof typeMap] || {
        label: "알 수 없음",
        color: "#6B7280",
        icon: "help-outline",
      }
    );
  };

  // 피드백 상태 표시
  const getFeedbackStatusDisplay = (status: string) => {
    const statusMap = {
      NEW: { label: "새로운 피드백", color: "#F59E0B" },
      REVIEWING: { label: "검토 중", color: "#3B82F6" },
      IN_PROGRESS: { label: "진행 중", color: "#8B5CF6" },
      COMPLETED: { label: "완료됨", color: "#10B981" },
      REJECTED: { label: "거부됨", color: "#6B7280" },
    };
    return (
      statusMap[status as keyof typeof statusMap] || {
        label: "알 수 없음",
        color: "#6B7280",
      }
    );
  };

  // 피드백 우선순위 표시
  const getFeedbackPriorityDisplay = (priority: string) => {
    const priorityMap = {
      LOW: { label: "낮음", color: "#10B981" },
      MEDIUM: { label: "보통", color: "#F59E0B" },
      HIGH: { label: "높음", color: "#EF4444" },
      URGENT: { label: "긴급", color: "#DC2626" },
    };
    return (
      priorityMap[priority as keyof typeof priorityMap] || {
        label: "알 수 없음",
        color: "#6B7280",
      }
    );
  };

  // 필터링된 피드백 목록
  const filteredFeedbacks = feedbacks.filter((feedback) => {
    const statusMatch =
      filterStatus === "ALL" || feedback.status === filterStatus;
    const typeMatch = filterType === "ALL" || feedback.type === filterType;
    return statusMatch && typeMatch;
  });

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
          <Text style={themed($loadingText)}>피드백 데이터 로딩 중...</Text>
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
        <Text style={themed($headerTitle)}>피드백 관리</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 필터 */}
      <View style={themed($filterSection)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={themed($filterButtons)}>
            <Text style={themed($filterLabel)}>상태:</Text>
            {[
              "ALL",
              "NEW",
              "REVIEWING",
              "IN_PROGRESS",
              "COMPLETED",
              "REJECTED",
            ].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  themed($filterButton),
                  {
                    backgroundColor:
                      filterStatus === status
                        ? theme.colors.tint
                        : "transparent",
                    borderColor:
                      filterStatus === status
                        ? theme.colors.tint
                        : theme.colors.border,
                  },
                ]}
                onPress={() => setFilterStatus(status)}
              >
                <Text
                  style={[
                    themed($filterButtonText),
                    {
                      color:
                        filterStatus === status ? "white" : theme.colors.text,
                    },
                  ]}
                >
                  {status === "ALL"
                    ? "전체"
                    : getFeedbackStatusDisplay(status).label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={themed($filterButtons)}>
            <Text style={themed($filterLabel)}>유형:</Text>
            {[
              "ALL",
              "BUG_REPORT",
              "FEATURE_REQUEST",
              "IMPROVEMENT",
              "GENERAL",
              "COMPLIMENT",
              "COMPLAINT",
            ].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  themed($filterButton),
                  {
                    backgroundColor:
                      filterType === type ? theme.colors.tint : "transparent",
                    borderColor:
                      filterType === type
                        ? theme.colors.tint
                        : theme.colors.border,
                  },
                ]}
                onPress={() => setFilterType(type)}
              >
                <Text
                  style={[
                    themed($filterButtonText),
                    {
                      color: filterType === type ? "white" : theme.colors.text,
                    },
                  ]}
                >
                  {type === "ALL" ? "전체" : getFeedbackTypeDisplay(type).label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* 통계 정보 */}
      <View style={themed($statsSection)}>
        <View style={themed($statCard)}>
          <Text style={themed($statNumber)}>{feedbacks.length}</Text>
          <Text style={themed($statLabel)}>총 피드백</Text>
        </View>
        <View style={themed($statCard)}>
          <Text style={themed($statNumber)}>
            {feedbacks.filter((f) => f.status === "NEW").length}
          </Text>
          <Text style={themed($statLabel)}>새로운 피드백</Text>
        </View>
        <View style={themed($statCard)}>
          <Text style={themed($statNumber)}>
            {
              feedbacks.filter(
                (f) => f.priority === "URGENT" || f.priority === "HIGH",
              ).length
            }
          </Text>
          <Text style={themed($statLabel)}>긴급/높음</Text>
        </View>
      </View>

      <ScrollView style={themed($scrollContainer)}>
        {/* 피드백 목록 */}
        <View style={themed($feedbacksSection)}>
          {filteredFeedbacks.map((feedback) => {
            const typeInfo = getFeedbackTypeDisplay(feedback.type);
            const statusInfo = getFeedbackStatusDisplay(feedback.status);
            const priorityInfo = getFeedbackPriorityDisplay(feedback.priority);

            return (
              <TouchableOpacity
                key={feedback.id}
                style={themed($feedbackCard)}
                onPress={() => openFeedbackDetail(feedback)}
              >
                <View style={themed($feedbackHeader)}>
                  <View style={themed($feedbackTitleSection)}>
                    <Ionicons
                      name={typeInfo.icon as any}
                      color={typeInfo.color}
                      size={20}
                    />
                    <Text style={themed($feedbackTitle)} numberOfLines={1}>
                      {feedback.title}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward-outline"
                    color={theme.colors.textDim}
                    size={16}
                  />
                </View>

                <Text style={themed($feedbackContent)} numberOfLines={2}>
                  {feedback.content}
                </Text>

                <View style={themed($feedbackBadges)}>
                  <View
                    style={[
                      themed($feedbackTypeBadge),
                      { backgroundColor: typeInfo.color + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        themed($feedbackTypeText),
                        { color: typeInfo.color },
                      ]}
                    >
                      {typeInfo.label}
                    </Text>
                  </View>
                  <View
                    style={[
                      themed($feedbackStatusBadge),
                      { backgroundColor: statusInfo.color + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        themed($feedbackStatusText),
                        { color: statusInfo.color },
                      ]}
                    >
                      {statusInfo.label}
                    </Text>
                  </View>
                  <View
                    style={[
                      themed($feedbackPriorityBadge),
                      { backgroundColor: priorityInfo.color + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        themed($feedbackPriorityText),
                        { color: priorityInfo.color },
                      ]}
                    >
                      {priorityInfo.label}
                    </Text>
                  </View>
                </View>

                <View style={themed($feedbackInfo)}>
                  <View style={themed($feedbackInfoItem)}>
                    <Ionicons
                      name="person-outline"
                      color={theme.colors.textDim}
                      size={14}
                    />
                    <Text style={themed($feedbackInfoText)}>
                      {feedback.submitter.nickname}
                    </Text>
                  </View>
                  <View style={themed($feedbackInfoItem)}>
                    <Ionicons
                      name="time-outline"
                      color={theme.colors.textDim}
                      size={14}
                    />
                    <Text style={themed($feedbackInfoText)}>
                      {formatDate(feedback.createdAt)}
                    </Text>
                  </View>
                  {feedback.adminResponse && (
                    <View style={themed($feedbackInfoItem)}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        color="#10B981"
                        size={14}
                      />
                      <Text
                        style={[
                          themed($feedbackInfoText),
                          { color: "#10B981" },
                        ]}
                      >
                        응답 완료
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {filteredFeedbacks.length === 0 && (
            <View style={themed($emptyState)}>
              <Ionicons
                name="chatbubble-outline"
                color={theme.colors.textDim}
                size={48}
              />
              <Text style={themed($emptyStateText)}>
                조건에 맞는 피드백이 없습니다
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 피드백 상세 모달 */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={themed($modalOverlay)}>
          <View style={themed($modalContent)}>
            <View style={themed($modalHeader)}>
              <Text style={themed($modalTitle)}>피드백 상세</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDetailModal(false);
                  setSelectedFeedback(null);
                }}
              >
                <Ionicons name="close" color={theme.colors.text} size={24} />
              </TouchableOpacity>
            </View>

            {selectedFeedback && (
              <ScrollView style={themed($detailContainer)}>
                {/* 피드백 기본 정보 */}
                <View style={themed($detailSection)}>
                  <Text style={themed($detailSectionTitle)}>피드백 정보</Text>
                  <View style={themed($detailRow)}>
                    <Text style={themed($detailLabel)}>제목:</Text>
                    <Text style={themed($detailValue)}>
                      {selectedFeedback.title}
                    </Text>
                  </View>
                  <View style={themed($detailRow)}>
                    <Text style={themed($detailLabel)}>유형:</Text>
                    <Text style={themed($detailValue)}>
                      {getFeedbackTypeDisplay(selectedFeedback.type).label}
                    </Text>
                  </View>
                  <View style={themed($detailRow)}>
                    <Text style={themed($detailLabel)}>상태:</Text>
                    <Text style={themed($detailValue)}>
                      {getFeedbackStatusDisplay(selectedFeedback.status).label}
                    </Text>
                  </View>
                  <View style={themed($detailRow)}>
                    <Text style={themed($detailLabel)}>우선순위:</Text>
                    <Text style={themed($detailValue)}>
                      {
                        getFeedbackPriorityDisplay(selectedFeedback.priority)
                          .label
                      }
                    </Text>
                  </View>
                  <View style={themed($detailRow)}>
                    <Text style={themed($detailLabel)}>내용:</Text>
                    <Text style={themed($detailValue)}>
                      {selectedFeedback.content}
                    </Text>
                  </View>
                </View>

                {/* 제출자 정보 */}
                <View style={themed($detailSection)}>
                  <Text style={themed($detailSectionTitle)}>제출자</Text>
                  <View style={themed($detailRow)}>
                    <Text style={themed($detailLabel)}>닉네임:</Text>
                    <Text style={themed($detailValue)}>
                      {selectedFeedback.submitter.nickname}
                    </Text>
                  </View>
                  <View style={themed($detailRow)}>
                    <Text style={themed($detailLabel)}>이메일:</Text>
                    <Text style={themed($detailValue)}>
                      {selectedFeedback.submitter.email}
                    </Text>
                  </View>
                  {selectedFeedback.contactInfo && (
                    <View style={themed($detailRow)}>
                      <Text style={themed($detailLabel)}>연락처:</Text>
                      <Text style={themed($detailValue)}>
                        {selectedFeedback.contactInfo}
                      </Text>
                    </View>
                  )}
                </View>

                {/* 기존 관리자 응답 */}
                {selectedFeedback.adminResponse && (
                  <View style={themed($detailSection)}>
                    <Text style={themed($detailSectionTitle)}>기존 응답</Text>
                    <Text style={themed($detailValue)}>
                      {selectedFeedback.adminResponse}
                    </Text>
                    <Text style={themed($responseDate)}>
                      응답일:{" "}
                      {selectedFeedback.respondedAt
                        ? formatDate(selectedFeedback.respondedAt)
                        : ""}
                    </Text>
                  </View>
                )}

                {/* 관리자 응답 입력 */}
                <View style={themed($detailSection)}>
                  <Text style={themed($detailSectionTitle)}>
                    {selectedFeedback.adminResponse ? "응답 수정" : "응답 작성"}
                  </Text>
                  <TextInput
                    style={[themed($textInput), themed($textArea)]}
                    value={adminResponse}
                    onChangeText={setAdminResponse}
                    placeholder="피드백에 대한 응답을 작성하세요..."
                    placeholderTextColor={theme.colors.textDim}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                {/* 상태 및 우선순위 변경 */}
                <View style={themed($detailSection)}>
                  <Text style={themed($detailSectionTitle)}>상태 변경</Text>
                  <View style={themed($statusButtons)}>
                    {["REVIEWING", "IN_PROGRESS", "COMPLETED", "REJECTED"].map(
                      (status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            themed($statusButton),
                            {
                              backgroundColor:
                                selectedFeedback.status === status
                                  ? theme.colors.tint + "20"
                                  : "transparent",
                              borderColor:
                                selectedFeedback.status === status
                                  ? theme.colors.tint
                                  : theme.colors.border,
                            },
                          ]}
                          onPress={() =>
                            handleUpdateStatus(selectedFeedback.id, status)
                          }
                        >
                          <Text
                            style={[
                              themed($statusButtonText),
                              {
                                color:
                                  selectedFeedback.status === status
                                    ? theme.colors.tint
                                    : theme.colors.text,
                              },
                            ]}
                          >
                            {getFeedbackStatusDisplay(status).label}
                          </Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>
                </View>

                <View style={themed($detailSection)}>
                  <Text style={themed($detailSectionTitle)}>우선순위 변경</Text>
                  <View style={themed($priorityButtons)}>
                    {["LOW", "MEDIUM", "HIGH", "URGENT"].map((priority) => {
                      const priorityInfo = getFeedbackPriorityDisplay(priority);
                      return (
                        <TouchableOpacity
                          key={priority}
                          style={[
                            themed($priorityButton),
                            {
                              backgroundColor:
                                selectedFeedback.priority === priority
                                  ? priorityInfo.color + "20"
                                  : "transparent",
                              borderColor:
                                selectedFeedback.priority === priority
                                  ? priorityInfo.color
                                  : theme.colors.border,
                            },
                          ]}
                          onPress={() =>
                            handleUpdatePriority(selectedFeedback.id, priority)
                          }
                        >
                          <Text
                            style={[
                              themed($priorityButtonText),
                              {
                                color:
                                  selectedFeedback.priority === priority
                                    ? priorityInfo.color
                                    : theme.colors.text,
                              },
                            ]}
                          >
                            {priorityInfo.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>
            )}

            {/* 응답 버튼 */}
            <View style={themed($modalActions)}>
              <TouchableOpacity
                style={themed($awardButton)}
                disabled={awardLoading}
                onPress={() => {
                  if (!selectedFeedback) return;
                  setAwardTarget({
                    userId: selectedFeedback.submitter.id,
                    nickname: selectedFeedback.submitter.nickname,
                    feedbackId: selectedFeedback.id,
                  });
                  setShowAwardDialog(true);
                }}
              >
                <Text style={themed($awardButtonText)}>
                  {awardLoading ? "지급 중..." : "10포인트 지급"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={themed($responseButton)}
                onPress={() => {
                  if (!adminResponse.trim()) {
                    showToast({
                      type: "error",
                      title: "입력 오류",
                      message: "응답 내용을 입력해주세요.",
                      duration: 3000,
                    });
                    return;
                  }
                  handleRespondToFeedback(selectedFeedback!.id, adminResponse);
                }}
              >
                <Text style={themed($responseButtonText)}>
                  {selectedFeedback?.adminResponse ? "응답 수정" : "응답 등록"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <AppDialog
        visible={showAwardDialog}
        onClose={() => {
          setShowAwardDialog(false);
          setAwardTarget(null);
        }}
        title="포인트 지급"
        description={
          awardTarget
            ? `${awardTarget.nickname}에게 10포인트를 지급할까요?`
            : "해당 사용자에게 10포인트를 지급할까요?"
        }
        confirmText={awardLoading ? "지급 중..." : "지급"}
        cancelText="취소"
        confirmDisabled={awardLoading}
        onConfirm={async () => {
          if (!awardTarget) return;
          await handleAwardPoints(
            awardTarget.userId,
            10,
            `피드백 보상(${awardTarget.feedbackId})`,
          );
          setShowAwardDialog(false);
          setAwardTarget(null);
        }}
      />
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

const $filterSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  gap: spacing.sm,
});

const $filterButtons: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  paddingHorizontal: spacing.md,
  gap: spacing.sm,
  alignItems: "center",
});

const $filterLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  fontWeight: "500",
  color: colors.text,
  marginRight: spacing.sm,
});

const $filterButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 20,
  borderWidth: 1,
});

const $filterButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  fontWeight: "500",
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
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
});

const $statLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  color: colors.textDim,
  marginTop: spacing.xs,
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

const $feedbacksSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.xl,
  gap: spacing.md,
});

const $feedbackCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  padding: spacing.md,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
});

const $feedbackHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.sm,
});

const $feedbackTitleSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
  gap: spacing.sm,
});

const $feedbackTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
  flex: 1,
});

const $feedbackContent: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.textDim,
  marginBottom: spacing.sm,
  lineHeight: 20,
});

const $feedbackBadges: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
  marginBottom: spacing.sm,
  flexWrap: "wrap",
});

const $feedbackTypeBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
});

const $feedbackTypeText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  fontWeight: "500",
});

const $feedbackStatusBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
});

const $feedbackStatusText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  fontWeight: "500",
});

const $feedbackPriorityBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
});

const $feedbackPriorityText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  fontWeight: "500",
});

const $feedbackInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.md,
  flexWrap: "wrap",
});

const $feedbackInfoItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
});

const $feedbackInfoText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});

const $emptyState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  paddingVertical: spacing.xl,
  gap: spacing.md,
});

const $emptyStateText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
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
  maxWidth: 500,
  maxHeight: "85%",
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

const $detailContainer: ThemedStyle<ViewStyle> = () => ({
  maxHeight: 500,
});

const $detailSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
});

const $detailSectionTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.sm,
});

const $detailRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
});

const $detailLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  fontWeight: "500",
  color: colors.textDim,
  marginBottom: spacing.xs,
});

const $detailValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.text,
  lineHeight: 20,
});

const $responseDate: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  color: colors.textDim,
  marginTop: spacing.sm,
  fontStyle: "italic",
});

const $textInput: ThemedStyle<any> = ({ colors, spacing }) => ({
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  padding: spacing.md,
  fontSize: 14,
  color: colors.text,
  backgroundColor: colors.card,
});

const $textArea: ThemedStyle<any> = () => ({
  height: 100,
  textAlignVertical: "top",
});

const $statusButtons: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
});

const $statusButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 20,
  borderWidth: 1,
});

const $statusButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  fontWeight: "500",
});

const $priorityButtons: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
});

const $priorityButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 20,
  borderWidth: 1,
});

const $priorityButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  fontWeight: "500",
});

const $modalActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.lg,
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "flex-end",
  gap: spacing.sm,
});

const $awardButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 8,
  backgroundColor: "#10B981",
  marginRight: spacing.sm,
});
const $responseButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 8,
  backgroundColor: colors.tint,
});

const $awardButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
  color: "white",
  fontWeight: "500",
});
const $responseButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
  color: "white",
  fontWeight: "500",
});
