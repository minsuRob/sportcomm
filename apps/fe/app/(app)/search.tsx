import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import SearchTabs, { SearchTabType } from "@/components/search/SearchTabs";
import SearchResults, {
  SearchResultItem,
} from "@/components/search/SearchResults";
import { searchApi, getPopularSearchTerms } from "@/lib/api/search";
import { debounce } from "lodash";

import { useLocalSearchParams } from "expo-router";
// WebCenteredLayout 제거 - 전역 레이아웃 사용

/**
 * 검색 화면 컴포넌트
 * 사용자가 게시물이나 사용자를 검색할 수 있는 인기/최근/프로필 탭 기능을 제공합니다.
 */
export default function SearchScreen() {
  const { themed, theme } = useAppTheme();
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTabType>("popular");

  // 검색 결과 상태
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [popularTerms, setPopularTerms] = useState<string[]>([]);

  // 디바운스된 검색 함수 생성
  const debouncedSearch = useCallback(
    debounce(async (query: string, tab: SearchTabType, page: number) => {
      if (!query.trim()) {
        setResults([]);
        setHasMore(false);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await searchApi(
          {
            query,
            page,
            pageSize: 10,
          },
          tab,
        );

        const newResults =
          page === 0 ? response.items : [...results, ...response.items];
        setResults(newResults);
        setHasMore(response.metadata.hasNextPage);
        setCurrentPage(page);
      } catch (error) {
        console.error("검색 중 오류 발생:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [results],
  );

  /**
   * 검색 실행 함수
   */
  const handleSearch = () => {
    // 페이지 초기화하고 검색 실행
    setCurrentPage(0);
    debouncedSearch(searchQuery, activeTab, 0);
  };

  /**
   * 더 많은 결과 불러오기
   */
  const loadMore = () => {
    if (hasMore && !isLoading) {
      debouncedSearch(searchQuery, activeTab, currentPage + 1);
    }
  };

  /**
   * 탭 변경 핸들러
   */
  const handleTabChange = (tab: SearchTabType) => {
    setActiveTab(tab);
    setCurrentPage(0);
    if (searchQuery.trim()) {
      debouncedSearch(searchQuery, tab, 0);
    }
  };

  /**
   * 인기 검색어 불러오기
   */
  const fetchPopularTerms = async () => {
    try {
      const terms = await getPopularSearchTerms(10);
      setPopularTerms(terms);
    } catch (error) {
      console.error("인기 검색어 불러오기 실패:", error);
    }
  };

  // 컴포넌트 마운트 시 인기 검색어 불러오기
  useEffect(() => {
    fetchPopularTerms();
  }, []);

  // URL 파라미터에서 검색어 가져오기 및 자동 검색
  useEffect(() => {
    if (params.query && typeof params.query === "string") {
      setSearchQuery(params.query);
      // 자동 검색이 활성화된 경우 즉시 검색 실행
      if (params.autoSearch === "true") {
        setCurrentPage(0);
        debouncedSearch(params.query, activeTab, 0);
      }
    }
  }, [params.query, params.autoSearch]);

  // 검색어가 변경되면 자동 검색 실행
  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch();
    }
  }, [searchQuery]);

  return (
    <View style={themed($container)}>
      {/* 검색 헤더 - 전체 너비 사용 */}
      <View style={themed($header)}>
        <Text style={themed($headerTitle)}>검색</Text>
      </View>

      {/* 검색 입력 영역 - 전체 너비 사용 */}
      <View style={themed($searchContainer)}>
        <View style={themed($searchInputContainer)}>
          <Ionicons name="search" color={theme.colors.textDim} size={20} />
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

      {/* 검색 탭 - 전체 너비 사용 */}
      <SearchTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* 일반 검색 결과 영역 */}
      {!searchQuery.trim() && popularTerms.length > 0 ? (
        <View style={themed($popularTermsContainer)}>
          <Text style={themed($sectionTitle)}>인기 검색어</Text>
          <View style={themed($termsContainer)}>
            {popularTerms.map((term, index) => (
              <TouchableOpacity
                key={index}
                style={themed($termItem)}
                onPress={() => setSearchQuery(term)}
              >
                <Text style={themed($termText)}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <SearchResults
          activeTab={activeTab}
          results={results}
          isLoading={isLoading}
          hasMore={hasMore}
          loadMore={loadMore}
          searchQuery={searchQuery}
          onTagPress={(tagName) => setSearchQuery(`#${tagName}`)}
        />
      )}
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

const $popularTermsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
  flex: 1,
});

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "600",
  color: colors.text,
  marginBottom: 12,
});

const $termsContainer: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  flexWrap: "wrap",
});

const $termItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.separator,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 16,
  marginRight: 8,
  marginBottom: 8,
});

const $termText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 14,
});
