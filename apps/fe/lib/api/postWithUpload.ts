import {
  UploadedMedia,
  UploadError,
  uploadFilesWithProgress,
  ProgressCallback,
} from "./restUpload";
import { client } from "./client";
import { gql } from "@apollo/client";

/**
 * 게시물 생성 GraphQL 뮤테이션
 */
const CREATE_POST_MUTATION = gql`
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      title
      content
      type
      isPublic
      author {
        id
        nickname
        profileImageUrl
      }
      media {
        id
        url
        originalName
        type
        thumbnailUrl
      }
      likeCount
      commentCount
      shareCount
      viewCount
      createdAt
      updatedAt
    }
  }
`;

/**
 * 게시물 생성 입력 타입
 */
export interface CreatePostInput {
  title: string;
  content: string;
  type: "ANALYSIS" | "CHEERING" | "HIGHLIGHT";
  isPublic?: boolean;
  mediaIds?: string[];
}

/**
 * 파일과 함께 게시물 생성 입력 타입
 */
export interface CreatePostWithFilesInput {
  title: string;
  content: string;
  type: "ANALYSIS" | "CHEERING" | "HIGHLIGHT";
  isPublic?: boolean;
  files?: File[] | any[]; // 웹 File 객체 또는 React Native 파일 객체
  onProgress?: (progress: {
    percentage: number;
    loaded: number;
    total: number;
  }) => void; // 업로드 진행률 콜백
}

/**
 * 게시물 생성 응답 타입
 */
export interface CreatePostResponse {
  id: string;
  title: string;
  content: string;
  type: string;
  isPublic: boolean;
  author: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
  media: Array<{
    id: string;
    url: string;
    originalName: string;
    type: string;
    thumbnailUrl?: string;
  }>;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 통합 에러 타입
 */
export class PostCreationError extends Error {
  constructor(
    message: string,
    public phase: "upload" | "post_creation",
    public originalError?: any,
  ) {
    super(message);
    this.name = "PostCreationError";
  }
}

/**
 * 파일 업로드와 게시물 생성을 통합한 함수
 *
 * 1. 파일이 있으면 먼저 REST API로 업로드
 * 2. 업로드된 파일 ID들을 사용하여 GraphQL로 게시물 생성
 *
 * @param input 게시물 생성 입력 데이터
 * @returns 생성된 게시물 정보
 */
export async function createPostWithFiles(
  input: CreatePostWithFilesInput,
): Promise<CreatePostResponse> {
  try {
    let mediaIds: string[] = [];

    // 1단계: 파일 업로드 (파일이 있는 경우)
    if (input.files && input.files.length > 0) {
      console.log(`${input.files.length}개의 파일 업로드 시작...`);

      // 진행 상황 콜백 함수가 input에 있는 경우 사용
      const progressCallback = (input as any).onProgress as
        | ProgressCallback
        | undefined;

      try {
        const uploadedFiles = await uploadFilesWithProgress(
          input.files,
          progressCallback,
        );
        mediaIds = uploadedFiles.map((file) => file.id);

        console.log("파일 업로드 완료:", {
          uploadedCount: uploadedFiles.length,
          mediaIds,
        });
      } catch (uploadError) {
        console.error("파일 업로드 실패:", uploadError);

        if (uploadError instanceof UploadError) {
          throw new PostCreationError(
            `파일 업로드 실패: ${uploadError.message}`,
            "upload",
            uploadError,
          );
        }

        throw new PostCreationError(
          "파일 업로드 중 알 수 없는 오류가 발생했습니다.",
          "upload",
          uploadError,
        );
      }
    }

    // 2단계: GraphQL로 게시물 생성
    console.log("게시물 생성 시작...", {
      title: input.title,
      type: input.type,
      mediaIds,
    });

    try {
      const postInput: CreatePostInput = {
        title: input.title,
        content: input.content,
        type: input.type,
        isPublic: input.isPublic ?? true,
        mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
      };

      const result = await client.mutate({
        mutation: CREATE_POST_MUTATION,
        variables: { input: postInput },
        // 캐시 업데이트를 위해 관련 쿼리들을 다시 가져오기
        refetchQueries: ["GetPosts", "GetMyPosts"],
        awaitRefetchQueries: true,
      });

      if (result.errors) {
        throw new Error(result.errors.map((e) => e.message).join(", "));
      }

      const createdPost = result.data?.createPost;
      if (!createdPost) {
        throw new Error("게시물 생성 응답이 비어있습니다.");
      }

      console.log("게시물 생성 완료:", {
        postId: createdPost.id,
        title: createdPost.title,
        mediaCount: createdPost.media?.length || 0,
      });

      return createdPost;
    } catch (postError) {
      console.error("게시물 생성 실패:", postError);

      throw new PostCreationError(
        `게시물 생성 실패: ${postError.message}`,
        "post_creation",
        postError,
      );
    }
  } catch (error) {
    console.error("게시물 생성 프로세스 전체 실패:", error);

    if (error instanceof PostCreationError) {
      throw error;
    }

    throw new PostCreationError(
      "게시물 생성 중 알 수 없는 오류가 발생했습니다.",
      "post_creation",
      error,
    );
  }
}

/**
 * 단일 파일과 함께 게시물 생성하는 함수
 *
 * @param input 게시물 생성 입력 데이터 (단일 파일)
 * @param file 업로드할 단일 파일
 * @returns 생성된 게시물 정보
 */
export async function createPostWithSingleFile(
  input: Omit<CreatePostWithFilesInput, "files">,
  file: File | any,
): Promise<CreatePostResponse> {
  try {
    let mediaIds: string[] = [];

    // 1단계: 단일 파일 업로드
    console.log("단일 파일 업로드 시작...");

    // 진행 상황 콜백 함수가 input에 있는 경우 사용
    const progressCallback = (input as any).onProgress as
      | ProgressCallback
      | undefined;

    try {
      const uploadedFiles = await uploadFilesWithProgress(
        [file],
        progressCallback,
      );
      if (uploadedFiles.length > 0) {
        mediaIds = [uploadedFiles[0].id];
      }

      console.log("단일 파일 업로드 완료:", {
        mediaId: uploadedFiles[0]?.id,
        originalName: uploadedFiles[0]?.originalName,
      });
    } catch (uploadError) {
      console.error("단일 파일 업로드 실패:", uploadError);

      if (uploadError instanceof UploadError) {
        throw new PostCreationError(
          `파일 업로드 실패: ${uploadError.message}`,
          "upload",
          uploadError,
        );
      }

      throw new PostCreationError(
        "파일 업로드 중 알 수 없는 오류가 발생했습니다.",
        "upload",
        uploadError,
      );
    }

    // 2단계: GraphQL로 게시물 생성
    console.log("게시물 생성 시작...", {
      title: input.title,
      type: input.type,
      mediaIds,
    });

    try {
      const postInput: CreatePostInput = {
        title: input.title,
        content: input.content,
        type: input.type,
        isPublic: input.isPublic ?? true,
        mediaIds,
      };

      const result = await client.mutate({
        mutation: CREATE_POST_MUTATION,
        variables: { input: postInput },
        refetchQueries: ["GetPosts", "GetMyPosts"],
        awaitRefetchQueries: true,
      });

      if (result.errors) {
        throw new Error(result.errors.map((e) => e.message).join(", "));
      }

      const createdPost = result.data?.createPost;
      if (!createdPost) {
        throw new Error("게시물 생성 응답이 비어있습니다.");
      }

      console.log("단일 파일 게시물 생성 완료:", {
        postId: createdPost.id,
        title: createdPost.title,
        mediaCount: createdPost.media?.length || 0,
      });

      return createdPost;
    } catch (postError) {
      console.error("게시물 생성 실패:", postError);

      throw new PostCreationError(
        `게시물 생성 실패: ${postError.message}`,
        "post_creation",
        postError,
      );
    }
  } catch (error) {
    console.error("단일 파일 게시물 생성 프로세스 전체 실패:", error);

    if (error instanceof PostCreationError) {
      throw error;
    }

    throw new PostCreationError(
      "게시물 생성 중 알 수 없는 오류가 발생했습니다.",
      "post_creation",
      error,
    );
  }
}

/**
 * 파일 없이 텍스트만으로 게시물 생성하는 함수
 *
 * @param input 게시물 생성 입력 데이터
 * @returns 생성된 게시물 정보
 */
export async function createTextOnlyPost(
  input: Omit<CreatePostWithFilesInput, "files">,
): Promise<CreatePostResponse> {
  try {
    console.log("텍스트 전용 게시물 생성 시작...", {
      title: input.title,
      type: input.type,
    });

    const postInput: CreatePostInput = {
      title: input.title,
      content: input.content,
      type: input.type,
      isPublic: input.isPublic ?? true,
    };

    const result = await client.mutate({
      mutation: CREATE_POST_MUTATION,
      variables: { input: postInput },
      refetchQueries: ["GetPosts", "GetMyPosts"],
      awaitRefetchQueries: true,
    });

    if (result.errors) {
      throw new Error(result.errors.map((e) => e.message).join(", "));
    }

    const createdPost = result.data?.createPost;
    if (!createdPost) {
      throw new Error("게시물 생성 응답이 비어있습니다.");
    }

    console.log("텍스트 전용 게시물 생성 완료:", {
      postId: createdPost.id,
      title: createdPost.title,
    });

    return createdPost;
  } catch (error) {
    console.error("텍스트 전용 게시물 생성 실패:", error);

    throw new PostCreationError(
      `게시물 생성 실패: ${error.message}`,
      "post_creation",
      error,
    );
  }
}
