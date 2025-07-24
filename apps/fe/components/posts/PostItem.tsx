import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";
import { Heart, MessageCircle, Eye } from "lucide-react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

/**
 * 게시물 타입 정의
 */
export interface PostItemType {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
  createdAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  type: string;
  mediaUrl?: string;
  isLiked?: boolean;
}

/**
 * 게시물 아이템 컴포넌트 속성 타입 정의
 */
interface PostItemProps {
  /**
   * 게시물 데이터
   */
  post: PostItemType;

  /**
   * 클릭 이벤트 핸들러 (선택 사항)
   */
  onPress?: (post: PostItemType) => void;
}

/**
 * 게시물 아이템 컴포넌트
 * 검색 결과나 피드에서 게시물을 표시하는 데 사용됩니다.
 */
export default function PostItem({ post, onPress }: PostItemProps) {
  const { themed, theme } = useAppTheme();

  /**
   * 게시물 선택 핸들러
   */
  const handlePress = () => {
    if (onPress) {
      onPress(post);
    }
  };

  /**
   * 작성 날짜 포맷팅
   */
  const formattedDate = new Date(post.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  /**
   * 게시물 내용 요약
   */
  const contentSummary = post.content.length > 100
    ? `${post.content.substring(0, 100)}...`
    : post.content;

  return (
    <TouchableOpacity
      style={themed($container)}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={themed($header)}>
        {/* 작성자 프로필 이미지 */}
        <Image
          source={{
            uri: post.author.profileImageUrl || 'https://via.placeholder.com/40'
          }}
          style={themed($profileImage)}
        />

        <View style={styles.headerTextContainer}>
          {/* 작성자 닉네임 */}
          <Text style={themed($authorName)}>{post.author.nickname}</Text>
          {/* 작성 시간 */}
          <Text style={themed($timestamp)}>{formattedDate}</Text>
        </View>

        {/* 게시물 유형 */}
        <View style={themed($typeTag)}>
          <Text style={themed($typeText)}>
            {post.type === 'ANALYSIS' ? '분석' :
             post.type === 'CHEERING' ? '응원' : '하이라이트'}
          </Text>
        </View>
      </View>

      {/* 게시물 제목 */}
      <Text style={themed($title)}>{post.title}</Text>

      {/* 게시물 내용 (요약) */}
      <Text style={themed($content)}>
        {contentSummary}
      </Text>

      {/* 게시물 미디어 (있는 경우) */}
      {post.mediaUrl && (
        <Image
          source={{ uri: post.mediaUrl }}
          style={themed($media)}
          resizeMode="cover"
        />
      )}

      {/* 게시물 통계 (좋아요, 댓글, 조회수) */}
      <View style={themed($stats)}>
        <View style={styles.statItem}>
          <Heart
            size={16}
            color={post.isLiked ? theme.colors.tint : theme.colors.textDim}
            fill={post.isLiked ? theme.colors.tint : 'transparent'}
          />
          <Text style={themed($statText)}>{post.likeCount}</Text>
        </View>

        <View style={styles.statItem}>
          <MessageCircle size={16} color={theme.colors.textDim} />
          <Text style={themed($statText)}>{post.commentCount}</Text>
        </View>

        <View style={styles.statItem}>
          <Eye size={16} color={theme.colors.textDim} />
          <Text style={themed($statText)}>{post.viewCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 8,
  padding: spacing.md,
  marginBottom: spacing.md,
  shadowColor: colors.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 3,
  elevation: 2,
});

const $header: ThemedStyle<ViewStyle> = () => ({
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 10,
});

const $profileImage: ThemedStyle<ImageStyle> = () => ({
  width: 40,
  height: 40,
  borderRadius: 20,
  marginRight: 10,
});

const $authorName: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontWeight: '600',
  color: colors.text,
  fontSize: 14,
});

const $timestamp: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 12,
  marginTop: 2,
});

const $typeTag: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tintLight,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 4,
  marginLeft: 'auto',
});

const $typeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontSize: 12,
  fontWeight: '500',
});

const $title: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  fontWeight: 'bold',
  color: colors.text,
  marginBottom: spacing.sm,
});

const $content: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  lineHeight: 20,
  marginBottom: 10,
});

const $media: ThemedStyle<ImageStyle> = () => ({
  width: '100%',
  height: 180,
  borderRadius: 6,
  marginVertical: 10,
});

const $stats: ThemedStyle<ViewStyle> = () => ({
  flexDirection: 'row',
  marginTop: 10,
});

const $statText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 13,
  color: colors.textDim,
  marginLeft: 4,
});

// 일반 스타일 (테마 컨텍스트 필요 없음)
const styles = StyleSheet.create({
  headerTextContainer: {
    flex: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
});
