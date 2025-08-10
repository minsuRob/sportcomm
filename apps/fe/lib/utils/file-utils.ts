/**
 * 프론트엔드 파일 관련 유틸리티 함수들
 * 한글 파일명 처리 및 안전한 파일명 생성을 위한 공통 함수들
 */

/**
 * 파일명을 안전한 형태로 변환 (프론트엔드용)
 * @param fileName 원본 파일명
 * @returns 안전한 파일명
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return "";

  // 파일명과 확장자 분리
  const lastDotIndex = fileName.lastIndexOf(".");
  const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : "";
  const nameWithoutExt =
    lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;

  // 한글 및 특수문자를 안전한 문자로 변환
  const sanitizedName = nameWithoutExt
    .replace(/[^\w\-_.]/g, "_") // 영문, 숫자, 하이픈, 언더스코어, 점만 허용
    .replace(/_{2,}/g, "_") // 연속된 언더스코어를 하나로 변환
    .replace(/^_+|_+$/g, "") // 시작과 끝의 언더스코어 제거
    .substring(0, 50); // 파일명 길이 제한

  // 빈 문자열인 경우 기본값 사용
  const finalName = sanitizedName || "file";

  return `${finalName}${extension.toLowerCase()}`;
}

/**
 * 안전한 업로드 파일명 생성 (프론트엔드용)
 * @param originalName 원본 파일명
 * @param prefix 파일명 접두사 (선택적)
 * @param userId 사용자 ID (선택적)
 * @returns 안전한 업로드 파일명
 */
export function generateSafeFileName(
  originalName: string,
  prefix?: string,
  userId?: string
): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);

  // 확장자 추출
  const extension = getFileExtension(originalName);

  // 접두사 구성
  const prefixParts = [prefix, userId].filter(Boolean);
  const prefixString =
    prefixParts.length > 0 ? `${prefixParts.join("_")}_` : "";

  return `${prefixString}${timestamp}_${randomId}.${extension}`;
}

/**
 * 아바타 전용 파일명 생성 (프론트엔드용)
 * @param originalName 원본 파일명
 * @param userId 사용자 ID
 * @returns 아바타 파일명
 */
export function generateAvatarFileName(
  originalName: string,
  userId: string
): string {
  return generateSafeFileName(originalName, "avatar", userId);
}

/**
 * 게시물 미디어 파일명 생성 (프론트엔드용)
 * @param originalName 원본 파일명
 * @param mediaType 미디어 타입 ('image' | 'video')
 * @param index 파일 인덱스 (선택적)
 * @returns 게시물 미디어 파일명
 */
export function generatePostMediaFileName(
  originalName: string,
  mediaType: "image" | "video",
  index?: number
): string {
  const indexSuffix = typeof index === "number" ? `_${index}` : "";
  return generateSafeFileName(originalName, `post_${mediaType}${indexSuffix}`);
}

/**
 * 파일 확장자 추출
 * @param fileName 파일명
 * @returns 확장자 (점 제외)
 */
export function getFileExtension(fileName: string): string {
  if (!fileName) return "jpg";

  const parts = fileName.split(".");
  if (parts.length < 2) return "jpg";

  const extension = parts.pop()?.toLowerCase() || "jpg";

  // 알려진 확장자인지 확인
  const knownExtensions = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "heic",
    "heif",
    "mp4",
    "mov",
    "avi",
    "webm",
    "mkv",
    "3gp",
  ];

  return knownExtensions.includes(extension) ? extension : "jpg";
}

/**
 * MIME 타입에서 확장자 추론
 * @param mimeType MIME 타입
 * @returns 파일 확장자
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/webm": "webm",
    "video/x-matroska": "mkv",
    "video/3gpp": "3gp",
  };

  return mimeToExt[mimeType.toLowerCase()] || "jpg";
}

/**
 * 파일 크기를 사람이 읽기 쉬운 형태로 변환
 * @param bytes 바이트 크기
 * @returns 포맷된 크기 문자열
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * 파일명 유효성 검사 (프론트엔드용)
 * @param fileName 파일명
 * @returns 유효성 검사 결과
 */
export function validateFileName(fileName: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!fileName || fileName.trim() === "") {
    errors.push("파일명이 비어있습니다.");
  }

  if (fileName.length > 255) {
    errors.push("파일명이 너무 깁니다. (최대 255자)");
  }

  // 위험한 문자 검사
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(fileName)) {
    errors.push("파일명에 허용되지 않는 문자가 포함되어 있습니다.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 파일이 이미지인지 확인
 * @param fileName 파일명 또는 MIME 타입
 * @returns 이미지 여부
 */
export function isImageFile(fileName: string): boolean {
  const extension = getFileExtension(fileName).toLowerCase();
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"];
  return imageExtensions.includes(extension);
}

/**
 * 파일이 동영상인지 확인
 * @param fileName 파일명 또는 MIME 타입
 * @returns 동영상 여부
 */
export function isVideoFile(fileName: string): boolean {
  const extension = getFileExtension(fileName).toLowerCase();
  const videoExtensions = ["mp4", "mov", "avi", "webm", "mkv", "3gp"];
  return videoExtensions.includes(extension);
}
