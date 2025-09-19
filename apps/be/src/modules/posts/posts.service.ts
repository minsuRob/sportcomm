import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProgressService } from '../progress/progress.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Post } from '../../entities/post.entity';
import { PostVersion } from '../../entities/post-version.entity';
import { PostLike } from '../../entities/post-like.entity';
import { Tag } from '../../entities/tag.entity';
import { PostTag } from '../../entities/post-tag.entity';
import { User } from '../../entities/user.entity';
import { UserTeam } from '../../entities/user-team.entity';
import { Media } from '../../entities/media.entity';
import { MediaService } from '../media/media.service';
import { BookmarkService } from '../bookmarks/bookmark.service';

/**
 * 게시물 생성 입력 인터페이스
 */
export interface CreatePostInput {
  /** 게시물 제목 */
  title: string;
  /** 게시물 내용 */
  content: string;
  /** 팀 ID */
  teamId: string;
  /** 공개 여부 */
  isPublic?: boolean;
  /** 첨부할 미디어 ID 배열 */
  mediaIds?: string[];
  /** 태그 이름 배열 */
  tags?: string[];
}

/**
 * 게시물 업데이트 입력 인터페이스
 */
export interface UpdatePostInput {
  /** 게시물 ID */
  id: string;
  /** 게시물 제목 */
  title?: string;
  /** 게시물 내용 */
  content?: string;
  /** 팀 ID */
  teamId?: string;
  /** 공개 여부 */
  isPublic?: boolean;
  /** 고정 여부 */
  isPinned?: boolean;
  /** 수정 사유 */
  editReason?: string;
  /** 첨부 미디어 ID 목록 */
  mediaIds?: string[];
}

/**
 * 게시물 목록 조회 옵션 인터페이스
 */
export interface FindPostsOptions {
  /** 페이지 번호 (1부터 시작) - 레거시 호환용 */
  page?: number;
  /** 페이지 크기 */
  limit?: number;
  // 커서 기반 페이지네이션 제거
  /** 작성자 ID 필터 */
  authorId?: string;
  /** 공개 게시물만 조회 */
  publicOnly?: boolean;
  /** 정렬 기준 */
  sortBy?: 'createdAt' | 'updatedAt' | 'viewCount' | 'likeCount';
  /** 정렬 순서 */
  sortOrder?: 'ASC' | 'DESC';
  /** 검색 키워드 */
  search?: string;
  /** 팀 ID 목록 필터 */
  teamIds?: string[];
}

/**
 * 게시물 목록 응답 인터페이스
 */
export interface PostsResponse {
  /** 게시물 목록 */
  posts: Post[];
  /** 총 게시물 수 */
  total: number;
  /** 현재 페이지 */
  page: number;
  /** 페이지 크기 */
  limit: number;
  /** 총 페이지 수 */
  totalPages: number;
  /** 이전 페이지 존재 여부 */
  hasPrevious: boolean;
  /** 다음 페이지 존재 여부 */
  hasNext: boolean;
  // 커서 정보 제거 (중간 규모 최적화 단순화)
}

/**
 * 게시물 서비스
 *
 * 게시물 생성, 조회, 수정, 삭제 등의 비즈니스 로직을 처리합니다.
 * 게시물 버전 관리, 권한 검증, 통계 업데이트 등의 기능을 포함합니다.
 */
@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(PostVersion)
    private readonly postVersionRepository: Repository<PostVersion>,
    @InjectRepository(PostLike)
    private readonly postLikeRepository: Repository<PostLike>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(PostTag)
    private readonly postTagRepository: Repository<PostTag>,
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    @InjectRepository(UserTeam)
    private readonly userTeamRepository: Repository<UserTeam>,
    private readonly bookmarkService: BookmarkService, // BookmarkRepository 대신 BookmarkService 사용
    private dataSource: DataSource,
    private readonly mediaService: MediaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly progressService: ProgressService, // 포인트/경험치 적립 서비스
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * 게시물 생성
   *
   * @param authorId - 작성자 ID
   * @param createPostInput - 게시물 생성 정보
   * @returns 생성된 게시물
   */
  async create(
    authorId: string,
    createPostInput: CreatePostInput,
  ): Promise<Post> {
    const {
      title,
      content,
      teamId,
      isPublic = true,
      mediaIds = [],
      tags = [],
    } = createPostInput;

    // 팀 연관 게시물 로깅
    console.log(`게시물 생성 - 팀 ID: ${teamId}`);

    // 작성자의 팀 정보 조회
    const authorTeams = await this.userTeamRepository.find({
      where: { userId: authorId },
      relations: ['team'],
      order: { priority: 'ASC' },
    });

    // 게시물 생성
    const post = this.postRepository.create({
      title,
      teamId,
      content,
      isPublic,
      authorId,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      isPinned: false,
    });

    // JSON 필드는 별도로 할당하여 타입 문제 해결 (타입 어서션 사용)
    (post as any).authorTeams = JSON.stringify(authorTeams.map((ut) => ({
      id: ut.team.id,
      name: ut.team.name,
      logoUrl: ut.team.logoUrl,
      icon: ut.team.icon,
    })));

    // 게시물 저장
    const savedPost = await this.postRepository.save(post);

    // 태그 처리
    if (tags.length > 0) {
      await this.handlePostTags(savedPost.id, tags);
    }

    // 미디어 연결 (미디어 ID가 있는 경우)
    if (mediaIds.length > 0) {
      await this.mediaService.attachMediaToPost(mediaIds, savedPost.id);
    }

    // 첫 번째 버전 생성 (원본 버전)
    await this.createPostVersion(savedPost, 1, '게시물 생성');

    // 포인트/경험치 적립 (게시글 작성 액션)
    // 실패하더라도 게시물 생성 흐름에 영향을 주지 않도록 예외는 로깅 후 무시
    this.progressService
      ?.awardPostCreate(authorId)
      .catch((err) =>
        console.error('[Progress] 게시글 작성 적립 실패:', err?.message || err),
      );

    // 팀별 경험치 적립 (게시물이 작성된 팀에 경험치 부여)
    // 게시물 작성 시 해당 팀에 10점 경험치 적립
    this.progressService
      ?.awardTeamExperienceForPost(authorId, teamId, savedPost.id)
      .catch((err) =>
        console.error('[Progress] 팀 경험치 적립 실패:', err?.message || err),
      );

    // 작성자 정보와 함께 반환
    return await this.findById(savedPost.id);
  }

  /**
   * 게시물 목록 조회 (최적화 버전)
   * - N+1 문제 해결을 위한 DataLoader 사용
   * - 불필요한 JOIN 제거
   * - 커서 기반 페이지네이션 지원
   * - Redis 캐시 적용으로 성능 향상
   *
   * @param options - 조회 옵션
   * @param userId - 현재 사용자 ID (좋아요/북마크 정보 로드용)
   * @returns 게시물 목록과 페이지네이션 정보
   */
  async findAll(options: FindPostsOptions = {}, userId?: string): Promise<PostsResponse> {
    const {
      page = 1,
      limit = 10,
      // cursor 제거
      authorId,
      publicOnly = false,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
      teamIds,
    } = options;

    // 오프셋 기반 페이지네이션 (단순, 안정적)
    const skip = (page - 1) * limit;

    // 쿼리 빌더 생성 (최적화 버전)
    // N+1 문제 해결을 위해 관계 데이터는 별도 로드
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.team', 'team')
      .leftJoinAndSelect('post.media', 'media')
      .where('post.deletedAt IS NULL');

    // 필터 적용

    if (authorId) {
      queryBuilder.andWhere('post.authorId = :authorId', { authorId });
    }

    if (publicOnly) {
      queryBuilder.andWhere('post.isPublic = :isPublic', { isPublic: true });
    }

    if (search) {
      queryBuilder.andWhere(
        '(post.title ILIKE :search OR post.content ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // 팀 필터 적용
    if (teamIds && teamIds.length > 0) {
      queryBuilder.andWhere('post.teamId IN (:...teamIds)', { teamIds });
    }

    // 커서 조건 제거

    // 정렬 적용
    queryBuilder.orderBy(`post.${sortBy}`, sortOrder);

    // 고정 게시물 우선 정렬
    queryBuilder.addOrderBy('post.isPinned', 'DESC');

    // 총 개수 조회 (단순)
    const total = await queryBuilder.getCount();

    // 페이지네이션 적용 및 데이터 조회
    const posts = await queryBuilder.skip(skip).take(limit).getMany();

    // DataLoader를 사용한 태그 로드 (N+1 문제 해결)
    if (posts.length > 0) {
      const postIds = posts.map((post) => post.id);
      const tagsMap = await this.loadTagsForPosts(postIds);

      // 각 게시물에 태그 정보 설정
      posts.forEach((post) => {
        post.tags = tagsMap.get(post.id) || [];
      });
    }

    // 페이지네이션 정보 계산
    const totalPages = Math.ceil(total / limit);
    const hasPrevious = page > 1;
    const hasNext = page < totalPages;

    const result = {
      posts,
      total,
      page,
      limit,
      totalPages,
      hasPrevious,
      hasNext,
    };
    return result;
  }

  /**
   * 게시물 상세 조회
   *
   * @param id - 게시물 ID
   * @param incrementView - 조회수 증가 여부
   * @returns 게시물 정보
   * @throws NotFoundException - 게시물을 찾을 수 없음
   */
  async findById(
    id: string,
    incrementView: boolean = false,
    userId?: string,
  ): Promise<Post> {
    // queryBuilder 사용으로 findAll 과 일관성 + team 팔레트 컬럼만 선택
    const post = await this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.media', 'media')
      .leftJoinAndSelect('post.comments', 'comments')
      .leftJoinAndSelect('comments.author', 'commentAuthor')
      .leftJoinAndSelect('post.versions', 'versions')
      .leftJoinAndSelect('post.likes', 'likes')
      .leftJoin('post.team', 'team')
      .addSelect([
        'team.id',
        'team.name',
        'team.code',
        'team.color',
        'team.mainColor',
        'team.subColor',
        'team.darkMainColor',
        'team.darkSubColor',
        'team.icon',
        'team.logoUrl',
      ])
      .leftJoinAndSelect('post.postTags', 'postTags')
      .leftJoinAndSelect('postTags.tag', 'tag')
      .where('post.id = :id', { id })
      .andWhere('post.deletedAt IS NULL')
      .getOne();

    if (!post) {
      throw new NotFoundException('게시물을 찾을 수 없습니다.');
    }

    // tags 필드 계산 (postTags에서 추출)
    if (post.postTags && post.postTags.length > 0) {
      post.tags = post.postTags
        .map((postTag) => postTag.tag)
        .filter((tag) => tag && tag.id && tag.name);

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[DEBUG] PostService findById - postId: ${post.id}, postTags 길이: ${post.postTags.length}, tags 길이: ${post.tags.length}`,
        );
      }
    } else {
      post.tags = [];
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[DEBUG] PostService findById - postId: ${post.id}, postTags 없음`,
        );
      }
    }

    // 조회수 증가
    if (incrementView) {
      await this.incrementViewCount(id);
      post.viewCount += 1;
    }

    return post;
  }

  /**
   * 사용자의 게시물 좋아요 상태 확인
   *
   * @param postId - 게시물 ID
   * @param userId - 사용자 ID
   * @returns 좋아요 상태 (true: 좋아요함, false: 좋아요하지 않음)
   */
  async isPostLikedByUser(postId: string, userId: string): Promise<boolean> {
    if (!userId) return false;

    try {
      // 먼저 해당 사용자의 모든 좋아요를 확인
      const allUserLikes = await this.postLikeRepository.find({
        where: { userId },
      });

      // 특정 게시물에 대한 좋아요 확인
      const postLike = await this.postLikeRepository.findOne({
        where: {
          postId,
          userId,
        },
      });

      const isLiked = !!postLike;

      // 개발 환경에서만 디버깅 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[DEBUG] isPostLikedByUser - postId: ${postId}, userId: ${userId}, isLiked: ${isLiked}`,
        );
        console.log(`[DEBUG] 사용자의 전체 좋아요 수: ${allUserLikes.length}`);
        console.log(`[DEBUG] 찾은 postLike:`, postLike);

        // 해당 게시물의 모든 좋아요도 확인
        const allPostLikes = await this.postLikeRepository.find({
          where: { postId },
        });
        console.log(
          `[DEBUG] 해당 게시물의 전체 좋아요 수: ${allPostLikes.length}`,
        );
      }

      return isLiked;
    } catch (error) {
      console.error('좋아요 상태 확인 중 오류:', error);
      return false;
    }
  }

  /**
   * 게시물 수정
   *
   * @param id - 게시물 ID
   * @param userId - 수정하는 사용자 ID
   * @param updatePostInput - 수정 정보
   * @returns 수정된 게시물
   * @throws NotFoundException - 게시물을 찾을 수 없음
   * @throws UnauthorizedException - 수정 권한이 없음
   */
  async update(
    id: string,
    userId: string,
    updatePostInput: UpdatePostInput,
  ): Promise<Post> {
    // 기존 게시물 조회
    const existingPost = await this.findById(id);

    // 권한 검증
    await this.validatePostAccess(existingPost, userId);

    // 수정 전 내용 저장 (버전 관리용)
    const previousContent = existingPost.content;
    const previousTitle = existingPost.title;

    // 수정 정보 적용
    const { title, content, teamId, isPublic, isPinned, editReason, mediaIds } =
      updatePostInput;

    if (title !== undefined) existingPost.title = title;
    if (content !== undefined) existingPost.content = content;
    if (teamId !== undefined) existingPost.teamId = teamId;
    if (isPublic !== undefined) existingPost.isPublic = isPublic;
    if (isPinned !== undefined) existingPost.isPinned = isPinned;

    // 게시물 저장
    const updatedPost = await this.postRepository.save(existingPost);

    // 미디어 연결 (미디어 ID가 있는 경우)
    if (mediaIds && mediaIds.length > 0) {
      await this.mediaService.attachMediaToPost(mediaIds, id);
    }

    // 내용이 변경된 경우 새 버전 생성
    if (content !== undefined && content !== previousContent) {
      const latestVersion = await this.getLatestPostVersion(id);
      const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

      await this.createPostVersion(
        updatedPost,
        newVersionNumber,
        editReason || '게시물 수정',
        previousContent.length - content.length,
      );
    }

    return await this.findById(id);
  }

  /**
   * 게시물 삭제 (소프트 삭제)
   *
   * @param id - 게시물 ID
   * @param userId - 삭제하는 사용자 ID
   * @returns 삭제된 게시물
   * @throws NotFoundException - 게시물을 찾을 수 없음
   * @throws UnauthorizedException - 삭제 권한이 없음
   */
  async remove(id: string, userId: string): Promise<Post> {
    // 기존 게시물 조회
    const existingPost = await this.findById(id);

    // 권한 검증
    await this.validatePostAccess(existingPost, userId);

    // 소프트 삭제
    await this.postRepository.softDelete(id);

    // 게시물 삭제 알림 이벤트 발생 (관련 알림 모두 삭제용)
    this.eventEmitter.emit('notification.post.delete', {
      postId: id,
      authorId: existingPost.authorId,
    });

    return existingPost;
  }

  /**
   * 게시물 조회수 증가
   *
   * @param id - 게시물 ID
   */
  async incrementViewCount(id: string): Promise<void> {
    await this.postRepository.increment({ id }, 'viewCount', 1);
  }

  /**
   * 게시물 좋아요 수 증가
   *
   * @param id - 게시물 ID
   */
  /**
   * 게시물 좋아요 처리
   *
   * @param postId - 게시물 ID
   * @param userId - 사용자 ID
   * @returns 좋아요 상태 (true: 좋아요 설정, false: 좋아요 취소)
   * @throws NotFoundException - 게시물을 찾을 수 없음
   */
  async toggleLike(postId: string, userId: string): Promise<boolean> {
    // 게시물이 존재하는지 확인
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('게시물을 찾을 수 없습니다.');
    }

    try {
      // 기존 좋아요 여부 확인
      const existingLike = await this.postLikeRepository.findOne({
        where: { userId, postId },
      });

      if (!existingLike) {
        // 좋아요 기록이 없으면 새로 생성 (좋아요)
        const newLike = this.postLikeRepository.create({
          userId,
          postId,
        });

        await this.postLikeRepository.save(newLike);
        await this.postRepository.increment({ id: postId }, 'likeCount', 1);
        return true;
      } else {
        // 이미 좋아요가 있으면 삭제 (좋아요 취소)
        await this.postLikeRepository.delete({ userId, postId });
        await this.postRepository.decrement({ id: postId }, 'likeCount', 1);
        return false;
      }
    } catch (error) {
      // 유니크 제약조건 위반 오류는 이미 처리되었으므로 다른 오류만 던집니다
      if (error.code === '23505') {
        // 이미 좋아요가 있는 경우 - 일반적으로 여기 도달하지 않음
        return true;
      }
      throw error;
    }
  }

  /**
   * 게시물 좋아요 수 증가
   * @deprecated 대신 toggleLike 사용
   * @param id - 게시물 ID
   */
  async incrementLikeCount(id: string): Promise<void> {
    await this.postRepository.increment({ id }, 'likeCount', 1);
  }

  /**
   * 게시물 좋아요 처리 (간단 버전)
   * UNIQUE 제약조건을 활용하여 좀 더 간결하게 구현한 버전
   *
   * @param postId - 게시물 ID
   * @param userId - 사용자 ID
   * @returns 좋아요 상태 (true: 좋아요 생성됨, false: 좋아요 삭제됨)
   */
  async likePost(postId: string, userId: string): Promise<boolean> {
    // 게시물 존재 여부 확인
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('게시물을 찾을 수 없습니다.');
    }

    // 트랜잭션 사용하여 데이터 일관성 보장
    return await this.dataSource.transaction(async (manager) => {
      const postLikeRepo = manager.getRepository(PostLike);
      const postRepo = manager.getRepository(Post);

      // 기존 좋아요 확인
      const existingLike = await postLikeRepo.findOne({
        where: { postId, userId },
      });

      if (existingLike) {
        // 좋아요 제거
        await postLikeRepo.remove(existingLike);
        await postRepo.decrement({ id: postId }, 'likeCount', 1);

        // 개발 환경에서만 디버깅 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[DEBUG] likePost - 좋아요 제거됨 - postId: ${postId}, userId: ${userId}`,
          );
        }

        // 좋아요 취소 알림 이벤트 발생 (알림 삭제용)
        this.eventEmitter.emit('notification.like.cancel', {
          postId,
          userId,
          authorId: post.authorId,
        });

        return false;
      } else {
        // 좋아요 추가
        const like = postLikeRepo.create({
          userId,
          postId,
        });
        await postLikeRepo.save(like);
        await postRepo.increment({ id: postId }, 'likeCount', 1);

        // 개발 환경에서만 디버깅 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[DEBUG] likePost - 좋아요 추가됨 - postId: ${postId}, userId: ${userId}`,
          );
        }

        // 좋아요 알림 이벤트 발생
        this.eventEmitter.emit('notification.like', {
          postId,
          userId,
          authorId: post.authorId,
        });

        return true;
      }
    });
  }

  /**
   * 게시물 댓글 수 증가
   *
   * @param id - 게시물 ID
   */
  async incrementCommentCount(id: string): Promise<void> {
    await this.postRepository.increment({ id }, 'commentCount', 1);
  }

  /**
   * 게시물 공유 수 증가
   *
   * @param id - 게시물 ID
   */
  async incrementShareCount(id: string): Promise<void> {
    await this.postRepository.increment({ id }, 'shareCount', 1);
  }

  /**
   * 게시물 고정 상태 토글
   *
   * @param id - 게시물 ID
   * @param userId - 요청하는 사용자 ID
   * @returns 업데이트된 게시물
   */
  async togglePin(id: string, userId: string): Promise<Post> {
    const post = await this.findById(id);

    // 권한 검증 (작성자 또는 관리자만 가능)
    await this.validatePostAccess(post, userId);

    post.isPinned = !post.isPinned;
    await this.postRepository.save(post);

    return post;
  }

  /**
   * 사용자별 게시물 조회
   *
   * @param authorId - 작성자 ID
   * @param options - 조회 옵션
   * @returns 게시물 목록
   */
  async findByAuthor(
    authorId: string,
    options: Omit<FindPostsOptions, 'authorId'> = {},
  ): Promise<PostsResponse> {
    return await this.findAll({ ...options, authorId });
  }

  /**
   * 팀 ID별 게시물 조회
   *
   * @param teamId - 팀 ID
   * @param options - 조회 옵션
   * @returns 게시물 목록
   */
  async findByTeam(
    teamId: string,
    options: Omit<FindPostsOptions, 'teamIds'> = {},
  ): Promise<PostsResponse> {
    return await this.findAll({ ...options, teamIds: [teamId] });
  }

  /**
   * 게시물 통계 조회
   *
   * @returns 게시물 통계 정보
   */
  async getPostStats(): Promise<{
    totalPosts: number;
    publicPosts: number;
    privatePosts: number;
    postsByTeam: Record<string, number>;
    teamPostsCount: number;
    popularTeamPostsCount: number;
    recentTeamPostsCount: number;
  }> {
    const [totalPosts, publicPosts, privatePosts] = await Promise.all([
      this.postRepository.count(),
      this.postRepository.count({ where: { isPublic: true } }),
      this.postRepository.count({ where: { isPublic: false } }),
    ]);

    const postsByTeam = await this.postRepository
      .createQueryBuilder('post')
      .select('post.teamId', 'teamId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('post.teamId')
      .getRawMany();

    const teamStats = postsByTeam.reduce(
      (acc, item) => {
        acc[item.teamId] = parseInt(item.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );

    // 팀별 게시물 통계
    const teamPostsCount = await this.postRepository.count();

    // 인기 팀별 게시물 수 (좋아요 기준)
    const popularTeamPostsCount = await this.postRepository
      .createQueryBuilder('post')
      .where('post.likeCount > 10')
      .getCount();

    // 최근 팀별 게시물 수 (지난 7일 기준)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentTeamPostsCount = await this.postRepository
      .createQueryBuilder('post')
      .where('post.createdAt >= :date', { date: oneWeekAgo })
      .getCount();

    return {
      totalPosts,
      publicPosts,
      privatePosts,
      postsByTeam: teamStats,
      teamPostsCount,
      popularTeamPostsCount,
      recentTeamPostsCount,
    };
  }

  /**
   * 게시물 검색
   *
   * @param keyword - 검색 키워드
   * @param options - 검색 옵션
   * @returns 검색된 게시물 목록
   */
  async searchPosts(
    keyword: string,
    options: Omit<FindPostsOptions, 'search'> = {},
  ): Promise<PostsResponse> {
    return await this.findAll({ ...options, search: keyword });
  }

  /**
   * 게시물 접근 권한 검증
   *
   * @param post - 게시물 정보
   * @param userId - 사용자 ID
   * @throws UnauthorizedException - 권한이 없음
   */
  private async validatePostAccess(post: Post, userId: string): Promise<void> {
    // 작성자 본인이거나 관리자인 경우 접근 허용
    if (post.authorId === userId) {
      return;
    }

    // 추가적인 권한 검증 로직 (예: 관리자 권한 확인)
    // 실제 구현에서는 사용자 정보를 조회하여 관리자 권한을 확인해야 합니다.

    throw new UnauthorizedException('게시물을 수정할 권한이 없습니다.');
  }

  /**
   * 게시물 버전 생성
   *
   * @param post - 게시물 정보
   * @param version - 버전 번호
   * @param editReason - 수정 사유
   * @param characterDiff - 문자 수 변화
   */
  private async createPostVersion(
    post: Post,
    version: number,
    editReason: string,
    characterDiff: number = 0,
  ): Promise<PostVersion> {
    const postVersion = this.postVersionRepository.create({
      title: post.title,
      content: post.content,
      version,
      editReason,
      characterDiff,
      isMajorChange: Math.abs(characterDiff) > 100,
      isAutoSave: false,
      postId: post.id,
    });

    return await this.postVersionRepository.save(postVersion);
  }

  /**
   * 게시물의 최신 버전 조회
   *
   * @param postId - 게시물 ID
   * @returns 최신 버전 정보
   */
  private async getLatestPostVersion(
    postId: string,
  ): Promise<PostVersion | null> {
    return await this.postVersionRepository.findOne({
      where: { postId },
      order: { version: 'DESC' },
    });
  }

  /**
   * 게시물 존재 여부 확인
   *
   * @param id - 게시물 ID
   * @returns 존재 여부
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.postRepository.count({ where: { id } });
    return count > 0;
  }

  /**
   * 캐시 키 생성 (조회 옵션과 사용자에 기반)
   *
   * @param options - 조회 옵션
   * @param userId - 사용자 ID
   * @returns 캐시 키
   */
  // 캐시 키 로직 제거 (서버 캐시 미사용)

  /**
   * DataLoader를 사용한 태그 로드 (N+1 문제 해결)
   * 여러 게시물의 태그를 한 번의 쿼리로 로드
   *
   * @param postIds - 게시물 ID 배열
   * @returns 게시물 ID를 키로 하는 태그 맵
   */
  private async loadTagsForPosts(
    postIds: string[],
  ): Promise<Map<string, Tag[]>> {
    // 한 번의 쿼리로 모든 게시물의 태그 로드
    const postTags = await this.postTagRepository
      .createQueryBuilder('postTag')
      .leftJoinAndSelect('postTag.tag', 'tag')
      .where('postTag.postId IN (:...postIds)', { postIds })
      .getMany();

    // 결과를 Map으로 변환
    const tagsMap = new Map<string, Tag[]>();
    postIds.forEach((postId) => tagsMap.set(postId, []));

    postTags.forEach((postTag) => {
      if (postTag.tag) {
        const existingTags = tagsMap.get(postTag.postId) || [];
        existingTags.push(postTag.tag);
        tagsMap.set(postTag.postId, existingTags);
      }
    });

    return tagsMap;
  }

  /**
   * DataLoader를 사용한 좋아요 상태 로드 (N+1 문제 해결)
   * 여러 게시물의 좋아요 상태를 한 번의 쿼리로 로드
   *
   * @param postIds - 게시물 ID 배열
   * @param userId - 사용자 ID
   * @returns 게시물 ID를 키로 하는 좋아요 상태 맵
   */
  async loadLikedStatusForPosts(
    postIds: string[],
    userId: string,
  ): Promise<Map<string, boolean>> {
    if (!userId) {
      return new Map(postIds.map((id) => [id, false]));
    }

    // 한 번의 쿼리로 모든 게시물의 좋아요 상태 로드
    const likes = await this.postLikeRepository
      .createQueryBuilder('like')
      .where('like.postId IN (:...postIds)', { postIds })
      .andWhere('like.userId = :userId', { userId })
      .getMany();

    // 결과를 Map으로 변환
    const likedMap = new Map<string, boolean>();
    postIds.forEach((postId) => likedMap.set(postId, false));

    likes.forEach((like) => {
      likedMap.set(like.postId, true);
    });

    return likedMap;
  }

  /**
   * DataLoader를 사용한 북마크 상태 로드 (N+1 문제 해결)
   * 여러 게시물의 북마크 상태를 한 번의 쿼리로 로드
   *
   * @param postIds - 게시물 ID 배열
   * @param userId - 사용자 ID
   * @returns 게시물 ID를 키로 하는 북마크 상태 맵
   */
  async loadBookmarkedStatusForPosts(
    postIds: string[],
    userId: string,
  ): Promise<Map<string, boolean>> {
    if (!userId) {
      return new Map(postIds.map((id) => [id, false]));
    }

    // 북마크 서비스를 사용하여 한 번의 쿼리로 로드
    const bookmarkedMap = new Map<string, boolean>();
    for (const postId of postIds) {
      const isBookmarked = await this.bookmarkService.isBookmarkedByUser(
        userId,
        postId,
      );
      bookmarkedMap.set(postId, isBookmarked);
    }

    return bookmarkedMap;
  }

  /**
   * 인기 게시물 조회
   *
   * @param limit - 조회할 게시물 수
   * @returns 인기 게시물 목록
   */
  async findPopularPosts(limit: number = 10): Promise<Post[]> {
    return await this.postRepository.find({
      where: { isPublic: true },
      relations: ['author'],
      order: { likeCount: 'DESC', viewCount: 'DESC' },
      take: limit,
    });
  }

  /**
   * 최근 게시물 조회
   *
   * @param limit - 조회할 게시물 수
   * @returns 최근 게시물 목록
   */
  async findRecentPosts(limit: number = 10): Promise<Post[]> {
    return await this.postRepository.find({
      where: { isPublic: true },
      relations: ['author'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * 게시물에 대한 태그를 처리합니다.
   * 기존에 없는 태그는 새로 생성하고, 게시물과 연결합니다.
   *
   * @param postId - 게시물 ID
   * @param tagNames - 태그 이름 배열
   */
  private async handlePostTags(
    postId: string,
    tagNames: string[],
  ): Promise<void> {
    const tags = await Promise.all(
      tagNames.map(async (name) => {
        let tag = await this.tagRepository.findOne({ where: { name } });
        if (!tag) {
          tag = await this.tagRepository.save(
            this.tagRepository.create({ name }),
          );
        }
        return tag;
      }),
    );

    await Promise.all(
      tags.map((tag) => {
        const postTag = this.postTagRepository.create({
          postId,
          tagId: tag.id,
        });
        return this.postTagRepository.save(postTag);
      }),
    );
  }
}
