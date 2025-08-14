import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

// 한국어 로케일 설정
LocaleConfig.locales["ko"] = {
  monthNames: [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ],
  monthNamesShort: [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ],
  dayNames: [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
  ],
  dayNamesShort: ["일", "월", "화", "수", "목", "금", "토"],
  today: "오늘",
};
LocaleConfig.defaultLocale = "ko";

// 컴포넌트 Props 타입
interface FavoriteDateCalendarProps {
  visible: boolean;
  onClose: () => void;
  onDateSelect: (date: string) => void;
  selectedDate?: string;
  teamName?: string;
  teamColor?: string;
}

/**
 * 팀을 좋아하게 된 날짜 선택 캘린더 컴포넌트
 *
 * 사용자가 팀을 선택할 때 해당 팀을 좋아하게 된 날짜를
 * 캘린더에서 선택할 수 있는 모달 컴포넌트입니다.
 */
export default function FavoriteDateCalendar({
  visible,
  onClose,
  onDateSelect,
  selectedDate,
  teamName,
  teamColor = "#FF0000",
}: FavoriteDateCalendarProps) {
  const { themed, theme } = useAppTheme();
  const [tempSelectedDate, setTempSelectedDate] = useState(selectedDate || "");

  /**
   * 날짜 선택 핸들러
   */
  const handleDayPress = (day: any) => {
    setTempSelectedDate(day.dateString);
  };

  /**
   * 확인 버튼 핸들러
   */
  const handleConfirm = () => {
    onDateSelect(tempSelectedDate);
    onClose();
  };

  /**
   * 취소 버튼 핸들러
   */
  const handleCancel = () => {
    setTempSelectedDate(selectedDate || "");
    onClose();
  };

  /**
   * 오늘 날짜로 설정
   */
  const handleSetToday = () => {
    const today = new Date().toISOString().split("T")[0];
    setTempSelectedDate(today);
  };

  /**
   * 날짜 선택 해제
   */
  const handleClearDate = () => {
    setTempSelectedDate("");
  };

  // 캘린더 테마 설정
  const calendarTheme = {
    backgroundColor: theme.colors.background,
    calendarBackground: theme.colors.card,
    textSectionTitleColor: theme.colors.textDim,
    selectedDayBackgroundColor: teamColor,
    selectedDayTextColor: "#ffffff",
    todayTextColor: teamColor,
    dayTextColor: theme.colors.text,
    textDisabledColor: theme.colors.textDim,
    dotColor: teamColor,
    selectedDotColor: "#ffffff",
    arrowColor: teamColor,
    disabledArrowColor: theme.colors.textDim,
    monthTextColor: theme.colors.text,
    indicatorColor: teamColor,
    textDayFontFamily: "System",
    textMonthFontFamily: "System",
    textDayHeaderFontFamily: "System",
    textDayFontWeight: "400",
    textMonthFontWeight: "600",
    textDayHeaderFontWeight: "500",
    textDayFontSize: 16,
    textMonthFontSize: 18,
    textDayHeaderFontSize: 14,
    // 커스텀 스타일시트
    "stylesheet.calendar.header": {
      week: {
        marginTop: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 12,
      },
      dayTextAtIndex0: { color: "#FF6B6B" }, // 일요일
      dayTextAtIndex6: { color: "#4DABF7" }, // 토요일
    },
    "stylesheet.day.basic": {
      base: {
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
      },
      text: {
        marginTop: 4,
        fontSize: 16,
        fontFamily: "System",
        fontWeight: "400",
        color: theme.colors.text,
      },
      today: {
        backgroundColor: "transparent",
      },
      todayText: {
        color: teamColor,
        fontWeight: "600",
      },
      selected: {
        backgroundColor: teamColor,
        borderRadius: 16,
      },
      selectedText: {
        color: "#ffffff",
        fontWeight: "600",
      },
      disabled: {
        backgroundColor: "transparent",
      },
      disabledText: {
        color: theme.colors.textDim,
      },
    },
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={themed($modalOverlay)}>
        <View style={themed($modalContent)}>
          {/* 모달 헤더 */}
          <View style={themed($modalHeader)}>
            <View style={themed($headerLeft)}>
              <Text style={themed($modalTitle)}>
                {teamName ? `${teamName} 팬이 된 날` : "팬이 된 날 선택"}
              </Text>
              <Text style={themed($modalSubtitle)}>
                언제부터 이 팀을 좋아하게 되셨나요?
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={themed($closeButton)}>
              <Ionicons name="close" color={theme.colors.text} size={24} />
            </TouchableOpacity>
          </View>

          {/* 빠른 선택 버튼들 */}
          <View style={themed($quickActions)}>
            <TouchableOpacity
              style={[themed($quickButton), { borderColor: teamColor }]}
              onPress={handleSetToday}
            >
              <Ionicons name="today" color={teamColor} size={16} />
              <Text style={[themed($quickButtonText), { color: teamColor }]}>
                오늘
              </Text>
            </TouchableOpacity>

            {tempSelectedDate && (
              <TouchableOpacity
                style={themed($clearQuickButton)}
                onPress={handleClearDate}
              >
                <Ionicons
                  name="close-circle"
                  color={theme.colors.textDim}
                  size={16}
                />
                <Text style={themed($clearQuickButtonText)}>선택 해제</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 캘린더 */}
          <View style={themed($calendarContainer)}>
            <Calendar
              onDayPress={handleDayPress}
              markedDates={{
                [tempSelectedDate]: {
                  selected: true,
                  selectedColor: teamColor,
                  selectedTextColor: "#ffffff",
                },
              }}
              theme={calendarTheme}
              maxDate={new Date().toISOString().split("T")[0]} // 오늘까지만 선택 가능
              monthFormat={"yyyy년 M월"}
              hideExtraDays={true}
              firstDay={0} // 일요일부터 시작
              enableSwipeMonths={true}
              style={themed($calendar)}
            />
          </View>

          {/* 선택된 날짜 표시 */}
          {tempSelectedDate && (
            <View style={themed($selectedDateInfo)}>
              <View
                style={[
                  themed($selectedDateBadge),
                  { backgroundColor: teamColor + "20" },
                ]}
              >
                <Ionicons name="heart" color={teamColor} size={16} />
                <Text style={[themed($selectedDateText), { color: teamColor }]}>
                  {new Date(tempSelectedDate).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}
                </Text>
              </View>
            </View>
          )}

          {/* 액션 버튼들 */}
          <View style={themed($actionButtons)}>
            <TouchableOpacity
              style={themed($cancelButton)}
              onPress={handleCancel}
            >
              <Text style={themed($cancelButtonText)}>취소</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                themed($confirmButton),
                { backgroundColor: teamColor },
                !tempSelectedDate && themed($disabledConfirmButton),
              ]}
              onPress={handleConfirm}
              disabled={!tempSelectedDate}
            >
              <Text style={themed($confirmButtonText)}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// --- 스타일 정의 ---
const $modalOverlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  justifyContent: "center",
  alignItems: "center",
});

const $modalContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderRadius: 20,
  padding: spacing.lg,
  width: "95%",
  maxWidth: 420,
  maxHeight: "85%",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 12,
  elevation: 8,
});

const $modalHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: spacing.lg,
});

const $headerLeft: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $modalTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 20,
  fontWeight: "bold",
  color: colors.text,
  marginBottom: 4,
});

const $modalSubtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
});

const $closeButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
  marginLeft: spacing.sm,
});

const $quickActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
  marginBottom: spacing.lg,
});

const $quickButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderWidth: 1,
  borderRadius: 20,
  backgroundColor: "transparent",
});

const $quickButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
  fontWeight: "500",
});

const $clearQuickButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 20,
  backgroundColor: "transparent",
});

const $clearQuickButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "500",
  color: colors.textDim,
});

const $calendarContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 12,
  overflow: "hidden",
  backgroundColor: colors.card,
  marginBottom: spacing.lg,
});

const $calendar: ThemedStyle<ViewStyle> = () => ({
  paddingBottom: 8,
});

const $selectedDateInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  marginBottom: spacing.lg,
});

const $selectedDateBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 20,
});

const $selectedDateText: ThemedStyle<TextStyle> = () => ({
  fontSize: 16,
  fontWeight: "600",
});

const $actionButtons: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.md,
});

const $cancelButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.lg,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: "transparent",
  alignItems: "center",
});

const $cancelButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
});

const $confirmButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.lg,
  borderRadius: 12,
  alignItems: "center",
});

const $disabledConfirmButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.textDim,
  opacity: 0.5,
});

const $confirmButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 16,
  fontWeight: "600",
  color: "#ffffff",
});
