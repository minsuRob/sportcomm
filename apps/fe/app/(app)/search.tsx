import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Search as SearchIcon } from "lucide-react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

/**
 * 검색 화면 컴포넌트
 * 사용자가 게시물이나 사용자를 검색할 수 있는 기능을 제공합니다
 */
export default function SearchScreen() {
  const { themed, theme } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    // TODO: 검색 로직 구현
    console.log("검색어:", searchQuery);
  };

  return (
    <View style={themed($container)}>
      {/* 검색 헤더 */}
      <View style={themed($header)}>
        <Text style={themed($headerTitle)}>검색</Text>
      </View>

      {/* 검색 입력 영역 */}
      <View style={themed($searchContainer)}>
        <View style={themed($searchInputContainer)}>
          <SearchIcon color={theme.colors.textDim} size={20} />
          <TextInput
            style={themed($searchInput)}
            placeholder="게시물이나 사용자를 검색하세요"
            placeholderTextColor={theme.colors.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
        </View>
        <TouchableOpacity style={themed($searchButton)} onPress={handleSearch}>
          <Text style={themed($searchButtonText)}>검색</Text>
        </TouchableOpacity>
      </View>

      {/* 검색 결과 영역 */}
      <View style={themed($resultsContainer)}>
        <Text style={themed($placeholderText)}>
          검색어를 입력하여 게시물이나 사용자를 찾아보세요
        </Text>
      </View>
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 24,
  fontWeight: "bold",
  color: colors.text,
});

const $searchContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
  flexDirection: "row",
  alignItems: "center",
});

const $searchInputContainer: ThemedStyle<ViewStyle> = ({
  colors,
  spacing,
}) => ({
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.separator,
  borderRadius: 8,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  marginRight: spacing.sm,
});

const $searchInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  flex: 1,
  marginLeft: spacing.sm,
  fontSize: 16,
  color: colors.text,
});

const $searchButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 8,
});

const $searchButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontWeight: "600",
});

const $resultsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  padding: spacing.md,
  justifyContent: "center",
  alignItems: "center",
});

const $placeholderText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.textDim,
  textAlign: "center",
});
