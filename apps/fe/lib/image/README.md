# 이미지 최적화 유틸리티

이 모듈은 React Native 앱에서 이미지 크기 최적화와 관련된 공통 기능을 제공합니다.

## 주요 기능

### 1. 이미지 크기 자동 계산

- 원본 이미지의 크기를 가져와서 화면 크기에 맞게 최적화
- 최소/최대 높이 제한 적용
- 기본 가로세로 비율 설정

### 2. 커스텀 훅 제공

- `useImageDimensions`: 범용 이미지 크기 계산 훅
- `usePostImageDimensions`: 게시물 이미지 전용 훅
- `useStoryImageDimensions`: 스토리 이미지 전용 훅

## 사용 방법

### 게시물 이미지

```typescript
import { usePostImageDimensions } from "@/lib/image";

const { imageAspectRatio, imageHeight, imageLoading, error } =
  usePostImageDimensions(imageUrl);
```

### 스토리 이미지

```typescript
import { useStoryImageDimensions } from "@/lib/image";

const { imageAspectRatio, imageHeight, imageLoading, error } =
  useStoryImageDimensions(imageUrl);
```

### 커스텀 설정

```typescript
import { useImageDimensions } from "@/lib/image";

const { imageAspectRatio, imageHeight, imageLoading, error } =
  useImageDimensions(imageUrl, {
    minHeight: 200,
    maxHeightRatio: 0.5,
    defaultAspectRatio: 4 / 3,
  });
```

## 상수

```typescript
export const IMAGE_CONSTANTS = {
  MIN_HEIGHT: 300, // 최소 이미지 높이
  DEFAULT_ASPECT_RATIO: 16 / 9, // 기본 가로세로 비율
  MAX_HEIGHT_RATIO: 0.6, // 화면 대비 최대 높이 비율
  STORY_ASPECT_RATIO: 16 / 9, // 스토리 이미지 비율
};
```

## 성능 최적화

- 이미지 로딩 타임아웃 설정
- 메모리 효율적인 크기 계산
- 불필요한 리렌더링 방지
- iOS/Android 플랫폼별 최적화

## 사용 중인 컴포넌트

- `PostCard.tsx`: 게시물 이미지 최적화
- `StorySection.tsx`: 스토리 이미지 (고정 크기 사용)

## 주의사항

- 이미지 URL이 null이거나 유효하지 않은 경우 기본값 사용
- 네트워크 오류 시 적절한 에러 처리
- iOS에서 큰 이미지 로딩 시 메모리 주의
