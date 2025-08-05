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
import { GET_ADMIN_REPORTS, UPDATE_REPORT_STATUS } from "@/lib/graphql/admin";

// 신고 타입 열거형
enum ReportType {
  SPAM = "SPAM",
  INAPPROPRIATE_CONTENT = "INAPPROPRIATE_CONTENT",
  HARASSMENT = "HARASSMENT",
  MISINFORMATION = "MISINFORMATION",
  COPYRIGHT = "COPYRIGHT",
  OTHER = "OTHER",
}

// 신고 상태 열거형
enum ReportStatus {
  PENDING = "PENDING",
  REVIEWING = "REVIEWING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

// 사용자 정보 타입
interface UserInfo {
  id: string;
  nickname: string;
  email: string;
}

// 게시물 정보 타입
interface PostInfo {
  id: string;
  title: string;
  content: string;
}

// 신고 정보 타입
interface ReportInfo {
  id: string;
  type: ReportType;
  status: ReportStatus;
  reason: string;
  description?: string;
  reporter: UserInfo;
  reportedUser?: UserInfo;
  reportedPost?: PostInfo;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

// GraphQL 응답 타입
interface ReportsResponse {
  adminGetAllReports: {
    reports: ReportInfo[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * 신고 관리 화면
 *
 * 관리자가 사용자 신고를 처리하고 관리할 수 있는 화면입니다.
 */
export default function AdminReportsScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportInfo | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "ALL">("ALL");
  const [adminNote, setAdminNote] = useState("");
  const [page, setPage] = useState(1);

  // GraphQL 쿼리 및 뮤테이션
  const { data, loading, error, refetch } = useQuery<ReportsResponse>(
    GET_ADMIN_REPORTS,
    {
      variables: { page, limit: 20 },
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    },
  );

  const [updateReportStatus, { loading: updateLoading }] = useMutation(
    UPDATE_REPORT_STATUS,
    {
      refetchQueries: [
        { query: GET_ADMIN_REPORTS, variables: { page, limit: 20 } },
      ],
      onCompleted: (data) => {
        const report = data.adminUpdateReportStatus;
        showToast({
          type: "success",
          title: "신고 처리 완료",
          message: `신고가 ${getStatusDisplayName(report.status)}되었습니다.`,
          duration: 2000,
        });
        setShowDetailModal(false);
        setSelectedReport(null);
        setAdminNote("");
      },
      onError: (error) => {
        console.error("신고 처리 실패:", error);
        showToast({
          type: "error",
          title: "처리 실패",
          message: error.message || "신고 처리 중 오류가 발생했습니다.",
          duration: 3000,
        });
      },
    },
  );

  // 데이터 처리
  const reports = data?.adminGetAllReports?.reports || [];
  const totalReports = data?.adminGetAllReports?.total || 0;

  // 필터링된 신고 목록
  const filteredReports = reports.filter((report) =>
    statusFilter === "ALL" ? true : report.status === statusFilter,
  );

  // 에러 처리
  useEffect(() => {
    if (error) {
      console.error("신고 데이터 로드 실패:", error);
      showToast({
        type: "error",
        title: "데이터 로드 실패",
        message:
          error.message || "신고 데이터를 불러오는 중 오류가 발생했습니다.",
        duration: 3000,
      });
    }
  }, [error]);

  // 신고 상세 모달 열기
  const openDetailModal = (report: ReportInfo) => {
    setSelectedReport(report);
    setAdminNote(report.adminNote || "");
    setShowDetailModal(true);
  };

  // 신고 상태 업데이트 핸들러
  const handleUpdateReportStatus = async (
    status: ReportStatus,
    note?: string,
  ) => {
    if (!selectedReport) return;

    try {
      await updateReportStatus({
        variables: {
          reportId: selectedReport.id,
          status,
          adminNote: note || adminNote || null,
        },
      });
    } catch (error) {
      // 에러는 onError에서 처리됨
    }
  };

  // 신고 타입 표시명
  const getReportTypeDisplay = (type: ReportType) => {
    const typeMap = {
      SPAM: { label: "스팸", color: "#F59E0B" },
      INAPPROPRIATE_CONTENT: { label: "부적절한 콘텐츠", color: "#EF4444" },
      HARASSMENT: { label: "괴롭힘", color: "#DC2626" },
      MISINFORMATION: { label: "허위 정보", color: "#F97316" },
      COPYRIGHT: { label: "저작권 침해", color: "#7C2D12" },
      OTHER: { label: "기타", color: "#6B7280" },
    };
    return typeMap[type] || { label: "알 수 없음", color: "#6B7280" };
  };

  // 신고 상태 표시명
  const getStatusDisplayName = (status: ReportStatus) => {
    const statusMap = {
      PENDING: "대기 중",
      REVIEWING: "검토 중",
      APPROVED: "승인됨",
      REJECTED: "거부됨",
    };
    return statusMap[status] || "알 수 없음";
  };

  // 신고 상태 색상
  const getStatusColor = (status: ReportStatus) => {
    const colorMap = {
      PENDING: "#F59E0B",
      REVIEWING: "#3B82F6",
      APPROVED: "#10B981",
      REJECTED: "#EF4444",
    };
    return colorMap[status] || "#6B7280";
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

  // 상태별 통계
  const getStatusStats = () => {
    const stats = {
      PENDING: reports.filter((r) => r.status === ReportStatus.PENDING).length,
      REVIEWING: reports.filter((r) => r.status === ReportStatus.REVIEWING)
        .length,
      APPROVED: reports.filter((r) => r.status === ReportStatus.APPROVED)
        .length,
      REJECTED: reports.filter((r) => r.status === ReportStatus.REJECTED)
        .length,
    };
    return stats;
  };

  const statusStats = getStatusStats();

  if (loading && !data) {
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

      <ScrollView
        style={themed($scrollContainer)}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => refetch()} />
        }
      >
        {/* 통계 정보 */}
        <View style={themed($statsSection)}>
          <View style={themed($statCard)}>
            <Text style={themed($statNumber)}>{totalReports}</Text>
            <Text style={themed($statLabel)}>총 신고</Text>
          </View>
          <View style={themed($statCard)}>
            <Text style={[themed($statNumber), { color: "#F59E0B" }]}>
              {statusStats.PENDING}
            </Text>
            <Text style={themed($statLabel)}>대기 중</Text>
          </View>
          <View style={themed($statCard)}>
            <Text style={[themed($statNumber), { color: "#3B82F6" }]}>
              {statusStats.REVIEWING}
            </Text>
            <Text style={themed($statLabel)}>검토 중</Text>
          </View>
        </View>

        {/* 상태 필터 */}
        <View style={themed($filterSection)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={themed($filterContainer)}>
              {[
                { key: "ALL", label: "전체" },
                { key: ReportStatus.PENDING, label: "대기 중" },
                { key: ReportStatus.REVIEWING, label: "검토 중" },
                { key: ReportStatus.APPROVED, label: "승인됨" },
                { key: ReportStatus.REJECTED, label: "거부됨" },
              ].map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    themed($filterButton),
                    statusFilter === filter.key && themed($filterButtonActive),
                  ]}
                  onPress={() => setStatusFilter(filter.key as any)}
                >
                  <Text
                    style={[
                      themed($filterButtonText),
                      statusFilter === filter.key &&
                        themed($filterButtonTextActive),
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* 신고 목록 */}
        <View style={themed($reportsSection)}>
          {filteredReports.map((report) => {
            const typeInfo = getReportTypeDisplay(report.type);
            const statusColor = getStatusColor(report.status);

            return (
              <TouchableOpacity
                key={report.id}
                style={themed($reportCard)}
                onPress={() => openDetailModal(report)}
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
                        { backgroundColor: statusColor + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          themed($reportStatusText),
                          { color: statusColor },
                        ]}
                      >
                        {getStatusDisplayName(report.status)}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward-outline"
                    color={theme.colors.textDim}
                    size={16}
                  />
                </View>

                <Text style={themed($reportReason)} numberOfLines={2}>
                  {report.reason}
                </Text>

                <View style={themed($reportMeta)}>
                  <View style={themed($reportMetaItem)}>
                    <Ionicons
                      name="person-outline"
                      color={theme.colors.textDim}
                      size={14}
                    />
                    <Text style={themed($reportMetaText)}>
                      신고자: {report.reporter.nickname}
                    </Text>
                  </View>
                  {report.reportedUser && (
                    <View style={themed($reportMetaItem)}>
                      <Ionicons
                        name="alert-circle-outline"
                        color={theme.colors.textDim}
                        size={14}
                      />
                      <Text style={themed($reportMetaText)}>
                        신고 대상: {report.reportedUser.nickname}
                      </Text>
                    </View>
                  )}
                  {report.reportedPost && (
                    <View style={themed($reportMetaItem)}>
                      <Ionicons
                        name="document-text-outline"
                        color={theme.colors.textDim}
                        size={14}
                      />
                      <Text style={themed($reportMetaText)}>
                        게시물: {report.reportedPost.title}
                      </Text>
                    </View>
                  )}
                  <View style={themed($reportMetaItem)}>
                    <Ionicons
                      name="time-outline"
                      color={theme.colors.textDim}
                      size={14}
                    />
                    <Text style={themed($reportMetaText)}>
                      {formatDate(report.createdAt)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {filteredReports.length === 0 && (
            <View style={themed($emptyContainer)}>
              <Ionicons
                name="document-outline"
                color={theme.colors.textDim}
                size={48}
              />
              <Text style={themed($emptyText)}>
                {statusFilter === "ALL"
                  ? "신고가 없습니다."
                  : `${
                      statusFilter === "PENDING"
                        ? "대기 중인"
                        : statusFilter === "REVIEWING"
                          ? "검토 중인"
                          : statusFilter === "APPROVED"
                            ? "승인된"
                            : "거부된"
                    } 신고가 없습니다.`}
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
                  setAdminNote("");
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
                    <Text style={themed($detailLabel)}>신고 유형:</Text>
                    <Text style={themed($detailValue)}>
                      {getReportTypeDisplay(selectedReport.type).label}
                    </Text>
                  </View>
                  <View style={themed($detailRow)}>
                    <Text style={themed($detailLabel)}>상태:</Text>
                    <Text
                      style={[
                        themed($detailValue),
                        { color: getStatusColor(selectedReport.status) },
                      ]}
                    >
                      {getStatusDisplayName(selectedReport.status)}
                    </Text>
                  </View>
                  <View style={themed($detailRow)}>
                    <Text style={themed($detailLabel)}>신고일:</Text>
                    <Text style={themed($detailValue)}>
                      {formatDate(selectedReport.createdAt)}
                    </Text>
                  </View>
                </View>

                {/* 신고 사유 */}
                <View style={themed($detailSection)}>
                  <Text style={themed($detailSectionTitle)}>신고 사유</Text>
                  <Text style={themed($detailContent)}>
                    {selectedReport.reason}
                  </Text>
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

                {/* 신고된 게시물 정보 */}
                {selectedReport.reportedPost && (
                  <View style={themed($detailSection)}>
                    <Text style={themed($detailSectionTitle)}>
                      신고된 게시물
                    </Text>
                    <View style={themed($detailRow)}>
                      <Text style={themed($detailLabel)}>제목:</Text>
                      <Text style={themed($detailValue)}>
                        {selectedReport.reportedPost.title}
                      </Text>
                    </View>
                    <Text style={themed($detailContent)}>
                      {selectedReport.reportedPost.content}
                    </Text>
                  </View>
                )}

                {/* 관리자 메모 */}
                <View style={themed($detailSection)}>
                  <Text style={themed($detailSectionTitle)}>관리자 메모</Text>
                  <TextInput
                    style={themed($adminNoteInput)}
                    value={adminNote}
                    onChangeText={setAdminNote}
                    placeholder="관리자 메모를 입력하세요..."
                    placeholderTextColor={theme.colors.textDim}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </ScrollView>
            )}

            {/* 액션 버튼 */}
            {selectedReport &&
              selectedReport.status !== ReportStatus.APPROVED &&
              selectedReport.status !== ReportStatus.REJECTED && (
                <View style={themed($modalActions)}>
                  <TouchableOpacity
                    style={[
                      themed($actionButton),
                      { backgroundColor: "#EF444420" },
                    ]}
                    onPress={() =>
                      handleUpdateReportStatus(ReportStatus.REJECTED)
                    }
                    disabled={updateLoading}
                  >
                    <Text
                      style={[themed($actionButtonText), { color: "#EF4444" }]}
                    >
                      거부
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      themed($actionButton),
                      { backgroundColor: "#3B82F620" },
                    ]}
                    onPress={() =>
                      handleUpdateReportStatus(ReportStatus.REVIEWING)
                    }
                    disabled={updateLoading}
                  >
                    <Text
                      style={[themed($actionButtonText), { color: "#3B82F6" }]}
                    >
                      검토 중
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      themed($actionButton),
                      { backgroundColor: "#10B98120" },
                    ]}
                    onPress={() =>
                      handleUpdateReportStatus(ReportStatus.APPROVED)
                    }
                    disabled={updateLoading}
                  >
                    <Text
                      style={[themed($actionButtonText), { color: "#10B981" }]}
                    >
                      승인
                    </Text>
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

const $filterSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.md,
});

const $filterContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
});

const $filterButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.card,
});

const $filterButtonActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
  borderColor: colors.tint,
});

const $filterButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.text,
});

const $filterButtonTextActive: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontWeight: "500",
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
  alignItems: "center",
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
  fontSize: 14,
  color: colors.text,
  marginBottom: spacing.sm,
  lineHeight: 20,
});

const $reportMeta: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
});

const $reportMetaItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
});

const $reportMetaText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});

const $emptyContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  padding: spacing.xl,
});

const $emptyText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  color: colors.textDim,
  marginTop: spacing.md,
  textAlign: "center",
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
  width: "95%",
  maxWidth: 500,
  maxHeight: "90%",
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

const $detailContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
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
  flexDirection: "row",
  marginBottom: spacing.xs,
});

const $detailLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  width: 80,
});

const $detailValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.text,
  flex: 1,
});

const $detailContent: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.text,
  lineHeight: 20,
  padding: spacing.sm,
  backgroundColor: colors.card,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
});

const $adminNoteInput: ThemedStyle<any> = ({ colors, spacing }) => ({
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  padding: spacing.md,
  fontSize: 14,
  color: colors.text,
  backgroundColor: colors.card,
  height: 80,
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
  fontWeight: "500",
});
