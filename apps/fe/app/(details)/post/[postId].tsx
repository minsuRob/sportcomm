import React from "react";
import { useLocalSearchParams } from "expo-router";
import { PostDetailContent } from "@/components/posts/PostDetailContent";

/**
 * 게시물 상세 페이지 (URL 직접 접근 전용)
 * - 핵심 UI/로직은 PostDetailContent 로 이전
 * - 페이지 형태 전용 wrapper 로 최소 책임만 유지
 * - 모달/페이지 공용 구조 확립으로 유지보수성 향상
 */
export default function PostDetailPage() {
  const { postId } = useLocalSearchParams<{ postId: string }>();

  if (!postId) {
    // 잘못된 접근 (postId 없음) -> 빈 화면 혹은 향후 전용 에러 컴포넌트 교체 가능
    return null;
  }

  return (
    <PostDetailContent
      postId={postId}
      variant="page"
      onPostUpdated={async () => {
        // 필요 시: 페이지 버전 캐시 무효화, 로깅 등 후처리 hook 삽입 가능
      }}
    />
  );
}
