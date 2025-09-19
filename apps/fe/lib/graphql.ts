// sportcomm/apps/fe/lib/graphql.ts

import { gql } from "@apollo/client";

/**
 * This file contains the GraphQL queries and mutations for interacting with the backend API.
 * Using a central file for these definitions helps maintain consistency.
 */

// Admin GraphQL 쿼리 및 뮤테이션 import
export * from "./graphql/admin";

/**
 * 통합 피드 데이터 쿼리 - 네트워크 요청 최소화
 * 피드 게시물, 내 팀 목록, 차단 사용자를 한 번에 가져옵니다.
 */
export const GET_FEED_DATA = gql`
  query GetFeedData(
    $input: FindPostsInput
    $includeBlockedUsers: Boolean = false
  ) {
    posts(input: $input) {
      posts {
        id
        title
        content
        createdAt
        teamId
        team {
          id
          name
          logoUrl
          code
          color
          mainColor
          subColor
          darkMainColor
          darkSubColor
          sport {
            id
            name
            icon
          }
        }
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
            favoriteDate
            favoritePlayerName
            favoritePlayerNumber
            experience
            level
            experienceToNextLevel
            levelProgressRatio
            createdAt
            team {
              id
              name
              code
              color
              mainColor
              subColor
              darkMainColor
              darkSubColor
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
        tags {
          id
          name
          color
        }
      }
      total
      page
      limit
      totalPages
      hasPrevious
      hasNext
    }
    myTeams {
      id
      userId
      teamId
      priority
      notificationEnabled
      favoriteDate
      favoritePlayerName
      favoritePlayerNumber
      experience
      level
      experienceToNextLevel
      levelProgressRatio
      createdAt
      team {
        id
        name
        code
        color
        mainColor
        subColor
        darkMainColor
        darkSubColor
        icon
        logoUrl
        description
        sortOrder
        isActive
      }
    }
    blockedUsers: getBlockedUsers @include(if: $includeBlockedUsers)
  }
`;

/**
 * 레거시 호환성을 위한 기존 쿼리 (점진적 마이그레이션용)
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
        team {
          id
          name
          code
          color
          mainColor
          subColor
          darkMainColor
          darkSubColor
          sport {
            id
            name
            icon
          }
        }
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
            favoriteDate
            favoritePlayerName
            favoritePlayerNumber
            experience
            level
            experienceToNextLevel
            levelProgressRatio
            createdAt
            team {
              id
              name
              code
              color
              mainColor
              subColor
              darkMainColor
              darkSubColor
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
        tags {
          id
          name
          color
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
 * 조건부 차단 사용자 목록 조회 (필요 시에만 로드)
 */
export const GET_BLOCKED_USERS_LAZY = gql`
  query GetBlockedUsersLazy {
    getBlockedUsers
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
      team {
        id
        name
        code
        color
        mainColor
        subColor
        darkMainColor
        darkSubColor
        sport {
          id
          name
          icon
        }
      }
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
      tags {
        id
        name
        color
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
      team {
        id
        name
        code
        color
        mainColor
        subColor
        darkMainColor
        darkSubColor
        sport {
          id
          name
          icon
        }
      }
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
      tags {
        id
        name
        color
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
      bio
      comment
      age
      role
      points
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
        favoritePlayerName
        favoritePlayerNumber
        experience
        level
        experienceToNextLevel
        levelProgressRatio
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
          myTeams {
            id
            userId
            teamId
            priority
            notificationEnabled
            favoriteDate
            favoritePlayerName
            favoritePlayerNumber
            experience
            level
            experienceToNextLevel
            levelProgressRatio
            team {
              id
              name
              code
              color
              mainColor
              subColor
              darkMainColor
              darkSubColor
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
        tags {
          id
          name
          color
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
 * 피드백 생성 뮤테이션
 * 서버 스키마와 필드 명이 다를 경우 CreateFeedbackInput 구조/필드 조정 필요
 * 기본 반환 필드: id, title, content, type, status, priority, createdAt
 */
export const CREATE_FEEDBACK = gql`
  mutation CreateFeedback($input: CreateFeedbackInput!) {
    createFeedback(input: $input) {
      id
      title
      content
      type
      status
      priority
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
 * 사용자 프로필 업데이트 뮤테이션
 */
export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      nickname
      email
      bio
      age
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
 * 성공 시 삭제된 Post 객체를 반환합니다.
 */
export const DELETE_POST = gql`
  mutation DeletePost($id: String!) {
    removePost(id: $id) {
      id
      title
      content
      author {
        id
        nickname
      }
      team {
        id
        name
      }
      createdAt
      updatedAt
    }
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
            experience
            level
            experienceToNextLevel
            levelProgressRatio
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
        tags {
          id
          name
          color
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
 * 닉네임 중복 확인 쿼리
 */
export const CHECK_NICKNAME_AVAILABILITY = gql`
  query CheckNicknameAvailability($nickname: String!, $excludeUserId: String) {
    checkNicknameAvailability(
      nickname: $nickname
      excludeUserId: $excludeUserId
    ) {
      available
      message
    }
  }
`;

/**
 * 포인트 트랜잭션(본인) 조회
 * - cursor 기반 페이지네이션
 * - 필터: type / isEarn / isSpend / 기간(from~to)
 */
export const GET_MY_POINT_TRANSACTIONS = gql`
  query GetMyPointTransactions(
    $limit: Int = 20
    $cursor: String
    $type: PointTransactionType
    $isEarn: Boolean
    $isSpend: Boolean
    $from: DateTime
    $to: DateTime
  ) {
    getMyPointTransactions(
      limit: $limit
      cursor: $cursor
      type: $type
      isEarn: $isEarn
      isSpend: $isSpend
      from: $from
      to: $to
    ) {
      items {
        id
        createdAt
        amount
        balanceAfter
        type
        description
        referenceType
        referenceId
        metadata
      }
      limit
      hasNext
      nextCursor
    }
  }
`;

/**
 * 특정 사용자(관리자 또는 본인) 포인트 트랜잭션 조회
 */
export const GET_POINT_TRANSACTIONS = gql`
  query GetPointTransactions(
    $userId: ID!
    $limit: Int = 20
    $cursor: String
    $type: PointTransactionType
    $isEarn: Boolean
    $isSpend: Boolean
    $from: DateTime
    $to: DateTime
  ) {
    getPointTransactions(
      userId: $userId
      limit: $limit
      cursor: $cursor
      type: $type
      isEarn: $isEarn
      isSpend: $isSpend
      from: $from
      to: $to
    ) {
      items {
        id
        createdAt
        amount
        balanceAfter
        type
        description
        referenceType
        referenceId
        metadata
      }
      limit
      hasNext
      nextCursor
    }
  }
`;

/**
 * 관리자 수동 포인트 가/감 조정 (양수=적립, 음수=차감)
 */
export const ADMIN_RECORD_POINT_ADJUSTMENT = gql`
  mutation AdminRecordPointAdjustment(
    $targetUserId: ID!
    $amount: Int!
    $description: String
  ) {
    adminRecordPointAdjustment(
      targetUserId: $targetUserId
      amount: $amount
      description: $description
    ) {
      transaction {
        id
        createdAt
        amount
        balanceAfter
        type
        description
        referenceType
        referenceId
        metadata
      }
      balanceAfter
    }
  }
`;
