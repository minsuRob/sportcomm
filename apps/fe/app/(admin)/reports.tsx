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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { showToast } from "@/components/CustomToast";

// 신고 정보 타입
interface ReportInfo {
  id: string;
  type:
    | "SPAM"
    | "INAPPROPRIATE_CONTENT"
    | "HARASSMENT"
    | "MISINFORMATION"
    | "COPYRIGHT"
    | "OTHER";
  status: "PENDING" | "REVIEWING" | "APPROVED" | "REJECTED";
  reason: string;
  description?: string;
  reporter: {
    id: string;
    nickname: string;
    email: string;
  };
  reportedUser?: {
    id: string;
    nickname: string;
    email: string;
  };
  reportedPost?: {
    id: string;
    title: string;
    content: string;
  };
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 신고 관리 화면
 *
 * 관리자가 사용자 신고를 처리할 수 있는 화면입니다.
 */
export default function AdminReportsScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const [reports, setReports] = useState<ReportInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportInfo | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // 신고 데이터 로드
  const loadReports = async () => {
    try {
      setIsLoading(true);

      // TODO: GraphQL 쿼리로 실제 데이터 로드
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockReports: ReportInfo[] = [
        {
          id: "1",
          type: "SPAM",
          status: "PENDING",
          reason: "스팸 게시물",
          description: "같은 내용을 반복적으로 게시하고 있습니다.",
          reporter: {
            id: "user1",
            nickname: "신고자1",
            email: "reporter1@example.com",
          },
          reportedUser: {
            id: "user2",
            nickname: "신고당한사용자1",
            email: "reported1@example.com",
          },
          reportedPost: {
            id: "post1",
            title: "스팸 게시물 제목",
            content: "반복적인 스팸 내용입니다...",
          },
          createdAt: "2024-02-08T10:30:00Z",
          updatedAt: "2024-02-08T10:30:00Z",
        },
        {
          id: "2",
          type: "HARASSMENT",
          status: "REVIEWING",
          reason: "괴롭힘 및 혐오 발언",
          description: "다른 사용자에게 욕설과 인신공격을 하고 있습니다.",
          reporter: {
            id: "user3",
            nickname: "신고자2",
            email: "reporter2@example.com",
          },
          reportedUser: {
            id: "user4",
            nickname: "신고당한사용자2",
            email: "reported2@example.com",
          },
          adminNote: "검토 중입니다.",
          createdAt: "2024-02-07T15:20:00Z",
          updatedAt: "2024-02-08T09:15:00Z",
        },
        {
          id: "3",
          type: "INAPPROPRIATE_CONTENT",
          status: "APPROVED",
          reason: "부적절한 콘텐츠",
          description: "성인 콘텐츠를 포함하고 있습니다.",
          reporter: {
            id: "user5",
            nickname: "신고자3",
            email: "reporter3@example.com",
          },
          reportedPost: {
            id: "post2",
            title: "부적절한 게시물",
            content: "부적절한 내용...",
          },
          adminNote: "신고가 승인되어 게시물이 삭제되었습니다.",
          createdAt: "2024-02-06T11:45:00Z",
          updatedAt: "2024-02-07T14:30:00Z",
        },
      ];

      setReports(mockReports);
    } catch (error) {
      console.error("신고 데이터 로드 실패:", error);
      showToast({
        type: "error",
        title: "데이터 로드 실패",
        message: "신고 데이터를 불러오는 중 오류가 발생했습니다.",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // 신고 처리 핸들러
  const handleProcessReport = async (
    reportId: string,
    status: "APPROVED" | "REJECTED",
    note: string
  ) => {
    try {
      // TODO: GraphQL 뮤테이션으로 신고 처리
      console.log("신고 처리:", { reportId, status, note });

      showToast({
        type: "success",
        title: "신고 처리 완료",
        message: `신고가 ${status === "APPROVED" ? "승인" : "거부"}되었습니다.`,
        duration: 2000,
      });

      setShowDetailModal(false);
      setSelectedReport(null);
      setAdminNote("");
      loadReports();
    } catch (error) {
      console.error("신고 처리 실패:", error);
      showToast({
        type: "error",
        title: "처리 실패",
        message: "신고 처리 중 오류가 발생했습니다.",
        duration: 3000,
      });
    }
  };

  // 신고 상세 보기
  const openReportDetail = (report: ReportInfo) => {
    setSelectedReport(report);
    setAdminNote(report.adminNote || "");
    setShowDetailModal(true);
  };

  // 신고 유형 표시
  const getReportTypeDisplay = (type: string) => {
    const typeMap = {
      SPAM: { label: "스팸", color: "#F59E0B" },
      INAPPROPRIATE_CONTENT: { label: "부적절한 콘텐츠", color: "#EF4444" },
      HARASSMENT: { label: "괴롭힘", color: "#DC2626" },
      MISINFORMATION: { label: "허위 정보", color: "#7C2D12" },
      COPYRIGHT: { label: "저작권 침해", color: "#9333EA" },
      OTHER: { label: "기타", color: "#6B7280" },
    };
    return (
      typeMap[type as keyof typeof typeMap] || {
        label: "알 수 없음",
        color: "#6B7280",
      }
    );
  };

  // 신고 상태 표시
  const getReportStatusDisplay = (status: string) => {
    const statusMap = {
      PENDING: { label: "대기 중", color: "#F59E0B" },
      REVIEWING: { label: "검토 중", color: "#3B82F6" },
      APPROVED: { label: "승인됨", color: "#10B981" },
      REJECTED: { label: "거부됨", color: "#6B7280" },
    };
    return (
      statusMap[status as keyof typeof statusMap] || {
        label: "알 수 없음",
        color: "#6B7280",
      }
    );
  };

  // 필터링된 신고 목록
  const filteredReports =
    filterStatus === "ALL"
      ? reports
      : reports.filter((report) => report.status === filterStatus);

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
          <Text style={themed($loadingText)}>신고 데이터 로딩 중...</Text>
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
        <Text style={themed($headerTitle)}>신고 관리</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 필터 */}
      <View style={themed($filterSection)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={themed($filterButtons)}>
            {["ALL", "PENDING", "REVIEWING", "APPROVED", "REJECTED"].map(
              (status) => (
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
                      : getReportStatusDisplay(status).label}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </ScrollView>
      </View>

      {/* 통계 정보 */}
      <View style={themed($statsSection)}>
        <View style={themed($statCard)}>
          <Text style={themed($statNumber)}>{reports.length}</Text>
          <Text style={themed($statLabel)}>총 신고</Text>
        </View>
        <View style={themed($statCard)}>
          <Text style={themed($statNumber)}>
            {reports.filter((r) => r.status === "PENDING").length}
          </Text>
          <Text style={themed($statLabel)}>대기 중</Text>
        </View>
        <View style={themed($statCard)}>
          <Text style={themed($statNumber)}>
            {reports.filter((r) => r.status === "REVIEWING").length}
          </Text>
          <Text style={themed($statLabel)}>검토 중</Text>
        </View>
      </View>

      <ScrollView style={themed($scrollContainer)}>
        {/* 신고 목록 */}
        <View style={themed($reportsSection)}>
          {filteredReports.map((report) => {
            const typeInfo = getReportTypeDisplay(report.type);
            const statusInfo = getReportStatusDisplay(report.status);

            return (
              <TouchableOpacity
                key={report.id}
                style={themed($reportCard)}
                onPress={() => openReportDetail(report)}
              >
                <View style={themed($reportHeader)}>
                  <View style={themed($reportTitleSection)}>
                    <View
                      style={[
                        themed($reportTypeBadge),
                        { backgroundColor: typeInfo.color + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          themed($reportTypeText),
                          { color: typeInfo.color },
                        ]}
                      >
                        {typeInfo.label}
                      </Text>
                    </View>
                    <View
                      style={[
                        themed($reportStatusBadge),
                        { backgroundColor: statusInfo.color + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          themed($reportStatusText),
                          { color: statusInfo.color },
                        ]}
                      >
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward-outline"
                    color={theme.colors.textDim}
                    size={16}
                  />
                </View>

                <Text style={themed($reportReason)}>{report.reason}</Text>

                {report.description && (
                  <Text style={themed($reportDescription)} numberOfLines={2}>
                    {report.description}
                  </Text>
                )}

                <View style={themed($reportInfo)}>
                  <View style={themed($reportInfoItem)}>
                    <Ionicons
                      name="person-outline"
                      color={theme.colors.textDim}
                      size={14}
                    />
                    <Text style={themed($reportInfoText)}>
                      신고자: {report.reporter.nickname}
                    </Text>
                  </View>
                  {report.reportedUser && (
                    <View style={themed($reportInfoItem)}>
                      <Ionicons
                        name="alert-circle-outline"
                        color={theme.colors.textDim}
                        size={14}
                      />
                      <Text style={themed($reportInfoText)}>
                        신고 대상: {report.reportedUser.nickname}
                      </Text>
                    </View>
                  )}
                  <View style={themed($reportInfoItem)}>
                    <Ionicons
                      name="time-outline"
                      color={theme.colors.textDim}
                      size={14}
                    />
                    <Text style={themed($reportInfoText)}>
                      {formatDate(report.createdAt)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {filteredReports.length === 0 && (
            <View style={themed($emptyState)}>
              <Ionicons
                name="document-outline"
                color={theme.colors.textDim}
                size={48}
              />
              <Text style={themed($emptyStateText)}>
                {filterStatus === "ALL"
                  ? "신고가 없습니다"
                  : `${getReportStatusDisplay(filterStatus).label} 신고가 없습니다`}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 신고 상세 모달 */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={themed($modalOverlay)}>
          <View style={themed($modalContent)}>
            <View style={themed($modalHeader)}>
              <Text style={themed($modalTitle)}>신고 상세</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDetailModal(false);
                  setSelectedReport(null);
                }}
              >
                <Ionicons name="close" color={theme.colors.text} size={24} />
              </TouchableOpacity>
            </View>

            {selectedReport && (
              <ScrollView style={themed($detailContainer)}>
                {/* 신고 기본 정보 */}
                <View style={themed($detailSection)}>
                  <Text style={themed($detailSectionTitle)}>신고 정보</Text>
                  <View style={themed($detailRow)}>
                    <Text style={themed($detailLabel)}>유형:</Text>
                    <Text style={themed($detailValue)}>
                      {getReportTypeDisplay(selectedReport.type).label}
                    </Text>
                  </View>
                  <View style={themed($detailRow)}>
                    <Text style={themed($detailLabel)}>상태:</Text>
                    <Text style={themed($detailValue)}>
                      {getReportStatusDisplay(selectedReport.status).label}
                    </Text>
                  </View>
                  <View style={themed($detailRow)}>
                    <Text style={themed($detailLabel)}>신고 사유:</Text>
                    <Text style={themed($detailValue)}>
                      {selectedReport.reason}
                    </Text>
                  </View>
                  {selectedReport.description && (
                    <View style={themed($detailRow)}>
                      <Text style={themed($detailLabel)}>상세 설명:</Text>
                      <Text style={themed($detailValue)}>
                        {selectedReport.description}
                      </Text>
                    </View>
                  )}
                </View>

                {/* 신고자 정보 */}
                <View style={themed($detailSection)}>
                  <Text style={themed($detailSectionTitle)}>신고자</Text>
                  <View style={themed($detailRow)}>
                    <Text style={themed($detailLabel)}>닉네임:</Text>
                    <Text style={themed($detailValue)}>
                      {selectedReport.reporter.nickname}
                    </Text>
                  </View>
                  <View style={themed($detailRow)}>
                    <Text style={themed($detailLabel)}>이메일:</Text>
                    <Text style={themed($detailValue)}>
                      {selectedReport.reporter.email}
                    </Text>
                  </View>
                </View>

                {/* 신고 대상 정보 */}
                {selectedReport.reportedUser && (
                  <View style={themed($detailSection)}>
                    <Text style={themed($detailSectionTitle)}>
                      신고 대상 사용자
                    </Text>
                    <View style={themed($detailRow)}>
                      <Text style={themed($detailLabel)}>닉네임:</Text>
                      <Text style={themed($detailValue)}>
                        {selectedReport.reportedUser.nickname}
                      </Text>
                    </View>
                    <View style={themed($detailRow)}>
                      <Text style={themed($detailLabel)}>이메일:</Text>
                      <Text style={themed($detailValue)}>
                        {selectedReport.reportedUser.email}
                      </Text>
                    </View>
                  </View>
                )}

                {/* 신고 대상 게시물 */}
                {selectedReport.reportedPost && (
                  <View style={themed($detailSection)}>
                    <Text style={themed($detailSectionTitle)}>
                      신고 대상 게시물
                    </Text>
                    <View style={themed($detailRow)}>
                      <Text style={themed($detailLabel)}>제목:</Text>
                      <Text style={themed($detailValue)}>
                        {selectedReport.reportedPost.title}
                      </Text>
                    </View>
                    <View style={themed($detailRow)}>
                      <Text style={themed($detailLabel)}>내용:</Text>
                      <Text style={themed($detailValue)} numberOfLines={3}>
                        {selectedReport.reportedPost.content}
                      </Text>
                    </View>
                  </View>
                )}

                {/* 관리자 메모 */}
                <View style={themed($detailSection)}>
                  <Text style={themed($detailSectionTitle)}>관리자 메모</Text>
                  <TextInput
                    style={[themed($textInput), themed($textArea)]}
                    value={adminNote}
                    onChangeText={setAdminNote}
                    placeholder="처리 내용이나 메모를 입력하세요..."
                    placeholderTextColor={theme.colors.textDim}
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </ScrollView>
            )}

            {/* 처리 버튼 */}
            {selectedReport &&
              selectedReport.status !== "APPROVED" &&
              selectedReport.status !== "REJECTED" && (
                <View style={themed($modalActions)}>
                  <TouchableOpacity
                    style={[
                      themed($actionButton),
                      { backgroundColor: "#EF4444" },
                    ]}
                    onPress={() => {
                      Alert.alert("신고 승인", "이 신고를 승인하시겠습니까?", [
                        { text: "취소", style: "cancel" },
                        {
                          text: "승인",
                          onPress: () =>
                            handleProcessReport(
                              selectedReport.id,
                              "APPROVED",
                              adminNote
                            ),
                        },
                      ]);
                    }}
                  >
                    <Text style={themed($actionButtonText)}>승인</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      themed($actionButton),
                      { backgroundColor: "#6B7280" },
                    ]}
                    onPress={() => {
                      Alert.alert("신고 거부", "이 신고를 거부하시겠습니까?", [
                        { text: "취소", style: "cancel" },
                        {
                          text: "거부",
                          onPress: () =>
                            handleProcessReport(
                              selectedReport.id,
                              "REJECTED",
                              adminNote
                            ),
                        },
                      ]);
                    }}
                  >
                    <Text style={themed($actionButtonText)}>거부</Text>
                  </TouchableOpacity>
                </View>
              )}
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

const $filterSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $filterButtons: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  paddingHorizontal: spacing.md,
  gap: spacing.sm,
});

const $filterButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 20,
  borderWidth: 1,
});

const $filterButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
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

const $reportsSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.xl,
  gap: spacing.md,
});

const $reportCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  padding: spacing.md,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
});

const $reportHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.sm,
});

const $reportTitleSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
});

const $reportTypeBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
});

const $reportTypeText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  fontWeight: "500",
});

const $reportStatusBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
});

const $reportStatusText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  fontWeight: "500",
});

const $reportReason: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.sm,
});

const $reportDescription: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.textDim,
  marginBottom: spacing.sm,
});

const $reportInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
});

const $reportInfoItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
});

const $reportInfoText: ThemedStyle<TextStyle> = ({ colors }) => ({
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

const $detailContainer: ThemedStyle<ViewStyle> = () => ({
  maxHeight: 400,
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

const $modalActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "flex-end",
  gap: spacing.sm,
  marginTop: spacing.lg,
});

const $actionButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 8,
});

const $actionButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
  color: "white",
  fontWeight: "500",
});
