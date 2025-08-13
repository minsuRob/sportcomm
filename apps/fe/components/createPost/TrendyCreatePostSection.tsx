import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";

type TeamOption = {
  teamId: string;
  label: string;
  color: string;
  icon: string;
  sportName: string;
};

export interface TrendyCreatePostSectionProps {
  teamOptions: TeamOption[];
  teamsLoading: boolean;
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string) => void;
  onGoTeamSelection: () => void;
  title: string;
  setTitle: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
  isSubmitting: boolean;
  onPickMedia: () => void;
  selectedCount: number;
}

export default function TrendyCreatePostSection(
  props: TrendyCreatePostSectionProps
) {
  const { themed, theme } = useAppTheme();
  const { t } = useTranslation();
  const {
    teamOptions,
    teamsLoading,
    selectedTeamId,
    onSelectTeam,
    onGoTeamSelection,
    title,
    setTitle,
    content,
    setContent,
    isSubmitting,
    onPickMedia,
    selectedCount,
  } = props;

  return (
    <View style={themed($cardContainer)}>
      {/* 팀 선택 - 칩 UI */}
      <Text style={themed($sectionTitle)}>응원할 팀 선택</Text>
      {teamsLoading ? (
        <Text style={themed($loadingText)}>팀 목록을 불러오는 중...</Text>
      ) : teamOptions.length > 0 ? (
        <View style={themed($chipRow)}>
          {teamOptions.map((option) => {
            const selected = selectedTeamId === option.teamId;
            return (
              <TouchableOpacity
                key={option.teamId}
                onPress={() => onSelectTeam(option.teamId)}
                style={[
                  themed($chip),
                  selected && [
                    { borderColor: option.color },
                    themed($chipSelected),
                  ],
                ]}
              >
                <Text
                  style={[
                    themed($chipText),
                    selected && { color: option.color },
                  ]}
                >
                  {option.icon} {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={themed($emptyTeams)}>
          <Text style={themed($emptyText)}>응원할 팀을 먼저 선택해주세요</Text>
          <TouchableOpacity
            style={themed($primaryBtn)}
            onPress={onGoTeamSelection}
          >
            <Ionicons name="heart" color="white" size={16} />
            <Text style={themed($primaryBtnText)}>팀 선택하기</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 제목 */}
      <Text style={themed($sectionTitle)}>제목</Text>
      <TextInput
        style={themed($inputLg)}
        placeholder="한 줄로 핵심을 드러내 보세요"
        placeholderTextColor={theme.colors.textDim}
        value={title}
        onChangeText={setTitle}
        maxLength={200}
        editable={!isSubmitting}
      />
      <Text style={themed($hintText)}>{title.length}/200</Text>

      {/* 내용 */}
      <Text style={themed($sectionTitle)}>내용</Text>
      <TextInput
        style={[themed($inputLg), { minHeight: 160 }]}
        placeholder={t(TRANSLATION_KEYS.CREATE_POST_PLACEHOLDER)}
        placeholderTextColor={theme.colors.textDim}
        value={content}
        onChangeText={setContent}
        multiline
        textAlignVertical="top"
        maxLength={10000}
        editable={!isSubmitting}
      />
      <Text style={themed($hintText)}>{content.length}/10000</Text>

      {/* 업로드 */}
      <TouchableOpacity
        style={[themed($uploadBtn)]}
        onPress={onPickMedia}
        disabled={isSubmitting || selectedCount >= 4}
        activeOpacity={0.85}
      >
        <Ionicons name="images-outline" color={theme.colors.tint} size={18} />
        <Text style={themed($uploadBtnText)}>
          미디어 추가 ({selectedCount}/4)
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// --- 스타일 ---
const $cardContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 16,
  marginHorizontal: spacing.md,
  marginTop: spacing.md,
  padding: spacing.md,
});

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.sm,
});

const $chipRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
});

const $chip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 999,
  backgroundColor: colors.backgroundAlt,
});

const $chipSelected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint + "15",
});

const $chipText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 12,
  fontWeight: "600",
});

const $emptyTeams: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  gap: spacing.xs,
});

const $emptyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
});

const $primaryBtn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 20,
  gap: spacing.xs,
});

const $primaryBtnText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontWeight: "600",
});

const $inputLg: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  color: colors.text,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.background,
});

const $hintText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 12,
  marginTop: 4,
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
});

const $uploadBtn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 2,
  borderColor: colors.tint,
  borderRadius: 12,
  paddingVertical: spacing.md,
  backgroundColor: colors.tint + "10",
  marginTop: spacing.md,
  gap: spacing.xs,
});

const $uploadBtnText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontWeight: "600",
});
