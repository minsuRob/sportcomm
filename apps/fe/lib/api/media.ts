import { getSession } from "@/lib/auth";

/**
 * 업로드된 미디어 정보 타입
 */
export interface UploadedMedia {
  id: string;
  url: string;
  type: string;
  filename: string;
  size: number;
}

/**
 * 이미지 업로드 응답 타입
 */
interface UploadResponse {
  success: boolean;
  message: string;
  data: UploadedMedia[];
}

/**
 * 이미지 파일들을 서버에 업로드합니다.
 *
 * @param imageUris - 업로드할 이미지 URI 배열
 * @returns 업로드된 미디어 정보 배열
 */
export async function uploadImages(
  imageUris: string[]
): Promise<UploadedMedia[]> {
  try {
    // 인증 토큰 가져오기
    const { token } = await getSession();
    if (!token) {
      throw new Error("로그인이 필요합니다.");
    }

    // FormData 생성
    const formData = new FormData();

    for (let i = 0; i < imageUris.length; i++) {
      const uri = imageUris[i];

      // React Native에서 파일 객체 생성
      const fileObject = {
        uri: uri,
        type: "image/jpeg",
        name: `image_${i}.jpg`,
      };

      // FormData에 파일 추가
      formData.append("files", fileObject as any);
    }

    // 서버에 업로드 요청
    const uploadResponse = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/media/upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Content-Type은 FormData 사용 시 자동으로 설정됨
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`업로드 실패: ${uploadResponse.status} ${errorText}`);
    }

    const result: UploadResponse = await uploadResponse.json();

    if (!result.success) {
      throw new Error(result.message || "업로드에 실패했습니다.");
    }

    return result.data;
  } catch (error) {
    console.error("이미지 업로드 오류:", error);
    throw error;
  }
}

/**
 * 단일 이미지 업로드 (편의 함수)
 *
 * @param imageUri - 업로드할 이미지 URI
 * @returns 업로드된 미디어 정보
 */
export async function uploadSingleImage(
  imageUri: string
): Promise<UploadedMedia> {
  const results = await uploadImages([imageUri]);
  return results[0];
}
