/**
 * 날짜 및 시간 관련 유틸리티 함수
 *
 * UTC 시간 처리 정책:
 * - 업로드 기록: 항상 UTC로 저장됨 (백엔드에서 처리)
 * - 표시: 브라우저의 로컬 시간대로 자동 변환됨
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

  // UTC 시간을 정확히 파싱하여 로컬 시간대로 변환
  let utcDate: Date;

  // 이미 UTC 표시가 있는 경우
  if (utcString.endsWith('Z')) {
    utcDate = new Date(utcString);
  } else {
    // UTC 표시가 없는 경우 추가
    utcDate = new Date(utcString + 'Z');
  }

  if (__DEV__) {
    //console.log('🔍 parseUTCDate input UTC:', utcString);
    //console.log('🔍 parseUTCDate parsed UTC:', utcDate.toISOString());
    //console.log('🔍 parseUTCDate local time:', utcDate.toLocaleString());
    //console.log('🔍 Local timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
  }

  return utcDate;
};

/**
 * UTC 시간을 로컬 시간대로 변환하는 헬퍼 함수
 * @param utcString UTC ISO 문자열
 * @returns 브라우저 로컬 시간대의 Date 객체
 */
const parseLocalTime = (utcString: string): Date => {
  // UTC 시간을 파싱하여 로컬 시간대로 자동 변환
  let utcDate: Date;
  if (utcString.endsWith('Z')) {
    utcDate = new Date(utcString);
  } else {
    utcDate = new Date(utcString + 'Z');
  }

  // 한국 시간으로 변환 (UTC + 9시간)
  const koreanTime = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000));


  // 한국 시간으로 변환하여 반환
  return koreanTime;
};

/**
 * 현재 시간을 한국 시간으로 반환하는 헬퍼 함수
 * @returns 한국 시간대의 현재 Date 객체
 */
const getCurrentLocalTime = (): Date => {
  // 현재 시간을 한국 시간으로 변환
  const now = new Date();
  const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));



  return koreanTime;
};

/**
 * 날짜 비교를 위한 헬퍼 함수들
 */
const getDateOnly = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const isSameDate = (date1: Date, date2: Date): boolean => {
  return getDateOnly(date1).getTime() === getDateOnly(date2).getTime();
};

const isYesterday = (targetDate: Date, baseDate: Date): boolean => {
  const yesterday = new Date(baseDate);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDate(targetDate, yesterday);
};

/**
 * 시간 경과를 한국어로 표시하는 함수 (브라우저 로컬 시간대로 자동 변환)
 * @param createdAt ISO 문자열 형태의 날짜 (UTC)
 * @returns 한국어로 포맷된 시간 경과 문자열
 */

export const formatTimeAgo = (createdAt: string): string => {
  if (!createdAt) return "알 수 없음";

  // UTC 시간을 로컬 시간으로 변환
  const postDateLocal = parseLocalTime(createdAt);

  // 현재 시간을 로컬 시간으로 사용
  const nowLocal = getCurrentLocalTime();

  // 둘 다 로컬 시간으로 비교
  const diffInMs = nowLocal.getTime() - postDateLocal.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);



  if (diffInMinutes < 1) return "방금 전";
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  if (diffInDays < 7) return `${diffInDays}일 전`;

  return postDateLocal.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
};

/**
 * 날짜를 한국어로 포맷하는 함수 (브라우저 로컬 시간대로 자동 변환)
 * @param date ISO 문자열 형태의 날짜 (UTC)
 * @returns 한국어로 포맷된 날짜 문자열
 */
export const formatDate = (date: string): string => {
  // UTC 시간을 로컬 시간으로 변환
  const targetDate = parseLocalTime(date);
  const nowLocal = getCurrentLocalTime();

  // 오늘인지 확인
  if (isSameDate(targetDate, nowLocal)) {
    return "오늘";
  }

  // 어제인지 확인
  if (isYesterday(targetDate, nowLocal)) {
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
 * 시간을 HH:MM 형태로 포맷하는 함수 (브라우저 로컬 시간대로 자동 변환)
 * @param date ISO 문자열 형태의 날짜 (UTC)
 * @returns HH:MM 형태의 시간 문자열
 */
export const formatTime = (date: string): string => {
  // UTC 시간을 로컬 시간으로 변환
  const targetDate = parseLocalTime(date);
  return targetDate.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

/**
 * 날짜와 시간을 함께 포맷하는 함수 (브라우저 로컬 시간대로 자동 변환)
 * @param date ISO 문자열 형태의 날짜 (UTC)
 * @returns 날짜와 시간이 포함된 문자열
 */
export const formatDateTime = (date: string): string => {
  // UTC 시간을 로컬 시간으로 변환
  const targetDate = parseLocalTime(date);
  const nowLocal = getCurrentLocalTime();



  // 오늘인지 확인
  if (isSameDate(targetDate, nowLocal)) {
    return `오늘 ${formatTime(date)}`;
  }

  // 어제인지 확인
  if (isYesterday(targetDate, nowLocal)) {
    return `어제 ${formatTime(date)}`;
  }

  // 그 외의 경우
  return `${formatDate(date)} ${formatTime(date)}`;
};
