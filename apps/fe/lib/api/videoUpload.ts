/**
 * 동영상 업로드 전용 유틸리티
 *
 * 웹과 모바일 환경에서 동영상 파일 업로드 및 압축 기능을 제공합니다.
 */

import { Platform } from "react-native";
import { getSession } from "@/lib/auth";
import { isWeb, isReactNative } from "@/lib/platform";

// react-native-compressor는 조건부로 import (웹에서 문제 발생 방지)
let Video: any = null;
try {
  if (!isWeb()) {
    Video = require("react-native-compressor").Video;
  }
} catch (error) {
  console.warn("react-native-compressor를 로드할 수 없습니다:", error);
}
import {
  UploadProgress,
  ProgressCallback,
  UploadedMedia,
  UploadError,
  getUploadEndpoints,
  getMimeTypeFromUri,
} from "./common";

// --------------------------
// 동영상 전용 타입 정의
// --------------------------

export interface VideoUploadResponse {
  success: boolean;
  message: string;
  data: {
    files: UploadedMedia[];
    totalCount: number;
  };
  timestamp: string;
}

export interface VideoSingleUploadResponse {
  success: boolean;
  message: string;
  data: UploadedMedia;
  timestamp: string;
}

export interface SelectedVideo {
  uri: string;
  width?: number;
  height?: number;
  duration?: number; // 동영상 길이 (초)
  fileSize?: number;
  mimeType?: string;
  name?: string;
}

export interface VideoCompressionOptions {
  quality?: "low" | "medium" | "high";
  maxWidth?: number;
  maxHeight?: number;
  bitrate?: number; // kbps
  fps?: number; // frames per second
}

// --------------------------
// 동영상 압축 함수
// --------------------------

/**
 * 모바일 환경에서 동영상 압축
 * @param uri 동영상 URI
 * @param options 압축 옵션
 * @returns 압축된 동영상 정보
 */
export async function compressVideoMobile(
  uri: string,
  options: VideoCompressionOptions = {},
): Promise<SelectedVideo> {
  if (!isReactNative()) {
    throw new Error("이 함수는 모바일 환경에서만 사용할 수 있습니다.");
  }

  if (!Video) {
    throw new Error("react-native-compressor를 로드할 수 없습니다.");
  }

  const {
    quality = "medium",
    maxWidth = 1280,
    maxHeight = 720,
    bitrate = 1000,
    fps = 30,
  } = options;

  try {
    //console.log(`모바일 동영상 압축 시작: ${uri.substring(0, 50)}...`);

    // react-native-compressor를 사용한 동영상 압축
    const compressedUri = await Video.compress(
      uri,
      {
        compressionMethod: "auto",
        getCancellationId: (cancellationId) => {
          //console.log(`압축 작업 ID: ${cancellationId}`);
        },
        progressDivider: 10,
        includeAudio: true,
        minimumFileSizeForCompress: 2, // 2MB 이상일 때만 압축
      },
      (progress) => {
        //console.log(`압축 진행률: ${progress}%`);
      },
    );

    //console.log(`동영상 압축 완료: ${compressedUri}`);

    // 압축된 동영상의 메타데이터 가져오기
    const videoInfo = await Video.getVideoMetaData(compressedUri);

    return {
      uri: compressedUri,
      width: videoInfo.width,
      height: videoInfo.height,
      duration: videoInfo.duration,
      fileSize: videoInfo.size,
      mimeType: "video/mp4", // 압축 후 항상 mp4
      name: `compressed_video_${Date.now()}.mp4`,
    };
  } catch (error) {
    console.error("모바일 동영상 압축 실패:", error);
    throw error;
  }
}

/**
 * 웹 환경에서 동영상 압축 (제한적 지원)
 * @param file 동영상 File 객체
 * @param options 압축 옵션
 * @returns 압축된 동영상 File 객체
 */
export async function compressVideoWeb(
  file: File,
  options: VideoCompressionOptions = {},
): Promise<File> {
  if (!isWeb()) {
    throw new Error("이 함수는 웹 환경에서만 사용할 수 있습니다.");
  }

  // 웹에서는 동영상 압축이 제한적이므로 원본 반환
  // 실제 압축이 필요한 경우 WebAssembly 기반 FFmpeg 사용 가능
  console.warn("웹 환경에서는 동영상 압축이 제한적입니다. 원본을 사용합니다.");

  return file;
}

// --------------------------
// 동영상 업로드 함수
// --------------------------

/**
 * 동영상 파일 업로드 (웹/모바일 통합)
 * @param videos 업로드할 동영상 배열
 * @param onProgress 진행률 콜백 함수
 * @returns 업로드된 미디어 파일 정보 배열
 */
export async function uploadVideos(
  videos: Array<SelectedVideo | File>,
  onProgress?: ProgressCallback,
): Promise<UploadedMedia[]> {
  try {
    // 동영상 유효성 검증
    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      console.warn("uploadVideos: 업로드할 동영상이 없습니다.");
      return [];
    }

    // 최대 동영상 개수 검증 (동영상은 용량이 크므로 1개로 제한)
    if (videos.length > 1) {
      throw new UploadError("최대 1개의 동영상만 업로드할 수 있습니다.", 400);
    }

    //console.log(`${videos.length}개 동영상 업로드 시작`);

    // 인증 토큰 가져오기
    const { token } = await getSession();
    if (!token) {
      throw new UploadError("인증 토큰이 없습니다. 로그인이 필요합니다.", 401);
    }

    // FormData 생성
    const formData = new FormData();

    // 동영상 파일 추가
    for (let index = 0; index < videos.length; index++) {
      const video = videos[index];

      if (video instanceof File) {
        // 웹 환경 - File 객체
        formData.append("files", video, video.name);
        //console.log(
        //   `웹 환경 - 동영상 추가: ${video.name}, 크기: ${video.size}바이트`,
        // );
      } else {
        // 모바일 환경 - SelectedVideo 객체
        const fileName = video.name || `video_${index}_${Date.now()}.mp4`;
        const mimeType = video.mimeType || getMimeTypeFromUri(video.uri);

        // @ts-ignore: React Native의 FormData는 객체 형식 지원
        formData.append("files", {
          uri: video.uri,
          name: fileName,
          type: mimeType,
        });

        //console.log(
        //   `모바일 환경 - 동영상 추가: ${fileName}, URI: ${video.uri.substring(0, 30)}...`,
        // );
      }
    }

    const endpoints = getUploadEndpoints();

    // XMLHttpRequest 사용 (진행률 추적을 위함)
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // 진행률 이벤트 핸들러
      if (onProgress) {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress: UploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            };
            onProgress(progress);
          }
        });
      }

      // 요청 완료 핸들러
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(
              xhr.responseText,
            ) as VideoUploadResponse;
            if (response.success) {
              //console.log(
              //   "동영상 업로드 성공:",
              //   response.data.totalCount,
              //   "개 파일",
              // );
              resolve(response.data.files);
            } else {
              reject(
                new UploadError(
                  response.message || "업로드 실패",
                  xhr.status,
                  response,
                ),
              );
            }
          } catch (parseError) {
            reject(
              new UploadError(
                `응답 파싱 오류: ${parseError.message || "알 수 없는 오류"}`,
                xhr.status,
              ),
            );
          }
        } else {
          let errorMessage = "동영상 업로드 실패";
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            errorMessage = errorResponse.message || errorMessage;
          } catch (e) {
            // 파싱 실패 시 기본 메시지 사용
          }
          reject(new UploadError(errorMessage, xhr.status, xhr.responseText));
        }
      });

      // 오류 이벤트 핸들러
      xhr.addEventListener("error", () => {
        reject(new UploadError("네트워크 오류가 발생했습니다."));
      });

      // 요청 취소 이벤트 핸들러
      xhr.addEventListener("abort", () => {
        reject(new UploadError("업로드가 취소되었습니다."));
      });

      // 요청 초기화 및 전송
      xhr.open("POST", endpoints.upload, true);

      // 인증 헤더 설정
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      // 웹에서 추가 헤더 설정
      if (isWeb()) {
        xhr.setRequestHeader("Accept", "application/json");
      }

      // FormData는 자동으로 multipart/form-data 콘텐츠 타입 설정
      xhr.send(formData);
    });
  } catch (error) {
    console.error("동영상 업로드 오류:", error);
    throw error instanceof UploadError
      ? error
      : new UploadError(error.message || "알 수 없는 동영상 업로드 오류");
  }
}

/**
 * 단일 동영상 파일 업로드
 * @param video 업로드할 동영상
 * @param onProgress 진행률 콜백 함수
 * @returns 업로드된 미디어 파일 정보
 */
export async function uploadSingleVideo(
  video: SelectedVideo | File,
  onProgress?: ProgressCallback,
): Promise<UploadedMedia> {
  const result = await uploadVideos([video], onProgress);
  if (result.length === 0) {
    throw new UploadError("동영상 업로드에 실패했습니다.");
  }
  return result[0];
}

// --------------------------
// 동영상 메타데이터 추출 함수
// --------------------------

/**
 * 동영상 파일에서 메타데이터 추출
 * @param videoUri 동영상 URI 또는 File 객체
 * @returns 동영상 메타데이터
 */
export async function getVideoMetadata(videoUri: string | File): Promise<{
  width: number;
  height: number;
  duration: number;
  fileSize: number;
}> {
  if (isReactNative() && typeof videoUri === "string") {
    // 모바일 환경
    if (!Video) {
      console.warn("react-native-compressor를 사용할 수 없습니다.");
      return {
        width: 0,
        height: 0,
        duration: 0,
        fileSize: 0,
      };
    }

    try {
      const metadata = await Video.getVideoMetaData(videoUri);
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        duration: metadata.duration || 0,
        fileSize: metadata.size || 0,
      };
    } catch (error) {
      console.error("모바일 동영상 메타데이터 추출 실패:", error);
      return {
        width: 0,
        height: 0,
        duration: 0,
        fileSize: 0,
      };
    }
  } else if (isWeb() && videoUri instanceof File) {
    // 웹 환경
    return new Promise((resolve) => {
      try {
        const video = document.createElement("video");
        video.preload = "metadata";

        const cleanup = () => {
          try {
            if (video.src) {
              URL.revokeObjectURL(video.src);
            }
          } catch (e) {
            console.warn("URL cleanup 실패:", e);
          }
        };

        video.onloadedmetadata = () => {
          resolve({
            width: video.videoWidth || 0,
            height: video.videoHeight || 0,
            duration: video.duration || 0,
            fileSize: videoUri.size || 0,
          });
          cleanup();
        };

        video.onerror = (error) => {
          console.error("웹 동영상 메타데이터 추출 실패:", error);
          resolve({
            width: 0,
            height: 0,
            duration: 0,
            fileSize: videoUri.size || 0,
          });
          cleanup();
        };

        // 타임아웃 설정 (5초)
        setTimeout(() => {
          console.warn("동영상 메타데이터 추출 타임아웃");
          resolve({
            width: 0,
            height: 0,
            duration: 0,
            fileSize: videoUri.size || 0,
          });
          cleanup();
        }, 5000);

        video.src = URL.createObjectURL(videoUri);
      } catch (error) {
        console.error("웹 동영상 메타데이터 추출 중 오류:", error);
        resolve({
          width: 0,
          height: 0,
          duration: 0,
          fileSize: videoUri.size || 0,
        });
      }
    });
  } else {
    throw new Error("지원되지 않는 환경 또는 파일 형식입니다.");
  }
}

/**
 * 동영상 파일 형식 검증
 * @param file 검증할 파일
 * @returns 유효한 동영상 파일 여부
 */
export function isValidVideoFile(file: File | SelectedVideo): boolean {
  const supportedTypes = [
    "video/mp4",
    "video/quicktime", // .mov
    "video/x-msvideo", // .avi
    "video/webm",
  ];

  if (file instanceof File) {
    return supportedTypes.includes(file.type);
  } else {
    const mimeType = file.mimeType || getMimeTypeFromUri(file.uri);
    return supportedTypes.includes(mimeType);
  }
}

/**
 * 동영상 썸네일 생성 (모바일 전용)
 * @param videoUri 동영상 URI
 * @param timeStamp 썸네일을 추출할 시간 (초)
 * @returns 썸네일 이미지 URI
 */
export async function generateVideoThumbnail(
  videoUri: string,
  timeStamp: number = 1,
): Promise<string> {
  if (!isReactNative()) {
    throw new Error("썸네일 생성은 모바일 환경에서만 지원됩니다.");
  }

  if (!Video) {
    throw new Error("react-native-compressor를 로드할 수 없습니다.");
  }

  try {
    // react-native-compressor의 썸네일 생성 기능 사용
    const thumbnailUri = await Video.getVideoThumbnail(videoUri, {
      timeStamp: timeStamp * 1000, // 밀리초로 변환
      quality: "medium",
    });

    //console.log(`동영상 썸네일 생성 완료: ${thumbnailUri}`);
    return thumbnailUri;
  } catch (error) {
    console.error("동영상 썸네일 생성 실패:", error);
    throw error;
  }
}
