import React from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import { SearchTabType } from "./SearchTabs";
import PostItem from "../posts/PostItem"; // 게시물 아이템 컴포넌트 가정
import UserItem from "../users/UserItem"; // 사용자 아이템 컴포넌트 가정
import type { ThemedStyle } from "@/lib/theme/types";

/**
 * 검색 결과 아이템 타입
 */
export type SearchResultItem = {
  id: string;
  type: "post" | "user";
  // 실제 데이터는 타입에 따라 다름
  data: any;
};

/**
 * 검색 결과 컴포넌트 속성 타입 정의
 */
interface SearchResultsProps {
  /**
   * 현재 선택된 탭
   */
  activeTab: SearchTabType;

  /**
   * 검색 결과 목록
   */
  results: SearchResultItem[];

  /**
   * 로딩 상태
   */
  isLoading: boolean;

  /**
   * 결과가 더 있는지 여부
   */
  hasMore: boolean;

  /**
   * 더 불러오기 함수
   */
  loadMore: () => void;

  /**
   * 검색어
   */
  searchQuery: string;

  /**
   * 태그 클릭 시 호출되는 함수
   */
  onTagPress?: (tagName: string) => void;
}

/**
 * 검색 결과 컴포넌트
 * 검색 결과를 탭에 따라 다르게 표시합니다.
 */
export default function SearchResults({
  activeTab,
  results,
  isLoading,
  hasMore,
  loadMore,
  searchQuery,
  onTagPress,
}: SearchResultsProps) {
  const { themed } = useAppTheme();

  // 검색어가 없는 경우
  if (!searchQuery.trim()) {
    return (
      <View style={themed($emptyContainer)}>
        <Text style={themed($placeholderText)}>
          검색어를 입력하여 게시물이나 사용자를 찾아보세요
        </Text>
      </View>
    );
  }

  // 로딩 중인 경우
  if (isLoading && results.length === 0) {
    return (
      <View style={themed($loadingContainer)}>
        <ActivityIndicator
          size="large"
          color={themed($loadingIndicator).color}
        />
        <Text style={themed($loadingText)}>검색 중...</Text>
      </View>
    );
  }

  // 결과가 없는 경우
  if (!isLoading && results.length === 0) {
    return (
      <View style={themed($emptyContainer)}>
        <Text style={themed($placeholderText)}>
          "{searchQuery}"에 대한 검색 결과가 없습니다
        </Text>
      </View>
    );
  }

  /**
   * 각 아이템 렌더링 함수
   * 아이템 타입에 따라 다른 컴포넌트를 렌더링합니다.
   */
  const renderItem = ({ item }: { item: SearchResultItem }) => {
    if (item.type === "post") {
      return <PostItem post={item.data} onTagPress={onTagPress} />;
    } else if (item.type === "user") {
      return <UserItem user={item.data} />;
    }
    return null;
  };

  /**
   * 리스트 끝에 도달했을 때 호출되는 함수
   * 더 많은 결과를 불러옵니다.
   */
  const handleEndReached = () => {
    if (!isLoading && hasMore) {
      loadMore();
    }
  };

  /**
   * 푸터 렌더링 함수
   * 더 불러오는 중인 경우 로딩 표시기를 렌더링합니다.
   */
  const renderFooter = () => {
    if (!isLoading) return null;
    return (
      <View style={themed($footerContainer)}>
        <ActivityIndicator
          size="small"
          color={themed($loadingIndicator).color}
        />
      </View>
    );
  };

  return (
    <FlatList
      data={results}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={themed($listContentContainer)}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
    />
  );
}

// --- 스타일 정의 ---
const $listContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
});

const $emptyContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: 20,
});

const $placeholderText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  textAlign: "center",
  fontSize: 16,
  lineHeight: 22,
});

const $loadingContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  marginTop: 10,
  color: colors.textDim,
  fontSize: 14,
});

const $loadingIndicator = { color: "#3498db" };

const $footerContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.md,
  alignItems: "center",
});
