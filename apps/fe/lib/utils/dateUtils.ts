/**
 * 날짜 및 시간 관련 유틸리티 함수
 *
 * UTC 시간 처리 정책:
 * - 업로드 기록: 항상 UTC로 저장됨 (백엔드에서 처리)
 * - 표시: 사용자의 현재 시간대에 맞춰 변환됨
 *
 * 예: 한국 시간으로 "오후 1시"에 올린 글이 뉴욕 사람에겐 "새벽 0시"로 표시될 수 있음
 */

/**
 * UTC 시간을 로컬 시간대로 변환하는 헬퍼 함수
 * @param utcString UTC ISO 문자열
 * @returns 로컬 시간대의 Date 객체
 */
const parseUTCDate = (utcString: string): Date => {
  if (__DEV__) {
    //console.log('🔍 parseUTCDate input:', utcString);
  }

  // UTC 형식의 ISO 문자열을 Date 객체로 변환
  // JavaScript의 Date 생성자는 UTC ISO 문자열을 자동으로 로컬 시간대로 변환함
  const date = new Date(utcString);

  if (__DEV__) {
    //console.log('🔍 parseUTCDate result:', date.toISOString());
    //console.log('🔍 parseUTCDate local:', date.toLocaleString());
  }

  return date;
};

/**
 * 시간 경과를 한국어로 표시하는 함수
 * @param createdAt ISO 문자열 형태의 날짜 (UTC)
 * @returns 한국어로 포맷된 시간 경과 문자열
 */

export const formatTimeAgo = (createdAt: string): string => {
  if (!createdAt) return "알 수 없음";

  // UTC 시간을 한국 시간으로 변환 (UTC + 9시간)
  let utcDate: Date;
  if (createdAt.endsWith('Z')) {
    utcDate = new Date(createdAt);
  } else {
    utcDate = new Date(createdAt + 'Z');
  }

  const kstTime = utcDate.getTime() + (9 * 60 * 60 * 1000);
  const postDateKST = new Date(kstTime);

  // 현재 시간을 한국 시간으로 변환
  const now = new Date();
  const nowKST = new Date(now.getTime() + (9 * 60 * 60 * 1000));

  // 둘 다 한국 시간으로 비교
  const diffInMs = nowKST.getTime() - postDateKST.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  // if (__DEV__) {
    //console.log('🕐 TIME DEBUG:', {
  //     input: createdAt,
  //     utcDate: utcDate.toISOString(),
  //     postDateKST: postDateKST.toLocaleString('ko-KR'),
  //     now: now.toLocaleString('ko-KR'),
  //     nowKST: nowKST.toLocaleString('ko-KR'),
  //     diffInHours,
  //     diffInMinutes
  //   });
  // }

  if (diffInMinutes < 1) return "방금 전";
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  if (diffInDays < 7) return `${diffInDays}일 전`;

  return postDateKST.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
};

/**
 * 날짜를 한국어로 포맷하는 함수
 * @param date ISO 문자열 형태의 날짜 (UTC)
 * @returns 한국어로 포맷된 날짜 문자열
 */
export const formatDate = (date: string): string => {
  // UTC 시간을 로컬 시간대로 변환
  const targetDate = parseUTCDate(date);
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
 * @param date ISO 문자열 형태의 날짜 (UTC)
 * @returns HH:MM 형태의 시간 문자열
 */
export const formatTime = (date: string): string => {
  // UTC 시간을 로컬 시간대로 변환
  const targetDate = parseUTCDate(date);
  return targetDate.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

/**
 * 날짜와 시간을 함께 포맷하는 함수
 * @param date ISO 문자열 형태의 날짜 (UTC)
 * @returns 날짜와 시간이 포함된 문자열
 */
export const formatDateTime = (date: string): string => {
  // UTC 시간을 로컬 시간대로 변환
  const targetDate = parseUTCDate(date);
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
