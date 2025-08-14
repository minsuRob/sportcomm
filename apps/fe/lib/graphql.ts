// sportcomm/apps/fe/lib/graphql.ts

import { gql } from "@apollo/client";

/**
 * This file contains the GraphQL queries and mutations for interacting with the backend API.
 * Using a central file for these definitions helps maintain consistency.
 */

// Admin GraphQL 쿼리 및 뮤테이션 import
export * from "./graphql/admin";

/**
 * Fetches a paginated list of posts for the main feed.
 * It retrieves all necessary fields to render a post card, along with pagination metadata.
 * The query now uses an 'input' object to pass arguments, matching the backend resolver.
 */
export const GET_POSTS = gql`
  query GetPosts($input: FindPostsInput) {
    posts(input: $input) {
      posts {
        id
        title
        content
        createdAt
        teamId
        viewCount
        likeCount
        commentCount
        isLiked
        isBookmarked
        author {
          id
          nickname
          profileImageUrl
          myTeams {
            id
            userId
            teamId
            priority
            notificationEnabled
            createdAt
            team {
              id
              name
              code
              color
              icon
              logoUrl
              description
              sortOrder
              isActive
            }
          }
        }
        media {
          id
          url
          type
        }
        comments {
          id
        }
      }
      total
      page
      limit
      totalPages
      hasPrevious
      hasNext
    }
  }
`;

/**
 * Creates a new post.
 * The backend will use the authenticated user's ID for the author.
 * Returns the newly created post with the same fields as the feed query.
 */
export const CREATE_POST = gql`
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      title
      content
      createdAt
      teamId
      viewCount
      author {
        id
        nickname
        profileImageUrl
      }
      media {
        id
        url
        type
      }
      comments {
        id
      }
    }
  }
`;

/**
 * 게시물 좋아요 토글 기능
 * 백엔드에서 제공하는 likePost 뮤테이션을 사용하여 게시물의 좋아요 상태를 토글합니다.
 * 이미 좋아요가 되어 있으면 취소하고, 되어있지 않으면 좋아요를 설정합니다.
 *
 * 반환값:
 * - true: 좋아요 설정됨 (like)
 * - false: 좋아요 취소됨 (unlike)
 */
export const TOGGLE_LIKE = gql`
  mutation ToggleLike($postId: String!) {
    likePost(id: $postId)
  }
`;

/**
 * 게시물 상세 정보를 조회합니다.
 * 게시물의 모든 정보와 댓글 목록을 포함합니다.
 */
export const GET_POST_DETAIL = gql`
  query GetPostDetail($id: String!) {
    post(id: $id) {
      id
      title
      content
      createdAt
      teamId
      viewCount
      likeCount
      commentCount
      shareCount
      isPinned
      isPublic
      isLiked
      isBookmarked
      author {
        id
        nickname
        profileImageUrl
        role
      }
      media {
        id
        url
        type
      }
      comments {
        id
        content
        createdAt
        author {
          id
          nickname
          profileImageUrl
        }
      }
    }
  }
`;

/**
 * 댓글을 생성합니다.
 * 게시물 ID와 댓글 내용을 받아 새로운 댓글을 생성합니다.
 */
export const CREATE_COMMENT = gql`
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) {
      id
      content
      createdAt
      author {
        id
        nickname
        profileImageUrl
      }
    }
  }
`;

/**
 * 사용자의 팔로우 상태를 토글합니다.
 * userId를 인자로 받아, 해당 유저에 대한 팔로우/언팔로우를 처리합니다.
 * 뮤테이션의 결과로 새로운 팔로우 상태(boolean)를 반환합니다.
 */
export const TOGGLE_FOLLOW = gql`
  mutation ToggleFollow($userId: String!) {
    toggleFollow(userId: $userId)
  }
`;

/**
 * 사용자의 팔로워 목록을 조회합니다.
 */
export const GET_FOLLOWERS = gql`
  query GetFollowers($userId: String!) {
    getUserById(userId: $userId) {
      followers {
        follower {
          id
          nickname
          profileImageUrl
          isFollowing
          followerCount
          followingCount
        }
      }
    }
  }
`;

/**
 * 사용자의 팔로잉 목록을 조회합니다.
 */
export const GET_FOLLOWING = gql`
  query GetFollowing($userId: String!) {
    getUserById(userId: $userId) {
      following {
        following {
          id
          nickname
          profileImageUrl
          isFollowing
          followerCount
          followingCount
        }
      }
    }
  }
`;

/**
 * 사용자 프로필 정보를 조회합니다.
 * 백엔드에서는 ResolveField를 통해 followerCount, followingCount, postCount, isFollowing을 계산합니다.
 */
export const GET_USER_PROFILE = gql`
  query GetUserProfile($userId: String!) {
    getUserById(userId: $userId) {
      id
      nickname
      email
      profileImageUrl
      role
      isFollowing
      followerCount
      followingCount
      postCount
      myTeams {
        id
        userId
        teamId
        priority
        favoriteDate
        team {
          id
          name
          code
          color
          icon
          logoUrl
        }
      }
    }
  }
`;

/**
 * 특정 사용자의 게시물 목록을 조회합니다.
 * GET_POSTS와 동일한 구조를 가지지만, 프로필 화면에서 사용자의 게시물을 가져오는 데 특화되어 있습니다.
 * 'authorId'를 포함한 FindPostsInput으로 필터링합니다.
 */
export const GET_USER_POSTS = gql`
  query GetUserPosts($input: FindPostsInput) {
    posts(input: $input) {
      posts {
        id
        title
        content
        createdAt
        teamId
        viewCount
        likeCount
        commentCount
        isLiked
        isBookmarked
        author {
          id
          nickname
          profileImageUrl
        }
        media {
          id
          url
          type
        }
        comments {
          id
        }
      }
      total
      page
      limit
      totalPages
      hasPrevious
      hasNext
    }
  }
`;

/**
 * 신고 생성 뮤테이션
 */
export const CREATE_REPORT = gql`
  mutation CreateReport($input: CreateReportInput!) {
    createReport(input: $input) {
      id
      type
      reason
      status
      createdAt
    }
  }
`;

/**
 * 사용자 차단 뮤테이션
 */
export const BLOCK_USER = gql`
  mutation BlockUser($blockedUserId: String!) {
    blockUser(blockedUserId: $blockedUserId) {
      id
    }
  }
`;

/**
 * 사용자 차단 해제 뮤테이션
 */
export const UNBLOCK_USER = gql`
  mutation UnblockUser($blockedUserId: String!) {
    unblockUser(blockedUserId: $blockedUserId)
  }
`;

/**
 * 차단된 사용자 목록 조회
 */
export const GET_BLOCKED_USERS = gql`
  query GetBlockedUsers {
    getBlockedUsers
  }
`;

/**
 * 사용자 차단 여부 확인
 */
export const IS_USER_BLOCKED = gql`
  query IsUserBlocked($userId: String!) {
    isUserBlocked(userId: $userId)
  }
`;

/**
 * 게시물 수정 뮤테이션
 */
export const UPDATE_POST = gql`
  mutation UpdatePost($input: UpdatePostInput!) {
    updatePost(input: $input) {
      id
      title
      content
      teamId
      createdAt
      updatedAt
      isPublic
      isPinned
      viewCount
      likeCount
      commentCount
      author {
        id
        nickname
        profileImageUrl
      }
      media {
        id
        url
        type
      }
    }
  }
`;

/**
 * GraphQL 파일 업로드 뮤테이션
 */
export const UPLOAD_FILES = gql`
  mutation UploadFiles($files: [Upload!]!) {
    uploadFiles(files: $files) {
      id
      originalName
      url
      type
      fileSize
      mimeType
      width
      height
    }
  }
`;

/**
 * 단일 파일 업로드 뮤테이션
 */
export const UPLOAD_FILE = gql`
  mutation UploadFile($file: Upload!) {
    uploadFile(file: $file) {
      id
      originalName
      url
      type
      fileSize
      mimeType
      width
      height
    }
  }
`;
/**
 * 사용자 프로필 업데이트 뮤테이션
 */
export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      nickname
      email
      bio
      profileImageUrl
      role
      createdAt
      updatedAt
    }
  }
`;

/**
 * 게시물 삭제 뮤테이션
 * postId를 인자로 받아 해당 게시물을 삭제합니다.
 * 성공 시 boolean 값을 반환합니다.
 */
export const DELETE_POST = gql`
  mutation DeletePost($id: String!) {
    deletePost(id: $id)
  }
`;

/**
 * 북마크 토글 뮤테이션
 * 게시물을 북마크에 추가하거나 제거합니다.
 * 이미 북마크되어 있으면 제거하고, 없으면 추가합니다.
 */
export const TOGGLE_BOOKMARK = gql`
  mutation ToggleBookmark($postId: String!) {
    toggleBookmark(postId: $postId)
  }
`;

/**
 * 사용자의 북마크 목록 조회
 * 사용자가 북마크한 모든 게시물을 반환합니다.
 */
export const GET_USER_BOOKMARKS = gql`
  query GetUserBookmarks($userId: String!) {
    getUserBookmarks(userId: $userId) {
      id
      title
      content
      createdAt
      teamId
      viewCount
      likeCount
      commentCount
      author {
        id
        nickname
        profileImageUrl
      }
      media {
        id
        url
        type
      }
      comments {
        id
      }
    }
  }
`;

/**
 * 알림 목록 조회 쿼리
 */
export const GET_NOTIFICATIONS = gql`
  query GetNotifications($page: Int = 1, $limit: Int = 20) {
    notifications(page: $page, limit: $limit) {
      notifications {
        id
        type
        title
        message
        isRead
        createdAt
        sender {
          id
          nickname
          profileImageUrl
        }
        post {
          id
          title
          content
        }
        comment {
          id
          content
        }
        metadata
      }
      total
      hasMore
      page
      limit
    }
  }
`;

/**
 * 읽지 않은 알림 개수 조회 쿼리
 */
export const GET_UNREAD_NOTIFICATION_COUNT = gql`
  query GetUnreadNotificationCount {
    unreadNotificationCount
  }
`;

/**
 * 알림 읽음 처리 뮤테이션
 */
export const MARK_NOTIFICATION_AS_READ = gql`
  mutation MarkNotificationAsRead($notificationId: String!) {
    markNotificationAsRead(notificationId: $notificationId)
  }
`;

/**
 * 모든 알림 읽음 처리 뮤테이션
 */
export const MARK_ALL_NOTIFICATIONS_AS_READ = gql`
  mutation MarkAllNotificationsAsRead {
    markAllNotificationsAsRead
  }
`;

/**
 * 알림 삭제 뮤테이션
 */
export const DELETE_NOTIFICATION = gql`
  mutation DeleteNotification($notificationId: String!) {
    deleteNotification(notificationId: $notificationId)
  }
`;

/**
 * 새로운 알림 실시간 구독
 */
export const NEW_NOTIFICATION_SUBSCRIPTION = gql`
  subscription NewNotification {
    newNotification {
      id
      type
      title
      message
      isRead
      createdAt
      sender {
        id
        nickname
        profileImageUrl
      }
      post {
        id
        title
        content
      }
      comment {
        id
        content
      }
      metadata
    }
  }
`;

/**
 * 알림 업데이트 실시간 구독
 */
export const NOTIFICATION_UPDATED_SUBSCRIPTION = gql`
  subscription NotificationUpdated {
    notificationUpdated
  }
`;

/**
 * 스토리 섹션용 게시물 조회 쿼리
 * 최신 게시물 5개를 가져와서 스토리 형태로 표시합니다.
 * 무한 스크롤을 지원하며, 썸네일 이미지 최적화를 위한 미디어 정보를 포함합니다.
 */
export const GET_STORY_POSTS = gql`
  query GetStoryPosts($input: FindPostsInput) {
    posts(input: $input) {
      posts {
        id
        title
        content
        createdAt
        teamId
        viewCount
        likeCount
        commentCount
        isLiked
        isBookmarked
        author {
          id
          nickname
          profileImageUrl
          myTeams {
            id
            userId
            teamId
            priority
            notificationEnabled
            createdAt
            team {
              id
              name
              code
              color
              icon
              logoUrl
              description
              sortOrder
              isActive
            }
          }
        }
        media {
          id
          url
          type
          width
          height
        }
        comments {
          id
        }
      }
      total
      page
      limit
      totalPages
      hasPrevious
      hasNext
    }
  }
`;
