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
 * 한국 시간으로 명시적으로 변환하는 헬퍼 함수
 * @param utcString UTC ISO 문자열
 * @returns 한국 시간대의 Date 객체
 */
const parseKoreanTime = (utcString: string): Date => {
  // UTC 시간을 파싱
  let utcDate: Date;
  if (utcString.endsWith('Z')) {
    utcDate = new Date(utcString);
  } else {
    utcDate = new Date(utcString + 'Z');
  }

  // 한국 시간으로 변환 (UTC + 9시간)
  const koreanTime = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000));

  return koreanTime;
};

/**
 * 현재 시간을 한국 시간으로 변환하는 헬퍼 함수
 * @returns 한국 시간대의 현재 Date 객체
 */
const getCurrentKoreanTime = (): Date => {
  // JavaScript Date 객체는 이미 브라우저의 로컬 시간대로 작동
  // 한국 시간대에서는 이미 한국 시간임
  return new Date();
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
 * 시간 경과를 한국어로 표시하는 함수 (사용자의 로컬 시간대로 변환)
 * @param createdAt ISO 문자열 형태의 날짜 (UTC)
 * @returns 한국어로 포맷된 시간 경과 문자열
 */

export const formatTimeAgo = (createdAt: string): string => {
  if (!createdAt) return "알 수 없음";

  // UTC 시간을 한국 시간으로 변환 (더 정확한 시간 표시를 위해)
  const postDateKorean = parseKoreanTime(createdAt);

  // 현재 시간을 한국 시간으로 사용 (JavaScript Date는 이미 로컬 시간임)
  const nowKorean = getCurrentKoreanTime();

  // 둘 다 한국 시간으로 비교
  const diffInMs = nowKorean.getTime() - postDateKorean.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  // 디버깅 로그 (필요시 활성화)
  //console.log('🕐 TIME DEBUG (한국 시간):', {
  //  input: createdAt,
  //  postDateKorean: postDateKorean.toLocaleString('ko-KR'),
  //  nowKorean: nowKorean.toLocaleString('ko-KR'),
  //  localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  //  diffInMinutes,
  //  diffInHours,
  //  diffInDays,
  //  result: diffInHours > 0 ? `${diffInHours}시간 전` : diffInMinutes > 0 ? `${diffInMinutes}분 전` : "방금 전"
  //});

  if (diffInMinutes < 1) return "방금 전";
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  if (diffInDays < 7) return `${diffInDays}일 전`;

  return postDateKorean.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
};

/**
 * 날짜를 한국어로 포맷하는 함수 (사용자의 로컬 시간대로 변환)
 * @param date ISO 문자열 형태의 날짜 (UTC)
 * @returns 한국어로 포맷된 날짜 문자열
 */
export const formatDate = (date: string): string => {
  // UTC 시간을 한국 시간으로 변환
  const targetDate = parseKoreanTime(date);
  const nowKorean = getCurrentKoreanTime();

  // 오늘인지 확인
  if (isSameDate(targetDate, nowKorean)) {
    return "오늘";
  }

  // 어제인지 확인
  if (isYesterday(targetDate, nowKorean)) {
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
 * 시간을 HH:MM 형태로 포맷하는 함수 (사용자의 로컬 시간대로 변환)
 * @param date ISO 문자열 형태의 날짜 (UTC)
 * @returns HH:MM 형태의 시간 문자열
 */
export const formatTime = (date: string): string => {
  // UTC 시간을 한국 시간으로 변환
  const targetDate = parseKoreanTime(date);
  return targetDate.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

/**
 * 날짜와 시간을 함께 포맷하는 함수 (사용자의 로컬 시간대로 변환)
 * @param date ISO 문자열 형태의 날짜 (UTC)
 * @returns 날짜와 시간이 포함된 문자열
 */
export const formatDateTime = (date: string): string => {
  // UTC 시간을 한국 시간으로 변환
  const targetDate = parseKoreanTime(date);
  const nowKorean = getCurrentKoreanTime();

  // 디버깅 로그 (문제 해결을 위해 임시 활성화)
  console.log('🕐 formatDateTime 디버깅:', {
    input: date,
    targetDate: targetDate.toLocaleString('ko-KR'),
    nowKorean: nowKorean.toLocaleString('ko-KR'),
    currentLocal: new Date().toLocaleString('ko-KR'),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  // 오늘인지 확인
  if (isSameDate(targetDate, nowKorean)) {
    return `오늘 ${formatTime(date)}`;
  }

  // 어제인지 확인
  if (isYesterday(targetDate, nowKorean)) {
    return `어제 ${formatTime(date)}`;
  }

  // 그 외의 경우
  return `${formatDate(date)} ${formatTime(date)}`;
};
