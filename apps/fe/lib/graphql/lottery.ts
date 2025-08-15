import { gql } from "@apollo/client";

/**
 * 현재 추첨 상태 조회 쿼리
 */
export const GET_LOTTERY_STATUS = gql`
  query GetLotteryStatus {
    currentLotteryStatus {
      hasActiveLottery
      lottery {
        id
        roundNumber
        startTime
        endTime
        announceTime
        finalEndTime
        status
        totalPrize
        winnerCount
        prizePerWinner
        totalEntries
        winnerIds
      }
      hasEntered
      remainingSeconds
      totalEntries
      currentPhase
    }
  }
`;

/**
 * 추첨 응모 뮤테이션
 */
export const ENTER_LOTTERY = gql`
  mutation EnterLottery {
    enterLottery {
      id
      isWinner
      createdAt
      lottery {
        id
        roundNumber
        totalPrize
        winnerCount
      }
      user {
        id
        nickname
      }
    }
  }
`;

/**
 * 사용자 응모 상태 확인 쿼리
 */
export const HAS_ENTERED_CURRENT_LOTTERY = gql`
  query HasEnteredCurrentLottery {
    hasEnteredCurrentLottery
  }
`;

/**
 * 추첨 이력 조회 쿼리
 */
export const GET_LOTTERY_HISTORY = gql`
  query GetLotteryHistory($page: Int = 1, $limit: Int = 10) {
    lotteryHistory(page: $page, limit: $limit) {
      lotteries {
        id
        roundNumber
        startTime
        endTime
        status
        totalPrize
        winnerCount
        prizePerWinner
        totalEntries
        winnerIds
        createdAt
      }
      total
      hasMore
      page
      limit
    }
  }
`;

/**
 * 특정 추첨의 당첨자 조회 쿼리
 */
export const GET_LOTTERY_WINNERS = gql`
  query GetLotteryWinners($lotteryId: String!) {
    lotteryWinners(lotteryId: $lotteryId) {
      id
      isWinner
      prizePoints
      createdAt
      user {
        id
        nickname
        profileImageUrl
      }
      lottery {
        id
        roundNumber
        totalPrize
      }
    }
  }
`;

/**
 * 사용자 당첨 이력 조회 쿼리
 */
export const GET_USER_WIN_HISTORY = gql`
  query GetUserWinHistory($page: Int = 1, $limit: Int = 10) {
    userWinHistory(page: $page, limit: $limit) {
      entries {
        id
        isWinner
        prizePoints
        createdAt
        lottery {
          id
          roundNumber
          totalPrize
          endTime
        }
      }
      total
      totalWinnings
      page
      limit
    }
  }
`;

/**
 * 추첨 상태 구독 (실시간 업데이트용)
 */
export const LOTTERY_STATUS_SUBSCRIPTION = gql`
  subscription LotteryStatusUpdated {
    lotteryStatusUpdated {
      hasActiveLottery
      lottery {
        id
        roundNumber
        totalPrize
        winnerCount
        prizePerWinner
        remainingSeconds
        totalEntries
      }
      hasEntered
    }
  }
`;

// 타입 정의
export interface LotteryData {
  id: string;
  roundNumber: number;
  startTime: string;
  endTime: string;
  status: string;
  totalPrize: number;
  winnerCount: number;
  prizePerWinner: number;
  totalEntries: number;
  winnerIds?: string[];
  createdAt: string;
}

export interface LotteryStatusData {
  hasActiveLottery: boolean;
  lottery?: LotteryData;
  hasEntered: boolean;
  remainingSeconds: number;
  totalEntries: number;
}

export interface LotteryEntryData {
  id: string;
  isWinner: boolean;
  prizePoints?: number;
  createdAt: string;
  user: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
  lottery: {
    id: string;
    roundNumber: number;
    totalPrize: number;
  };
}

export interface LotteryHistoryData {
  lotteries: LotteryData[];
  total: number;
  hasMore: boolean;
  page: number;
  limit: number;
}

export interface UserWinHistoryData {
  entries: LotteryEntryData[];
  total: number;
  totalWinnings: number;
  page: number;
  limit: number;
}
