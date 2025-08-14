import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

interface FavoriteMonthPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (isoDate: string) => void; // YYYY-MM-01
  selectedDate?: string; // ISO date string
  teamName?: string;
  teamColor?: string;
}

/**
 * 연/월 전용 선택 모달
 * - 상단 연도 내비게이션, 12개월 그리드
 * - 오늘 기준 다음 달까지만 선택 가능 (그 이후는 비활성화)
 * - 선택 시 즉시 YYYY-MM-01 형태로 콜백 호출
 */
export default function FavoriteMonthPicker({
  visible,
  onClose,
  onSelect,
  selectedDate,
  teamName,
  teamColor = "#FF0000",
}: FavoriteMonthPickerProps) {
  const { themed, theme } = useAppTheme();

  const [year, setYear] = useState<number>(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      if (!Number.isNaN(d.getTime())) return d.getFullYear();
    }
    return new Date().getFullYear();
  });

  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      if (!Number.isNaN(d.getTime())) {
        setYear(d.getFullYear());
      }
    }
  }, [selectedDate]);

  // 최대 선택 가능 월: 오늘 기준 다음 달(YYYY-MM)
  const maxSelectable = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth(); // 0-based
    const nextMonth = new Date(y, m + 1, 1); // 다음 달 1일
    return { year: nextMonth.getFullYear(), month: nextMonth.getMonth() };
  }, []);

  // 선택된 월(선택값이 현재 year에 해당하면 활성 표시)
  const selectedYM = useMemo(() => {
    if (!selectedDate) return null;
    const d = new Date(selectedDate);
    if (Number.isNaN(d.getTime())) return null;
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [selectedDate]);

  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const isMonthDisabled = (y: number, m: number) => {
    if (y > maxSelectable.year) return true;
    if (y === maxSelectable.year && m > maxSelectable.month) return true;
    return false;
  };

  const handlePressMonth = (m: number) => {
    if (isMonthDisabled(year, m)) return;
    const iso = `${year}-${String(m + 1).padStart(2, "0")}-01`;
    onSelect(iso);
    onClose();
  };

  const canGoNextYear = year < maxSelectable.year;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={themed($overlay)}>
        <View style={themed($content)}>
          {/* 헤더: 연도 내비게이션 */}
          <View style={themed($header)}>
            <TouchableOpacity
              style={themed($navButton)}
              onPress={() => setYear((y) => y - 1)}
              accessibilityLabel="prev year"
            >
              <Ionicons name="play-back" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={themed($yearText)}>{year}</Text>
            <TouchableOpacity
              style={[
                themed($navButton),
                !canGoNextYear && themed($navButtonDisabled),
              ]}
              onPress={() => canGoNextYear && setYear((y) => y + 1)}
              disabled={!canGoNextYear}
              accessibilityLabel="next year"
            >
              <Ionicons
                name="play-forward"
                size={20}
                color={canGoNextYear ? theme.colors.text : theme.colors.textDim}
              />
            </TouchableOpacity>
          </View>

          {/* 타이틀 */}
          <View style={themed($titleRow)}>
            <Text style={themed($titleText)}>
              {teamName ? `${teamName} 팬이 된 월` : "팬이 된 월 선택"}
            </Text>
            <TouchableOpacity onPress={onClose} style={themed($closeBtn)}>
              <Ionicons name="close" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* 12개월 그리드 */}
          <View style={themed($grid)}>
            {monthLabels.map((label, idx) => {
              const disabled = isMonthDisabled(year, idx);
              const isSelected =
                selectedYM &&
                selectedYM.year === year &&
                selectedYM.month === idx;
              return (
                <TouchableOpacity
                  key={label}
                  style={[
                    themed($monthCell),
                    isSelected && [
                      themed($monthCellSelected),
                      { borderColor: teamColor },
                    ],
                    disabled && themed($monthCellDisabled),
                  ]}
                  onPress={() => handlePressMonth(idx)}
                  disabled={disabled}
                  activeOpacity={0.8}
                >
                  <View style={{ alignItems: "center" }}>
                    <Text
                      style={[
                        themed($monthText),
                        isSelected && { color: teamColor },
                        disabled && themed($monthTextDisabled),
                      ]}
                    >
                      {label}
                    </Text>
                    <Text
                      style={[
                        themed($monthNumberText),
                        isSelected && { color: teamColor },
                        disabled && themed($monthTextDisabled),
                      ]}
                    >
                      ({idx + 1})
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// --- 스타일 ---
const $overlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.6)",
  justifyContent: "center",
  alignItems: "center",
});

const $content: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: "95%",
  maxWidth: 420,
  borderRadius: 16,
  backgroundColor: colors.background,
  padding: spacing.lg,
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: colors.tint + "20",
  borderRadius: 10,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  marginBottom: spacing.md,
});

const $navButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $navButtonDisabled: ThemedStyle<ViewStyle> = () => ({
  opacity: 0.5,
});

const $yearText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 20,
  fontWeight: "700",
});

const $titleRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: spacing.md,
});

const $titleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 16,
  fontWeight: "600",
});

const $closeBtn: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $grid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  rowGap: spacing.md,
  columnGap: spacing.md,
  justifyContent: "space-between",
});

const $monthCell: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: "23%",
  aspectRatio: 1,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.card,
  alignItems: "center",
  justifyContent: "center",
});

const $monthCellSelected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.card,
  borderWidth: 2,
});

const $monthCellDisabled: ThemedStyle<ViewStyle> = () => ({
  opacity: 0.5,
});

const $monthText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "700",
  color: colors.text,
});

const $monthTextDisabled: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
});

const $monthNumberText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  fontWeight: "500",
  color: colors.textDim,
  marginTop: 2,
});
