import * as path from 'path';

/**
 * 파일 관련 유틸리티 함수들
 * 한글 파일명 처리 및 안전한 파일명 생성을 위한 공통 함수들
 */

/**
 * 파일명을 Supabase Storage에 안전한 형태로 변환
 * @param fileName 원본 파일명
 * @returns 안전한 파일명
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return '';

  // 파일명과 확장자 분리
  const extension = path.extname(fileName);
  const nameWithoutExt = path.basename(fileName, extension);

  // 한글 및 특수문자를 안전한 문자로 변환
  const sanitizedName = nameWithoutExt
    .replace(/[^\w\-_.]/g, '_') // 영문, 숫자, 하이픈, 언더스코어, 점만 허용
    .replace(/_{2,}/g, '_') // 연속된 언더스코어를 하나로 변환
    .replace(/^_+|_+$/g, '') // 시작과 끝의 언더스코어 제거
    .substring(0, 50); // 파일명 길이 제한

  // 빈 문자열인 경우 기본값 사용
  const finalName = sanitizedName || 'file';

  return `${finalName}${extension.toLowerCase()}`;
}

/**
 * 안전한 업로드 파일명 생성
 * @param originalName 원본 파일명
 * @param prefix 파일명 접두사 (선택적)
 * @param userId 사용자 ID (선택적)
 * @returns 안전한 업로드 파일명
 */
export function generateSafeFileName(
  originalName: string,
  prefix?: string,
  userId?: string,
): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const extension = path.extname(originalName).toLowerCase();

  // 확장자가 없는 경우 기본값 설정
  const safeExtension = extension || '.jpg';

  // 접두사 구성
  const prefixParts = [prefix, userId].filter(Boolean);
  const prefixString =
    prefixParts.length > 0 ? `${prefixParts.join('_')}_` : '';

  return `${prefixString}${timestamp}_${randomId}${safeExtension}`;
}

/**
 * 아바타 전용 파일명 생성
 * @param originalName 원본 파일명
 * @param userId 사용자 ID
 * @returns 아바타 파일명
 */
export function generateAvatarFileName(
  originalName: string,
  userId: string,
): string {
  return generateSafeFileName(originalName, 'avatar', userId);
}

/**
 * 게시물 미디어 파일명 생성
 * @param originalName 원본 파일명
 * @param mediaType 미디어 타입 ('image' | 'video')
 * @returns 게시물 미디어 파일명
 */
export function generatePostMediaFileName(
  originalName: string,
  mediaType: 'image' | 'video',
): string {
  return generateSafeFileName(originalName, `post_${mediaType}`);
}

/**
 * 파일 확장자에서 MIME 타입 추론
 * @param fileName 파일명
 * @returns MIME 타입
 */
export function getMimeTypeFromFileName(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase().substring(1);

  const mimeTypes: Record<string, string> = {
    // 이미지
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
    // 동영상
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    '3gp': 'video/3gpp',
  };

  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * 파일 크기를 사람이 읽기 쉬운 형태로 변환
 * @param bytes 바이트 크기
 * @returns 포맷된 크기 문자열
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 파일명 유효성 검사
 * @param fileName 파일명
 * @returns 유효성 검사 결과
 */
export function validateFileName(fileName: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!fileName || fileName.trim() === '') {
    errors.push('파일명이 비어있습니다.');
  }

  if (fileName.length > 255) {
    errors.push('파일명이 너무 깁니다. (최대 255자)');
  }

  // 위험한 문자 검사
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(fileName)) {
    errors.push('파일명에 허용되지 않는 문자가 포함되어 있습니다.');
  }

  // 예약된 파일명 검사 (Windows)
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
  if (reservedNames.test(fileName)) {
    errors.push('예약된 파일명은 사용할 수 없습니다.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
