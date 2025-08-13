import { gql } from "@apollo/client";

// === 채팅방 관리 GraphQL ===

export const GET_ADMIN_CHAT_ROOMS = gql`
  query AdminGetAllChatRooms($page: Int = 1, $limit: Int = 20) {
    adminGetAllChatRooms(page: $page, limit: $limit) {
      chatRooms {
        id
        name
        description
        type
        isRoomActive
        maxParticipants
        currentParticipants
        totalMessages
        teamId
        team {
          id
          name
          color
          icon
        }
        createdAt
        updatedAt
        lastMessageContent
        lastMessageAt
      }
      total
      page
      limit
      totalPages
    }
  }
`;

export const CREATE_CHAT_ROOM = gql`
  mutation AdminCreateChatRoom(
    $name: String!
    $description: String
    $type: ChatRoomType = PUBLIC
    $maxParticipants: Int = 100
    $teamId: String
  ) {
    adminCreateChatRoom(
      name: $name
      description: $description
      type: $type
      maxParticipants: $maxParticipants
      teamId: $teamId
    ) {
      id
      name
      description
      type
      isRoomActive
      maxParticipants
      currentParticipants
      totalMessages
      teamId
      team {
        id
        name
        color
        icon
      }
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_CHAT_ROOM = gql`
  mutation AdminUpdateChatRoom(
    $roomId: String!
    $name: String
    $description: String
    $maxParticipants: Int
    $isRoomActive: Boolean
    $teamId: String
  ) {
    adminUpdateChatRoom(
      roomId: $roomId
      name: $name
      description: $description
      maxParticipants: $maxParticipants
      isRoomActive: $isRoomActive
      teamId: $teamId
    ) {
      id
      name
      description
      type
      isRoomActive
      maxParticipants
      currentParticipants
      totalMessages
      teamId
      team {
        id
        name
        color
        icon
      }
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_CHAT_ROOM = gql`
  mutation AdminDeleteChatRoom($roomId: String!) {
    adminDeleteChatRoom(roomId: $roomId)
  }
`;

// === 대시보드 통계 ===

export const GET_ADMIN_DASHBOARD_STATS = gql`
  query AdminDashboardStats {
    adminDashboardStats {
      totalUsers
      totalPosts
      totalChatRooms
      totalReports
      activeUsers
      recentPosts
      pendingReports
    }
  }
`;

// === 사용자 관리 ===

export const GET_ADMIN_USERS = gql`
  query AdminGetAllUsers($page: Int = 1, $limit: Int = 20) {
    adminGetAllUsers(page: $page, limit: $limit) {
      users {
        id
        email
        nickname
        profileImageUrl
        role
        createdAt
        updatedAt
      }
      total
      page
      limit
      totalPages
    }
  }
`;

export const CHANGE_USER_ROLE = gql`
  mutation AdminChangeUserRole($userId: String!, $newRole: UserRole!) {
    adminChangeUserRole(userId: $userId, newRole: $newRole) {
      id
      email
      nickname
      role
      updatedAt
    }
  }
`;

// === 게시물 관리 ===

export const GET_ADMIN_POSTS = gql`
  query AdminGetAllPosts($page: Int = 1, $limit: Int = 20) {
    adminGetAllPosts(page: $page, limit: $limit) {
      posts {
        id
        title
        content
        type
        author {
          id
          nickname
          email
        }
        createdAt
        updatedAt
      }
      total
      page
      limit
      totalPages
    }
  }
`;

export const DELETE_POST = gql`
  mutation AdminDeletePost($postId: String!) {
    adminDeletePost(postId: $postId)
  }
`;

// === 신고 관리 ===

export const GET_ADMIN_REPORTS = gql`
  query AdminGetAllReports($page: Int = 1, $limit: Int = 20) {
    adminGetAllReports(page: $page, limit: $limit) {
      reports {
        id
        type
        status
        reason
        reporter {
          id
          nickname
          email
        }
        reportedUser {
          id
          nickname
          email
        }
        post {
          id
          title
          content
        }
        adminNote
        createdAt
        updatedAt
      }
      total
      page
      limit
      totalPages
    }
  }
`;

// === 팀 관리 GraphQL ===

export const GET_ADMIN_TEAMS = gql`
  query AdminGetAllTeams {
    adminGetAllTeams {
      id
      name
      color
      icon
      category
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const GET_ADMIN_TEAMS_BY_CATEGORY = gql`
  query AdminGetTeamsByCategory {
    adminGetTeamsByCategory {
      id
      name
      icon
      teams {
        id
        name
        color
        icon
        category
        isActive
        createdAt
        updatedAt
      }
    }
  }
`;

export const CREATE_TEAM = gql`
  mutation AdminCreateTeam($input: CreateTeamInput!) {
    adminCreateTeam(input: $input) {
      id
      name
      color
      icon
      category
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_TEAM = gql`
  mutation AdminUpdateTeam($teamId: String!, $input: UpdateTeamInput!) {
    adminUpdateTeam(teamId: $teamId, input: $input) {
      id
      name
      color
      icon
      category
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_TEAM = gql`
  mutation AdminDeleteTeam($teamId: String!) {
    adminDeleteTeam(teamId: $teamId)
  }
`;

export const TOGGLE_TEAM_STATUS = gql`
  mutation AdminToggleTeamStatus($teamId: String!) {
    adminToggleTeamStatus(teamId: $teamId) {
      id
      name
      color
      icon
      category
      isActive
      createdAt
      updatedAt
    }
  }
`;

// === 신고 관리 GraphQL ===

export const UPDATE_REPORT_STATUS = gql`
  mutation AdminUpdateReportStatus(
    $reportId: String!
    $status: ReportStatus!
    $adminNote: String
  ) {
    adminUpdateReportStatus(
      reportId: $reportId
      status: $status
      adminNote: $adminNote
    ) {
      id
      type
      status
      reason
      adminNote
      reporter {
        id
        nickname
        email
      }
      reportedUser {
        id
        nickname
        email
      }
      post {
        id
        title
        content
      }
      createdAt
      updatedAt
    }
  }
`;

// === 피드백 관리 ===

export const GET_ADMIN_FEEDBACKS = gql`
  query AdminGetAllFeedbacks($page: Int = 1, $limit: Int = 20) {
    adminGetAllFeedbacks(page: $page, limit: $limit) {
      feedbacks {
        id
        title
        content
        type
        status
        priority
        submitter {
          id
          nickname
          email
        }
        responder {
          id
          nickname
        }
        adminResponse
        respondedAt
        contactInfo
        attachmentUrl
        createdAt
        updatedAt
      }
      total
      page
      limit
      totalPages
    }
  }
`;

export const GET_ADMIN_FEEDBACKS_BY_STATUS = gql`
  query AdminGetFeedbacksByStatus(
    $status: FeedbackStatus!
    $page: Int = 1
    $limit: Int = 20
  ) {
    adminGetFeedbacksByStatus(status: $status, page: $page, limit: $limit) {
      feedbacks {
        id
        title
        content
        type
        status
        priority
        submitter {
          id
          nickname
          email
        }
        responder {
          id
          nickname
        }
        adminResponse
        respondedAt
        contactInfo
        attachmentUrl
        createdAt
        updatedAt
      }
      total
      page
      limit
      totalPages
    }
  }
`;

export const RESPOND_TO_FEEDBACK = gql`
  mutation AdminRespondToFeedback($feedbackId: String!, $response: String!) {
    adminRespondToFeedback(feedbackId: $feedbackId, response: $response) {
      id
      title
      adminResponse
      respondedAt
      status
      updatedAt
    }
  }
`;

export const UPDATE_FEEDBACK_STATUS = gql`
  mutation AdminUpdateFeedbackStatus(
    $feedbackId: String!
    $status: FeedbackStatus!
  ) {
    adminUpdateFeedbackStatus(feedbackId: $feedbackId, status: $status) {
      id
      status
      updatedAt
    }
  }
`;

export const UPDATE_FEEDBACK_PRIORITY = gql`
  mutation AdminUpdateFeedbackPriority(
    $feedbackId: String!
    $priority: FeedbackPriority!
  ) {
    adminUpdateFeedbackPriority(feedbackId: $feedbackId, priority: $priority) {
      id
      priority
      updatedAt
    }
  }
`;
