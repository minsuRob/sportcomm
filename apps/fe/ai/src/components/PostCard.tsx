import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { Heart, MessageCircle, Repeat, MoreHorizontal, Eye } from 'lucide-react-native';
import { useFeedStore, Post, PostType } from '../../../lib/feedStore';

// --- Styled Components using NativeWind ---
const CardContainer = styled(View, 'bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700');
const Header = styled(View, 'flex-row items-center justify-between');
const UserInfo = styled(View, 'flex-row items-center');
const Avatar = styled(Image, 'w-12 h-12 rounded-full');
const Nickname = styled(Text, 'ml-3 font-bold text-lg text-gray-900 dark:text-white');
const PostContent = styled(Text, 'my-3 text-base text-gray-800 dark:text-gray-300');
const MediaImage = styled(Image, 'w-full h-56 rounded-lg bg-gray-200');
const ActionBar = styled(View, 'flex-row justify-around items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-600');
const ActionButton = styled(TouchableOpacity, 'flex-row items-center');
const ActionText = styled(Text, 'ml-2 text-sm text-gray-600 dark:text-gray-400');
const StatsContainer = styled(View, 'flex-row items-center mt-2');
const StatText = styled(Text, 'text-sm text-gray-500 dark:text-gray-400 mr-4');
const CommentPreviewContainer = styled(View, 'mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg');
const CommentAuthor = styled(Text, 'font-semibold text-sm text-gray-800 dark:text-gray-200');
const CommentText = styled(Text, 'text-sm text-gray-600 dark:text-gray-300');
const PostTypeText = styled(Text, 'text-white text-xs font-bold');


interface PostCardProps {
  post: Post;
}

const getPostTypeStyle = (type: PostType) => {
    switch (type) {
        case PostType.ANALYSIS:
            return { badge: 'bg-indigo-500', text: 'ANALYSIS' };
        case PostType.HIGHLIGHT:
            return { badge: 'bg-amber-500', text: 'HIGHLIGHT' };
        case PostType.CHEERING:
        default:
            return { badge: 'bg-green-500', text: 'CHEERING' };
    }
}

export default function PostCard({ post }: PostCardProps) {
  // Get the likePost action from the Zustand store
  const likePost = useFeedStore((state) => state.likePost);

  const firstMedia = post.media?.[0];
  const firstComment = post.comments?.[0];
  const avatarUrl = post.author.profileImageUrl || `https://i.pravatar.cc/150?u=${post.author.id}`;
  const postTypeStyle = getPostTypeStyle(post.type);

  const handleLike = () => {
    likePost(post.id);
  };

  const likeColor = post.isLiked ? '#EF4444' : '#6B7280'; // Red if liked, gray otherwise

  return (
    <CardContainer>
      {/* Header */}
      <Header>
        <UserInfo>
          <Avatar source={{ uri: avatarUrl }} />
          <View>
             <Nickname>{post.author.nickname}</Nickname>
             <Text className="ml-3 text-xs text-gray-500 dark:text-gray-400">
                {new Date(post.createdAt).toLocaleDateString()}
             </Text>
          </View>
        </UserInfo>
        <TouchableOpacity>
          <MoreHorizontal size={24} color="#6B7280" />
        </TouchableOpacity>
      </Header>

      {/* Content */}
      <PostContent>{post.content}</PostContent>

      {/* Media */}
      {firstMedia?.type === 'image' && (
        <View className="relative">
            <MediaImage source={{ uri: firstMedia.url }} />
             <View className={`absolute top-2 right-2 ${postTypeStyle.badge} px-2 py-1 rounded-full`}>
                <PostTypeText>{postTypeStyle.text}</PostTypeText>
            </View>
        </View>
      )}

      {/* Stats */}
       <StatsContainer>
         <Heart size={16} color="#6B7280" />
         <StatText className="ml-1">{post.likesCount} Likes</StatText>
         <MessageCircle size={16} color="#6B7280" />
         <StatText className="ml-1">{post.commentsCount} Comments</StatText>
         <Eye size={16} color="#6B7280" />
         <StatText className="ml-1">{post.viewCount} Views</StatText>
      </StatsContainer>

      {/* Action Bar */}
      <ActionBar>
        <ActionButton onPress={handleLike}>
          <Heart size={22} color={likeColor} fill={post.isLiked ? likeColor : 'none'} />
          <ActionText style={{ color: likeColor }}>Like</ActionText>
        </ActionButton>
        <ActionButton>
          <MessageCircle size={22} color="#6B7280" />
          <ActionText>Comment</ActionText>
        </ActionButton>
        <ActionButton>
          <Repeat size={22} color="#6B7280" />
          <ActionText>Repost</ActionText>
        </ActionButton>
      </ActionBar>

      {/* Comment Preview */}
      {firstComment && (
        <CommentPreviewContainer>
          <View className="flex-row items-center">
            <Text>
                <CommentAuthor>{firstComment.author.nickname}: </CommentAuthor>
                <CommentText>{firstComment.content}</CommentText>
            </Text>
          </View>
        </CommentPreviewContainer>
      )}
    </CardContainer>
  );
}
