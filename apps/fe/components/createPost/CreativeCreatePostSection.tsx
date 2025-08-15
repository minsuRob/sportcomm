import React, { useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
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

export interface CreativeCreatePostSectionProps {
  teamOptions: TeamOption[];
  teamsLoading: boolean;
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string) => void;
  title: string;
  setTitle: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
  isSubmitting: boolean;
  onPickMedia: () => void;
  selectedCount: number;
}

export default function CreativeCreatePostSection(
  props: CreativeCreatePostSectionProps
) {
  const { themed, theme } = useAppTheme();
  const { t } = useTranslation();
  const {
    teamOptions,
    teamsLoading,
    selectedTeamId,
    onSelectTeam,
    title,
    setTitle,
    content,
    setContent,
    isSubmitting,
    onPickMedia,
    selectedCount,
  } = props;

  const titleInputRef = useRef<TextInput>(null);
  const contentInputRef = useRef<TextInput>(null);

  return (
    <View style={{ gap: 12 }}>
      {/* STEP 1 */}
      <View style={themed($stepSection)}>
        <TouchableOpacity style={themed($stepHeader)} activeOpacity={0.9}>
          <View style={themed($stepNumber)}>
            <Text style={themed($stepNumberText)}>1</Text>
          </View>
          <Text style={themed($stepTitle)}>응원할 팀 선택</Text>
        </TouchableOpacity>
        <View style={themed($stepBody)}>
          {teamsLoading ? (
            <Text style={themed($muted)}>팀 목록을 불러오는 중...</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
            </ScrollView>
          )}
        </View>
      </View>

      {/* STEP 2 */}
      <View style={themed($stepSection)}>
        <TouchableOpacity style={themed($stepHeader)} activeOpacity={0.9}>
          <View style={themed($stepNumber)}>
            <Text style={themed($stepNumberText)}>2</Text>
          </View>
          <Text style={themed($stepTitle)}>제목과 내용</Text>
        </TouchableOpacity>
        <View style={themed($stepBody)}>
          <TextInput
            ref={titleInputRef}
            style={themed($inputLg)}
            placeholder="제목"
            placeholderTextColor={theme.colors.textDim}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
            editable={!isSubmitting}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => contentInputRef.current?.focus()}
          />
          <TextInput
            ref={contentInputRef}
            style={[themed($inputLg), { minHeight: 160 }]}
            placeholder={t(TRANSLATION_KEYS.CREATE_POST_PLACEHOLDER)}
            placeholderTextColor={theme.colors.textDim}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            maxLength={10000}
            editable={!isSubmitting}
            returnKeyType="done"
            blurOnSubmit={true}
          />
          <Text style={themed($muted)}>
            제목 {title.length}/200 · 내용 {content.length}/10000
          </Text>
        </View>
      </View>

      {/* STEP 3 */}
      <View style={themed($stepSection)}>
        <TouchableOpacity style={themed($stepHeader)} activeOpacity={0.9}>
          <View style={themed($stepNumber)}>
            <Text style={themed($stepNumberText)}>3</Text>
          </View>
          <Text style={themed($stepTitle)}>미디어 추가</Text>
        </TouchableOpacity>
        <View style={themed($stepBody)}>
          <TouchableOpacity
            style={themed($uploadBtn)}
            onPress={onPickMedia}
            disabled={isSubmitting || selectedCount >= 4}
          >
            <Ionicons name="add" color={theme.colors.tint} size={18} />
            <Text style={themed($uploadBtnText)}>
              미디어 추가 ({selectedCount}/4)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// --- 스타일 ---
const $stepSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 16,
  marginHorizontal: spacing.md,
  marginTop: spacing.md,
  backgroundColor: colors.card,
});

const $stepHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
});

const $stepNumber: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: colors.tint,
  alignItems: "center",
  justifyContent: "center",
});

const $stepNumberText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontWeight: "700",
});

const $stepTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontWeight: "700",
});

const $stepBody: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.md,
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
  marginTop: spacing.xs,
});

const $muted: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 12,
  marginTop: 4,
});

const $chipRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.xs,
  paddingVertical: spacing.xs,
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

const $uploadBtn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 2,
  borderColor: colors.tint,
  borderRadius: 12,
  paddingVertical: spacing.md,
  backgroundColor: colors.tint + "10",
  marginTop: spacing.sm,
  gap: spacing.xs,
});

const $uploadBtnText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontWeight: "600",
});
