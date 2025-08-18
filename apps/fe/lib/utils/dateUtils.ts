/**
 * 날짜 및 시간 관련 유틸리티 함수
 */

/**
 * 시간 경과를 한국어로 표시하는 함수
 * @param createdAt ISO 문자열 형태의 날짜
 * @returns 한국어로 포맷된 시간 경과 문자열
 */
export const formatTimeAgo = (createdAt: string): string => {
  const now = new Date();
  const postDate = new Date(createdAt);
  const diffInMs = now.getTime() - postDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return "방금 전";
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  if (diffInDays < 7) return `${diffInDays}일 전`;

  return postDate.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
};

/**
 * 날짜를 한국어로 포맷하는 함수
 * @param date ISO 문자열 형태의 날짜
 * @returns 한국어로 포맷된 날짜 문자열
 */
export const formatDate = (date: string): string => {
  const targetDate = new Date(date);
  const now = new Date();

  // 오늘인지 확인
  if (now.toDateString() === targetDate.toDateString()) {
    return "오늘";
  }

  // 어제인지 확인
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (yesterday.toDateString() === targetDate.toDateString()) {
    return "어제";
  }

  // 그 외의 경우
  return targetDate.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * 시간을 HH:MM 형태로 포맷하는 함수
 * @param date ISO 문자열 형태의 날짜
 * @returns HH:MM 형태의 시간 문자열
 */
export const formatTime = (date: string): string => {
  const targetDate = new Date(date);
  return targetDate.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

/**
 * 날짜와 시간을 함께 포맷하는 함수
 * @param date ISO 문자열 형태의 날짜
 * @returns 날짜와 시간이 포함된 문자열
 */
export const formatDateTime = (date: string): string => {
  const targetDate = new Date(date);
  const now = new Date();

  // 오늘인지 확인
  if (now.toDateString() === targetDate.toDateString()) {
    return `오늘 ${formatTime(date)}`;
  }

  // 어제인지 확인
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (yesterday.toDateString() === targetDate.toDateString()) {
    return `어제 ${formatTime(date)}`;
  }

  // 그 외의 경우
  return `${formatDate(date)} ${formatTime(date)}`;
};
