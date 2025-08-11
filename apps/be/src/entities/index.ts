/**
 * 엔티티 인덱스 파일
 *
 * 모든 엔티티를 중앙에서 관리하고 내보내는 파일입니다.
 * TypeORM 설정 및 모듈에서 쉽게 import할 수 있도록 합니다.
 */

import { User } from './user.entity';
import { Post } from './post.entity';
import { PostVersion } from './post-version.entity';
import { Comment } from './comment.entity';
import { Follow } from './follow.entity';
import { Media } from './media.entity';
import { ChatRoom } from './chat-room.entity';
import { ChatMessage } from './chat-message.entity';
import { PostLike } from './post-like.entity';
import { Report } from './report.entity';
import { Block } from './block.entity';
import { Bookmark } from './bookmark.entity';
import { Notification } from './notification.entity';
import { Feedback } from './feedback.entity';
import { Sport } from './sport.entity';
import { Team } from './team.entity';
import { UserTeam } from './user-team.entity';
import { PushToken } from './push-token.entity';

// 기본 엔티티
export { BaseEntity } from './base.entity';

// 사용자 관련 엔티티
export {
  User,
  UserRole,
  SupabaseAuthUser,
  CombinedUserInfo,
} from './user.entity';

// 게시물 관련 엔티티
export { Post } from './post.entity';
export { PostVersion } from './post-version.entity';
export { PostLike } from './post-like.entity';

// 댓글 관련 엔티티
export { Comment } from './comment.entity';

// 팔로우 관련 엔티티
export { Follow } from './follow.entity';

// 미디어 관련 엔티티
export { Media, MediaType, UploadStatus } from './media.entity';

// 채팅 관련 엔티티
export { ChatRoom, ChatRoomType } from './chat-room.entity';
export { ChatMessage, ChatMessageType } from './chat-message.entity';

// 신고 및 차단 관련 엔티티
export { Report, ReportType, ReportStatus } from './report.entity';
export { Block } from './block.entity';

// 북마크 관련 엔티티
export { Bookmark } from './bookmark.entity';

// 알림 관련 엔티티
export { Notification, NotificationType } from './notification.entity';

// 피드백 관련 엔티티
export {
  Feedback,
  FeedbackType,
  FeedbackStatus,
  FeedbackPriority,
} from './feedback.entity';

// 스포츠 및 팀 관련 엔티티
export { Sport } from './sport.entity';
export { Team } from './team.entity';
export { UserTeam } from './user-team.entity';

/**
 * 모든 엔티티를 배열로 내보내는 상수
 * TypeORM 설정에서 사용됩니다.
 */
export const entities = [
  User,
  Post,
  PostVersion,
  Comment,
  Follow,
  Media,
  ChatRoom,
  ChatMessage,
  PostLike,
  Report,
  Block,
  Bookmark,
  Notification,
  Feedback,
  Sport,
  Team,
  UserTeam,
  PushToken,
];

/**
 * 엔티티별 테이블 이름 매핑
 * 마이그레이션 및 쿼리 작성 시 참고용입니다.
 */
export const tableNames = {
  users: 'users',
  posts: 'posts',
  postVersions: 'post_versions',
  postLikes: 'post_likes',
  comments: 'comments',
  follows: 'follows',
  media: 'media',
  chatRooms: 'chat_rooms',
  chatMessages: 'chat_messages',
  chatRoomParticipants: 'chat_room_participants',
  reports: 'reports',
  blocks: 'blocks',
  bookmarks: 'bookmarks',
  feedbacks: 'feedbacks',
} as const;

/**
 * 엔티티별 관계 정보
 * 개발 및 디버깅 시 참고용입니다.
 */
export const entityRelations = {
  User: {
    oneToMany: ['posts', 'comments', 'following', 'followers', 'chatMessages'],
    manyToMany: ['chatRooms'],
  },
  Post: {
    manyToOne: ['author'],
    oneToMany: ['comments', 'mediaFiles', 'versions', 'likes'],
  },
  PostVersion: {
    manyToOne: ['post'],
  },
  PostLike: {
    manyToOne: ['user', 'post'],
  },
  Comment: {
    manyToOne: ['author', 'post', 'parentComment'],
    oneToMany: ['childComments'],
  },
  Follow: {
    manyToOne: ['follower', 'following'],
  },
  Media: {
    manyToOne: ['post'],
  },
  ChatRoom: {
    manyToMany: ['participants'],
    oneToMany: ['messages'],
  },
  ChatMessage: {
    manyToOne: ['author', 'room', 'replyToMessage'],
  },
  Report: {
    manyToOne: ['reporter', 'reportedUser', 'post', 'message'],
  },
  Block: {
    manyToOne: ['blocker', 'blockedUser'],
  },
  Bookmark: {
    manyToOne: ['user', 'post'],
  },
  Feedback: {
    manyToOne: ['submitter', 'responder'],
  },
} as const;

/**
 * 엔티티별 주요 인덱스 정보
 * 성능 최적화 및 쿼리 계획 시 참고용입니다.
 */
export const entityIndexes = {
  users: ['email', 'nickname'],
  posts: ['authorId', 'teamId', 'createdAt'],
  postVersions: ['postId', 'version', 'createdAt'],
  postLikes: ['userId', 'postId', 'isLikeActive'],
  comments: ['authorId', 'postId', 'parentCommentId', 'createdAt'],
  follows: ['followerId', 'followingId', 'createdAt'],
  media: ['postId', 'type', 'status', 'createdAt'],
  chatRooms: ['type', 'isActive', 'createdAt', 'name'],
  chatMessages: ['authorId', 'roomId', 'type', 'createdAt', 'isRead'],
  reports: [
    'reporterId',
    'reportedUserId',
    'postId',
    'type',
    'status',
    'createdAt',
  ],
  blocks: ['blockerId', 'blockedUserId', 'createdAt'],
  bookmarks: ['userId', 'postId', 'createdAt'],
  feedbacks: ['submitterId', 'type', 'status', 'priority', 'createdAt'],
} as const;
