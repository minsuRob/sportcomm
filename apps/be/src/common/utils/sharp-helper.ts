/**
 * Sharp 공용 헬퍼 유틸
 * ------------------------------------------------------
 * 목적:
 *  - CJS / ESM 환경에 관계없이 sharp 인스턴스를 일관되게 생성
 *  - 반복되는 WebP 변환 / 메타데이터 추출 / 아바타 리사이즈 로직 공통화
 *  - 아바타 단일 규격(200x200) 처리 및 일반 이미지 품질 옵션 캡슐화
 *
 * 주요 기능:
 *  - getSharpFactory(): sharp 팩토리 함수 반환 (ESM/CJS 호환)
 *  - readImageMetadataSafe(): 예외로 서버 크래시 방지하는 메타데이터 추출
 *  - resizeToWebp(): 임의 크기 리사이즈 + webp 변환
 *  - convertToAvatarWebp(): 아바타 전용 200x200 cover + webp 변환
 *  - isAnimatedGif(): GIF 애니메이션 여부 단순 판별
 *
 * 사용 예:
 *  const { buffer } = await resizeToWebp(originalBuffer, { width: 800, maxHeight: 800 });
 *
 * 주의:
 *  - 본 유틸은 DB 액세스나 스토리지 업로드를 수행하지 않는다.
 *  - 호출 측에서 예외 처리(try/catch) 및 업로드 로직을 구현해야 한다.
 */

import * as sharpImport from 'sharp';

export interface ResizeToWebpOptions {
  /** 목표 너비 (width/height 둘 다 없으면 원본 유지) */
  width?: number;
  /** 목표 높이 */
  height?: number;
  /** 긴 변 기준 최대 픽셀 (width/height 중 하나만 지정하고 비율 유지 시 사용) */
  maxWidth?: number;
  maxHeight?: number;
  /** cover | contain | inside | outside | fill */
  fit?: keyof sharpImport.FitEnum;
  /** WebP 품질 (1~100) */
  quality?: number;
  /** 확대 방지 (기본 true) */
  withoutEnlargement?: boolean;
  /** 애니메이션 처리 여부 (GIF 등) */
  animated?: boolean;
  /** Effort (0~6) - 0 빠름 / 6 느림 */
  effort?: number;
}

export interface ResizeResult {
  buffer: Buffer;
  width?: number;
  height?: number;
  size: number;
  mimeType: string; // 항상 image/webp
  extension: string; // 항상 webp
}

/**
 * 내부: Sharp 팩토리 (CJS / ESM 호환)
 */
let _sharpFactory: any | null = null;

/**
 * Sharp 팩토리 반환
 * - 최초 1회 lazy 초기화
 */
export function getSharpFactory(): any {
  if (_sharpFactory) return _sharpFactory;
  // ESM default 혹은 CJS 함수 자체
  _sharpFactory = (sharpImport as any)?.default || (sharpImport as any);

  // 글로벌 옵션 (한 번만)
  try {
    if (_sharpFactory?.cache) {
      // 서버 메모리 사용량 제어
      _sharpFactory.cache(false);
    }
    if (_sharpFactory?.concurrency) {
      // 동시 처리 제한 (과도한 CPU 사용 방지)
      _sharpFactory.concurrency(2);
    }
  } catch {
    // 실패해도 치명적 아님
  }
  return _sharpFactory;
}

/**
 * GIF(애니메이션) 여부 판별 (간단한 MIME/확장자 기반)
 */
export function isAnimatedGif(mimeOrExt?: string): boolean {
  if (!mimeOrExt) return false;
  const lower = mimeOrExt.toLowerCase();
  return lower.endsWith('.gif') || lower === 'gif' || lower.includes('image/gif');
}

/**
 * 이미지 메타데이터 안전 추출
 *  - 실패 시 width/height 0 반환
 */
export async function readImageMetadataSafe(
  source: Buffer | string,
  animated: boolean = false,
): Promise<{ width: number; height: number; format?: string }> {
  try {
    const sharpFactory = getSharpFactory();
    const meta = await sharpFactory(source, {
      animated,
      failOn: 'none',
      limitInputPixels: false,
      sequentialRead: true,
    }).metadata();

    return {
      width: meta.width || 0,
      height: meta.height || 0,
      format: meta.format,
    };
  } catch {
    return { width: 0, height: 0 };
  }
}

/**
 * 일반 WebP 리사이즈 + 변환
 * - width / height 직접 지정 우선
 * - maxWidth / maxHeight 있으면 비율 유지 축소
 * - width/height 모두 미지정 시 원본 크기 유지
 */
export async function resizeToWebp(
  source: Buffer | string,
  options: ResizeToWebpOptions = {},
): Promise<ResizeResult> {
  const {
    width,
    height,
    maxWidth,
    maxHeight,
    fit = 'inside',
    quality = 85,
    withoutEnlargement = true,
    animated = false,
    effort = 4,
  } = options;

  const sharpFactory = getSharpFactory();
  const instance = sharpFactory(source, { animated });

  const meta = await instance.metadata();
  let targetWidth = width;
  let targetHeight = height;

  // 비율 유지 축소 로직 (width/height 명시 없을 때만 max 옵션 적용)
  if (!targetWidth && !targetHeight && (maxWidth || maxHeight) && meta.width && meta.height) {
    const originalW = meta.width;
    const originalH = meta.height;
    const wLimit = maxWidth || originalW;
    const hLimit = maxHeight || originalH;
    const ratio = Math.min(wLimit / originalW, hLimit / originalH, 1); // 확대 방지
    targetWidth = Math.floor(originalW * ratio);
    targetHeight = Math.floor(originalH * ratio);
  }

  const pipeline = instance.resize(targetWidth, targetHeight, {
    fit,
    withoutEnlargement,
  });

  const output = await pipeline
    .webp({
      quality,
      effort,
    })
    .toBuffer({ resolveWithObject: true });

  const outMeta = await sharpFactory(output.data, { animated }).metadata();

  return {
    buffer: output.data,
    width: outMeta.width,
    height: outMeta.height,
    size: output.data.length,
    mimeType: 'image/webp',
    extension: 'webp',
  };
}

/**
 * 아바타 전용 변환 (200x200 cover, webp)
 */
export async function convertToAvatarWebp(
  source: Buffer | string,
  opts?: { quality?: number; animated?: boolean },
): Promise<ResizeResult> {
  const quality = opts?.quality ?? 85;
  const animated = opts?.animated ?? true;

  return resizeToWebp(source, {
    width: 200,
    height: 200,
    fit: 'cover',
    quality,
    animated,
    withoutEnlargement: true,
    effort: 4,
  });
}

/**
 * 원본 그대로 webp 재인코딩 (크기 유지) - 필요 시 사용
 */
export async function reencodeToWebp(
  source: Buffer | string,
  opts?: { quality?: number; animated?: boolean },
): Promise<ResizeResult> {
  return resizeToWebp(source, {
    quality: opts?.quality ?? 85,
    animated: opts?.animated ?? false,
  });
}

/**
 * Sharp 초기화 여부 (디버깅용)
 */
export function isSharpInitialized(): boolean {
  return !!_sharpFactory;
}

/**
 * 강제 초기화 (서버 부팅 시 프리로드 용도)
 */
export function ensureSharpInitialized(): void {
  getSharpFactory();
}

// --------------------------------------------------
// (선택) 디버깅 헬퍼
// --------------------------------------------------
export function debugSharpMeta(label: string, meta: any): void {
  try {
    // 너무 장황해지지 않도록 핵심만
    // eslint-disable-next-line no-console
    console.log(
      `[sharp:meta:${label}] format=${meta?.format} ${meta?.width}x${meta?.height} size=${meta?.size ?? 'n/a'}`,
    );
  } catch {
    /* noop */
  }
}

/**
 * 에러 메시지 단순화 (로그 외부로 노출 시)
 */
export function simplifySharpError(error: any): string {
  if (!error) return '이미지 처리 오류';
  const msg: string = error.message || String(error);
  if (msg.includes('unsupported image format')) {
    return '지원되지 않는 이미지 형식입니다.';
  }
  if (msg.includes('Input file is missing')) {
    return '이미지 파일을 찾을 수 없습니다.';
  }
  if (msg.includes('Input file contains truncated')) {
    return '손상된 이미지 파일입니다.';
  }
  return '이미지 처리 중 오류가 발생했습니다.';
}

// commit: feat: add shared sharp helper util for unified image processing
