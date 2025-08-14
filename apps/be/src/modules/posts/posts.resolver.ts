import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
  Context,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ObjectType, Field, InputType } from '@nestjs/graphql';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { PostsService, FindPostsOptions } from './posts.service';
import { Post } from '../../entities/post.entity';
import { User } from '../../entities/user.entity';
import { BookmarkService } from '../bookmarks/bookmark.service';
import {
  GqlAuthGuard,
  OptionalGqlAuthGuard,
} from '../../common/guards/gql-auth.guard';
import {
  CurrentUser,
  OptionalCurrentUser,
} from '../../common/decorators/current-user.decorator';

/**
 * 게시물 생성 입력 타입
 */
@InputType()
export class CreatePostInput {
  @Field(() => String, { description: '게시물 제목' })
  @IsString({ message: '제목은 문자열이어야 합니다.' })
  @MinLength(1, { message: '제목은 최소 1자 이상이어야 합니다.' })
  @MaxLength(200, { message: '제목은 최대 200자까지 가능합니다.' })
  title: string;

  @Field(() => String, { description: '게시물 내용' })
  @IsString({ message: '내용은 문자열이어야 합니다.' })
  @MinLength(1, { message: '내용은 최소 1자 이상이어야 합니다.' })
  @MaxLength(10000, { message: '내용은 최대 10,000자까지 가능합니다.' })
  content: string;

  @Field(() => String, { description: '팀 ID' })
  @IsString({ message: '팀 ID는 문자열이어야 합니다.' })
  teamId: string;

  @Field(() => Boolean, {
    nullable: true,
    description: '공개 여부 (기본값: true)',
    defaultValue: true,
  })
  @IsOptional()
  @IsBoolean({ message: '공개 여부는 불린 값이어야 합니다.' })
  isPublic?: boolean;

  @Field(() => [String], {
    nullable: true,
    description: '첨부할 미디어 ID 배열',
  })
  @IsOptional()
  @IsArray({ message: '미디어 ID는 배열이어야 합니다.' })
  @IsString({ each: true, message: '미디어 ID는 문자열이어야 합니다.' })
  mediaIds?: string[];

  @Field(() => [String], { nullable: true, description: '게시물 태그 목록' })
  @IsOptional()
  @IsArray({ message: '태그 목록은 배열이어야 합니다.' })
  @IsString({ each: true, message: '태그는 문자열이어야 합니다.' })
  tags?: string[];

  // 상단에 이미 팀 ID 필드가 있으므로 중복 필드 제거
}

/**
 * 게시물 업데이트 입력 타입
 */
@InputType()
export class UpdatePostInput {
  @Field(() => String, { description: '게시물 ID' })
  @IsString({ message: '게시물 ID는 문자열이어야 합니다.' })
  id: string;

  @Field(() => String, { nullable: true, description: '게시물 제목' })
  @IsOptional()
  @IsString({ message: '제목은 문자열이어야 합니다.' })
  @MinLength(1, { message: '제목은 최소 1자 이상이어야 합니다.' })
  @MaxLength(200, { message: '제목은 최대 200자까지 가능합니다.' })
  title?: string;

  @Field(() => String, { nullable: true, description: '게시물 내용' })
  @IsOptional()
  @IsString({ message: '내용은 문자열이어야 합니다.' })
  @MinLength(1, { message: '내용은 최소 1자 이상이어야 합니다.' })
  @MaxLength(10000, { message: '내용은 최대 10,000자까지 가능합니다.' })
  content?: string;

  @Field(() => String, { nullable: true, description: '팀 ID' })
  @IsOptional()
  @IsString({ message: '팀 ID는 문자열이어야 합니다.' })
  teamId?: string;

  @Field(() => Boolean, { nullable: true, description: '공개 여부' })
  @IsOptional()
  @IsBoolean({ message: '공개 여부는 불린 값이어야 합니다.' })
  isPublic?: boolean;

  @Field(() => Boolean, { nullable: true, description: '고정 여부' })
  @IsOptional()
  @IsBoolean({ message: '고정 여부는 불린 값이어야 합니다.' })
  isPinned?: boolean;

  @Field(() => String, { nullable: true, description: '수정 사유' })
  @IsOptional()
  @IsString({ message: '수정 사유는 문자열이어야 합니다.' })
  @MaxLength(500, { message: '수정 사유는 최대 500자까지 가능합니다.' })
  editReason?: string;
}

/**
 * 게시물 목록 조회 입력 타입
 */
@InputType()
export class FindPostsInput {
  @Field(() => Int, {
    nullable: true,
    description: '페이지 번호 (기본값: 1)',
    defaultValue: 1,
  })
  @IsOptional()
  @IsInt({ message: '페이지 번호는 정수여야 합니다.' })
  @Min(1, { message: '페이지 번호는 1 이상이어야 합니다.' })
  page?: number;

  @Field(() => Int, {
    nullable: true,
    description: '페이지 크기 (기본값: 10)',
    defaultValue: 10,
  })
  @IsOptional()
  @IsInt({ message: '페이지 크기는 정수여야 합니다.' })
  @Min(1, { message: '페이지 크기는 1 이상이어야 합니다.' })
  @Max(100, { message: '페이지 크기는 100 이하여야 합니다.' })
  limit?: number;

  @Field(() => [String], {
    nullable: true,
    description: '팀 ID 목록으로 필터링 (해당 팀의 게시물만 조회)',
  })
  @IsOptional()
  @IsArray({ message: '팀 ID 목록은 배열이어야 합니다.' })
  @IsString({ each: true, message: '팀 ID는 문자열이어야 합니다.' })
  teamIds?: string[];

  @Field(() => String, { nullable: true, description: '작성자 ID 필터' })
  @IsOptional()
  @IsString({ message: '작성자 ID는 문자열이어야 합니다.' })
  authorId?: string;

  @Field(() => Boolean, {
    nullable: true,
    description: '공개 게시물만 조회 (기본값: false)',
    defaultValue: false,
  })
  @IsOptional()
  @IsBoolean({ message: '공개 게시물 필터는 불린 값이어야 합니다.' })
  publicOnly?: boolean;

  @Field(() => String, {
    nullable: true,
    description: '정렬 기준 (기본값: createdAt)',
    defaultValue: 'createdAt',
  })
  @IsOptional()
  @IsString({ message: '정렬 기준은 문자열이어야 합니다.' })
  sortBy?: string;

  @Field(() => String, {
    nullable: true,
    description: '정렬 순서 (기본값: DESC)',
    defaultValue: 'DESC',
  })
  @IsOptional()
  @IsString({ message: '정렬 순서는 문자열이어야 합니다.' })
  sortOrder?: string;

  @Field(() => String, { nullable: true, description: '검색 키워드' })
  @IsOptional()
  @IsString({ message: '검색 키워드는 문자열이어야 합니다.' })
  search?: string;

  // 중복 필드 제거 (위에서 teamIds가 이미 정의되어 있음)
}

/**
 * 게시물 목록 응답 타입
 */
@ObjectType()
export class PostsResponse {
  @Field(() => [Post], { description: '게시물 목록' })
  posts: Post[];

  @Field(() => Int, { description: '총 게시물 수' })
  total: number;

  @Field(() => Int, { description: '현재 페이지' })
  page: number;

  @Field(() => Int, { description: '페이지 크기' })
  limit: number;

  @Field(() => Int, { description: '총 페이지 수' })
  totalPages: number;

  @Field(() => Boolean, { description: '이전 페이지 존재 여부' })
  hasPrevious: boolean;

  @Field(() => Boolean, { description: '다음 페이지 존재 여부' })
  hasNext: boolean;
}

/**
 * 게시물 통계 응답 타입
 */
@ObjectType()
export class PostStatsResponse {
  @Field(() => Int, { description: '총 게시물 수' })
  totalPosts: number;

  @Field(() => Int, { description: '공개 게시물 수' })
  publicPosts: number;

  @Field(() => Int, { description: '비공개 게시물 수' })
  privatePosts: number;

  @Field(() => Int, { description: '팀별 게시물 통계' })
  teamPostsCount: number;

  @Field(() => Int, { description: '인기 있는 팀 게시물 수' })
  popularTeamPostsCount: number;

  @Field(() => Int, { description: '최근 팀 게시물 수' })
  recentTeamPostsCount: number;
}

/**
 * 게시물 리졸버
 *
 * 게시물과 관련된 모든 GraphQL 쿼리와 뮤테이션을 처리합니다.
 * 게시물 CRUD 작업, 검색, 통계 조회 등의 기능을 제공합니다.
 */
@Resolver(() => Post)
export class PostsResolver {
  constructor(
    private readonly postsService: PostsService,
    private readonly bookmarkService: BookmarkService,
  ) {}

  /**
   * 현재 사용자가 게시물에 좋아요를 눌렀는지 여부를 계산하는 필드 리졸버
   */
  @ResolveField(() => Boolean)
  async isLiked(
    @Parent() post: Post,
    @Context() context: any,
  ): Promise<boolean> {
    const user = context.req?.user;
    if (!user) return false;

    const result = await this.postsService.isPostLikedByUser(post.id, user.id);

    // 개발 환경에서만 디버깅 로그 출력
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[DEBUG] ResolveField isLiked - postId: ${post.id}, userId: ${user.id}, result: ${result}`,
      );
    }

    return result;
  }

  /**
   * 현재 사용자가 게시물을 북마크했는지 여부를 계산하는 필드 리졸버
   */
  @ResolveField(() => Boolean)
  async isBookmarked(
    @Parent() post: Post,
    @Context() context: any,
  ): Promise<boolean> {
    const user = context.req?.user;
    if (!user) return false;
    return await this.bookmarkService.isBookmarkedByUser(user.id, post.id);
  }

  /**
   * 게시물 생성
   *
   * @param user - 현재 인증된 사용자
   * @param createPostInput - 게시물 생성 정보
   * @returns 생성된 게시물
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Post, { description: '게시물 생성' })
  async createPost(
    @Args('input') createPostInput: CreatePostInput,
    @CurrentUser() user: User,
  ): Promise<Post> {
    return await this.postsService.create(user.id, createPostInput);
  }

  /**
   * 게시물 목록 조회
   *
   * @param user - 현재 사용자 (선택적)
   * @param findPostsInput - 조회 옵션
   * @returns 게시물 목록과 페이지네이션 정보
   */
  @UseGuards(OptionalGqlAuthGuard)
  @Query(() => PostsResponse, { description: '게시물 목록 조회' })
  async posts(
    @OptionalCurrentUser() user: User | null,
    @Args('input', { nullable: true }) findPostsInput?: FindPostsInput,
  ): Promise<PostsResponse> {
    const options: FindPostsOptions = {
      page: findPostsInput?.page || 1,
      limit: findPostsInput?.limit || 10,
      authorId: findPostsInput?.authorId,
      publicOnly: findPostsInput?.publicOnly || !user, // 비로그인 사용자는 공개 게시물만 조회
      sortBy: (findPostsInput?.sortBy as any) || 'createdAt',
      sortOrder: (findPostsInput?.sortOrder as any) || 'DESC',
      search: findPostsInput?.search,
      teamIds: findPostsInput?.teamIds,
    };

    return await this.postsService.findAll(options);
  }

  /**
   * 게시물 상세 조회
   *
   * @param id - 게시물 ID
   * @param user - 현재 사용자 (선택적)
   * @returns 게시물 상세 정보
   */
  @UseGuards(OptionalGqlAuthGuard)
  @Query(() => Post, { description: '게시물 상세 조회' })
  async post(
    @Args('id') id: string,
    @OptionalCurrentUser() user: User | null,
  ): Promise<Post> {
    // 로그인한 사용자만 조회수 증가
    const incrementView = !!user;
    const post = await this.postsService.findById(id, incrementView);

    return post;
  }

  /**
   * 게시물 수정
   *
   * @param user - 현재 인증된 사용자
   * @param updatePostInput - 수정 정보
   * @returns 수정된 게시물
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Post, { description: '게시물 수정' })
  async updatePost(
    @CurrentUser() user: User,
    @Args('input') updatePostInput: UpdatePostInput,
  ): Promise<Post> {
    return await this.postsService.update(
      updatePostInput.id,
      user.id,
      updatePostInput,
    );
  }

  /**
   * 게시물 삭제
   *
   * @param user - 현재 인증된 사용자
   * @param id - 게시물 ID
   * @returns 삭제된 게시물
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Post, { description: '게시물 삭제' })
  async removePost(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<Post> {
    return await this.postsService.remove(id, user.id);
  }

  /**
   * 게시물 고정 상태 토글
   *
   * @param user - 현재 인증된 사용자
   * @param id - 게시물 ID
   * @returns 업데이트된 게시물
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Post, { description: '게시물 고정 상태 토글' })
  async togglePinPost(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<Post> {
    return await this.postsService.togglePin(id, user.id);
  }

  /**
   * 게시물 좋아요 토글
   *
   * 사용자가 게시물에 좋아요를 누르거나 취소하는 기능입니다.
   * 동일 사용자가 같은 게시물에 중복으로 좋아요를 누르는 것을 방지하기 위해
   * 사용자 ID와 게시물 ID에 유니크 제약조건을 적용한 PostLike 엔티티를 사용합니다.
   *
   * @param user - 현재 인증된 사용자
   * @param id - 게시물 ID
   * @returns 좋아요 상태 (true: 좋아요 활성화, false: 좋아요 비활성화)
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, { description: '게시물 좋아요' })
  async likePost(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<boolean> {
    return await this.postsService.likePost(id, user.id);
  }

  /**
   * 게시물 공유
   *
   * @param user - 현재 인증된 사용자
   * @param id - 게시물 ID
   * @returns 성공 여부
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, { description: '게시물 공유' })
  async sharePost(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<boolean> {
    await this.postsService.incrementShareCount(id);
    return true;
  }

  /**
   * 내 게시물 목록 조회
   *
   * @param user - 현재 인증된 사용자
   * @param findPostsInput - 조회 옵션
   * @returns 내 게시물 목록
   */
  @UseGuards(GqlAuthGuard)
  @Query(() => PostsResponse, { description: '내 게시물 목록 조회' })
  async myPosts(
    @CurrentUser() user: User,
    @Args('input', { nullable: true }) findPostsInput?: FindPostsInput,
  ): Promise<PostsResponse> {
    const options: FindPostsOptions = {
      page: findPostsInput?.page || 1,
      limit: findPostsInput?.limit || 10,
      authorId: user.id,
      publicOnly: false, // 내 게시물은 공개/비공개 모두 조회
      sortBy: (findPostsInput?.sortBy as any) || 'createdAt',
      sortOrder: (findPostsInput?.sortOrder as any) || 'DESC',
      search: findPostsInput?.search,
    };

    return await this.postsService.findAll(options);
  }

  /**
   * 사용자별 게시물 목록 조회
   *
   * @param authorId - 작성자 ID
   * @param findPostsInput - 조회 옵션
   * @returns 사용자의 게시물 목록
   */
  @Query(() => PostsResponse, { description: '사용자별 게시물 목록 조회' })
  async postsByAuthor(
    @Args('authorId') authorId: string,
    @Args('input', { nullable: true }) findPostsInput?: FindPostsInput,
  ): Promise<PostsResponse> {
    const options: FindPostsOptions = {
      page: findPostsInput?.page || 1,
      limit: findPostsInput?.limit || 10,
      authorId,
      publicOnly: true, // 다른 사용자 게시물은 공개 게시물만 조회
      sortBy: (findPostsInput?.sortBy as any) || 'createdAt',
      sortOrder: (findPostsInput?.sortOrder as any) || 'DESC',
      search: findPostsInput?.search,
    };

    return await this.postsService.findAll(options);
  }

  /**
   * 팀별 게시물 조회
   *
   * @param teamId - 팀 ID
   * @param findPostsInput - 조회 옵션
   * @returns 팀별 게시물 목록
   */
  @Query(() => PostsResponse, { description: '팀별 게시물 조회' })
  async postsByTeam(
    @Args('teamId') teamId: string,
    @Args('input', { nullable: true }) findPostsInput?: FindPostsInput,
  ): Promise<PostsResponse> {
    const options: FindPostsOptions = {
      page: findPostsInput?.page || 1,
      limit: findPostsInput?.limit || 10,
      teamIds: [teamId],
      publicOnly: true,
      sortBy: (findPostsInput?.sortBy as any) || 'createdAt',
      sortOrder: (findPostsInput?.sortOrder as any) || 'DESC',
      search: findPostsInput?.search,
    };

    return await this.postsService.findAll(options);
  }

  /**
   * 인기 게시물 조회
   *
   * @param limit - 조회할 게시물 수
   * @returns 인기 게시물 목록
   */
  @Query(() => [Post], { description: '인기 게시물 조회' })
  async popularPosts(
    @OptionalCurrentUser() user: User,
    @Args('limit', { defaultValue: 10 }) limit: number,
  ): Promise<Post[]> {
    return await this.postsService.findPopularPosts(limit);
  }

  /**
   * 최근 게시물 조회
   *
   * @param limit - 조회할 게시물 수
   * @returns 최근 게시물 목록
   */
  @Query(() => [Post], { description: '최근 게시물 조회' })
  async recentPosts(
    @OptionalCurrentUser() user: User,
    @Args('limit', { defaultValue: 10 }) limit: number,
  ): Promise<Post[]> {
    return await this.postsService.findRecentPosts(limit);
  }

  /**
   * 게시물 검색
   *
   * @param keyword - 검색 키워드
   * @param findPostsInput - 검색 옵션
   * @returns 검색된 게시물 목록
   */
  @Query(() => PostsResponse, { description: '게시물 검색' })
  async searchPosts(
    @Args('keyword') keyword: string,
    @Args('input', { nullable: true }) findPostsInput?: FindPostsInput,
  ): Promise<PostsResponse> {
    const options: FindPostsOptions = {
      page: findPostsInput?.page || 1,
      limit: findPostsInput?.limit || 10,
      authorId: findPostsInput?.authorId,
      publicOnly: true,
      sortBy: (findPostsInput?.sortBy as any) || 'createdAt',
      sortOrder: (findPostsInput?.sortOrder as any) || 'DESC',
      search: keyword,
    };

    return await this.postsService.findAll(options);
  }

  /**
   * 게시물 통계 조회 (관리자 전용)
   *
   * @param user - 현재 인증된 사용자
   * @returns 게시물 통계 정보
   */
  @UseGuards(GqlAuthGuard)
  @Query(() => PostStatsResponse, {
    description: '게시물 통계 조회 (관리자 전용)',
  })
  async postStats(@CurrentUser() user: User): Promise<PostStatsResponse> {
    // 관리자 권한 확인
    if (!user.isAdmin()) {
      throw new Error('관리자만 접근할 수 있습니다.');
    }

    const stats = await this.postsService.getPostStats();
    // 가장 많은 게시물이 있는 상위 3개 팀을 찾습니다
    const teamEntries = Object.entries(stats.postsByTeam || {});
    const sortedTeams = teamEntries.sort((a, b) => b[1] - a[1]);
    const topTeams = sortedTeams.slice(0, 3);
    const popularTeamPostsCount = topTeams.reduce(
      (sum, [_, count]) => sum + count,
      0,
    );

    return {
      totalPosts: stats.totalPosts,
      publicPosts: stats.publicPosts,
      privatePosts: stats.privatePosts,
      teamPostsCount: stats.teamPostsCount || 0,
      popularTeamPostsCount: popularTeamPostsCount || 0,
      recentTeamPostsCount: Math.min(50, stats.teamPostsCount || 0), // 최근 게시물 수 (최대 50개)
    };
  }
}
