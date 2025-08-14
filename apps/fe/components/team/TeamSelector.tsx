import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  TextStyle,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import TeamLogo from "@/components/TeamLogo";
import { GET_ADMIN_TEAMS } from "@/lib/graphql/admin";

// 팀 정보 타입
interface Team {
  id: string;
  name: string;
  color: string;
  icon: string;
  logoUrl?: string;
}

// 컴포넌트 Props 타입
interface TeamSelectorProps {
  selectedTeamId?: string;
  onTeamSelect: (teamId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  showClearButton?: boolean;
}

/**
 * 팀 선택 컴포넌트
 *
 * 관리자가 채팅방 생성/수정 시 팀을 선택할 수 있는 드롭다운 컴포넌트입니다.
 * 팀 선택 시 해당 팀을 좋아하게 된 날짜도 함께 선택할 수 있습니다.
 */
export default function TeamSelector({
  selectedTeamId,
  onTeamSelect,
  placeholder = "팀 선택 (선택사항)",
  disabled = false,
  showClearButton = true,
}: TeamSelectorProps) {
  const { themed, theme } = useAppTheme();
  const [showModal, setShowModal] = useState(false);

  // 팀 목록 조회
  const { data: teamsData, loading: teamsLoading } = useQuery(GET_ADMIN_TEAMS, {
    fetchPolicy: "cache-and-network",
  });

  const teams = teamsData?.adminGetAllTeams || [];
  const selectedTeam = teams.find((team: Team) => team.id === selectedTeamId);

  /**
   * 팀 선택 핸들러
   */
  const handleTeamSelect = (teamId: string) => {
    onTeamSelect(teamId);
    setShowModal(false);
  };

  /**
   * 팀 선택 해제 핸들러
   */
  const handleClearSelection = () => {
    onTeamSelect(null);
  };

  /**
   * 팀 목록 아이템 렌더링
   */
  const renderTeamItem = ({ item }: { item: Team }) => (
    <TouchableOpacity
      style={[
        themed($teamItem),
        {
          backgroundColor:
            item.id === selectedTeamId ? item.color + "20" : theme.colors.card,
          borderColor:
            item.id === selectedTeamId ? item.color : theme.colors.border,
        },
      ]}
      onPress={() => handleTeamSelect(item.id)}
    >
      <View style={themed($teamItemContent)}>
        <TeamLogo
          logoUrl={item.logoUrl}
          fallbackIcon={item.icon}
          teamName={item.name}
          size={32}
        />
        <Text
          style={[
            themed($teamItemName),
            {
              color:
                item.id === selectedTeamId ? item.color : theme.colors.text,
            },
          ]}
        >
          {item.name}
        </Text>
        {item.id === selectedTeamId && (
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={item.color}
            style={themed($selectedIcon)}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      {/* 팀 선택 버튼 */}
      <View style={themed($container)}>
        <TouchableOpacity
          style={[themed($selectButton), disabled && themed($disabledButton)]}
          onPress={() => !disabled && setShowModal(true)}
          disabled={disabled}
        >
          <View style={themed($selectButtonContent)}>
            {selectedTeam ? (
              <>
                <TeamLogo
                  logoUrl={selectedTeam.logoUrl}
                  fallbackIcon={selectedTeam.icon}
                  teamName={selectedTeam.name}
                  size={24}
                />
                <View style={themed($teamInfo)}>
                  <Text
                    style={[
                      themed($selectButtonText),
                      { color: selectedTeam.color },
                    ]}
                  >
                    {selectedTeam.name}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={themed($placeholderText)}>{placeholder}</Text>
            )}
          </View>

          <View style={themed($selectButtonActions)}>
            {selectedTeam && showClearButton && !disabled && (
              <TouchableOpacity
                style={themed($clearButton)}
                onPress={handleClearSelection}
              >
                <Ionicons name="close" color={theme.colors.textDim} size={16} />
              </TouchableOpacity>
            )}
            <Ionicons
              name="chevron-down"
              color={disabled ? theme.colors.textDim : theme.colors.text}
              size={16}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* 팀 선택 모달 */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={themed($modalOverlay)}>
          <View style={themed($modalContent)}>
            {/* 모달 헤더 */}
            <View style={themed($modalHeader)}>
              <Text style={themed($modalTitle)}>팀 선택</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" color={theme.colors.text} size={24} />
              </TouchableOpacity>
            </View>

            {/* 공용 채팅방 옵션 */}
            <TouchableOpacity
              style={[
                themed($teamItem),
                {
                  backgroundColor: !selectedTeamId
                    ? theme.colors.tint + "20"
                    : theme.colors.card,
                  borderColor: !selectedTeamId
                    ? theme.colors.tint
                    : theme.colors.border,
                },
              ]}
              onPress={() => {
                onTeamSelect(null);
                setShowModal(false);
              }}
            >
              <View style={themed($teamItemContent)}>
                <View style={themed($publicChatIcon)}>
                  <Ionicons
                    name="globe-outline"
                    size={24}
                    color={theme.colors.tint}
                  />
                </View>
                <Text
                  style={[
                    themed($teamItemName),
                    {
                      color: !selectedTeamId
                        ? theme.colors.tint
                        : theme.colors.text,
                    },
                  ]}
                >
                  공용 채팅방 (팀 없음)
                </Text>
                {!selectedTeamId && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={theme.colors.tint}
                    style={themed($selectedIcon)}
                  />
                )}
              </View>
            </TouchableOpacity>

            {/* 팀 목록 */}
            {teamsLoading ? (
              <View style={themed($loadingContainer)}>
                <ActivityIndicator size="large" color={theme.colors.tint} />
                <Text style={themed($loadingText)}>팀 목록 로딩 중...</Text>
              </View>
            ) : (
              <FlatList
                data={teams}
                renderItem={renderTeamItem}
                keyExtractor={(item) => item.id}
                style={themed($teamList)}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => (
                  <View style={themed($separator)} />
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = () => ({
  width: "100%",
});

const $selectButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  padding: spacing.md,
  backgroundColor: colors.card,
  minHeight: 48,
});

const $disabledButton: ThemedStyle<ViewStyle> = () => ({
  opacity: 0.5,
});

const $selectButtonContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
});

const $selectButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 16,
  fontWeight: "500",
});

const $placeholderText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.textDim,
});

const $selectButtonActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
});

const $clearButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  padding: spacing.xs,
  borderRadius: 4,
  backgroundColor: colors.border + "40",
});

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
  maxHeight: "70%",
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

const $teamList: ThemedStyle<ViewStyle> = () => ({
  maxHeight: 300,
});

const $teamItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  borderWidth: 1,
  borderRadius: 8,
  padding: spacing.md,
});

const $teamItemContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
});

const $teamItemName: ThemedStyle<TextStyle> = () => ({
  flex: 1,
  fontSize: 16,
  fontWeight: "500",
});

const $selectedIcon: ThemedStyle<any> = () => ({
  marginLeft: "auto",
});

const $publicChatIcon: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: "transparent",
  justifyContent: "center",
  alignItems: "center",
});

const $separator: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  height: spacing.sm,
});

const $loadingContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  paddingVertical: spacing.xl,
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.sm,
  fontSize: 14,
  color: colors.textDim,
});

const $teamInfo: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $favoriteDateText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  marginTop: 2,
});
