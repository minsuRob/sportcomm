import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  InputType,
  Field,
  ObjectType,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  MaxLength,
  MinLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Notice, NoticeCategory, NoticeImportance } from '../../entities/notice.entity';
import { NoticesService } from './notices.service';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser, OptionalCurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../entities/user.entity';

/* ============================================================================
 * GraphQL Input / Object Types
 * (프론트엔드에서 기존 목업을 대체하여 사용)
 * ==========================================================================*/

/**
 * 공지 생성 입력 (관리자 전용)
 */
@InputType()
class CreateNoticeGqlInput {
  @Field(() => String)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @Field(() => String)
  @IsString()
  @MinLength(1)
  content: string;

  @Field(() => NoticeCategory)
  @IsEnum(NoticeCategory)
  category: NoticeCategory;

  @Field(() => NoticeImportance, { defaultValue: NoticeImportance.NORMAL })
  @IsEnum(NoticeImportance)
  importance?: NoticeImportance = NoticeImportance.NORMAL;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  highlightBanner?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  draft?: boolean;

  @Field(() => String, {
    nullable: true,
    description: '시작일 ISO8601 (미입력 시 즉시)',
  })
  @IsOptional()
  @IsString()
  startAt?: string | null;

  @Field(() => String, {
    nullable: true,
    description: '종료일 ISO8601 (미입력 시 무기한)',
  })
  @IsOptional()
  @IsString()
  endAt?: string | null;
}

/**
 * 공지 수정 입력 (관리자 전용 / 부분 업데이트)
 */
@InputType()
class UpdateNoticeGqlInput {
  @Field(() => String)
  @IsString()
  id: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @Field(() => NoticeCategory, { nullable: true })
  @IsOptional()
  @IsEnum(NoticeCategory)
  category?: NoticeCategory;

  @Field(() => NoticeImportance, { nullable: true })
  @IsOptional()
  @IsEnum(NoticeImportance)
  importance?: NoticeImportance;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  highlightBanner?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  draft?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  startAt?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  endAt?: string | null;
}

/**
 * 공지 목록 조회 입력
 */
@InputType()
class FindNoticesInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @Field(() => NoticeCategory, { nullable: true })
  @IsOptional()
  @IsEnum(NoticeCategory)
  category?: NoticeCategory;

  @Field(() => NoticeImportance, { nullable: true })
  @IsOptional()
  @IsEnum(NoticeImportance)
  importance?: NoticeImportance;

  @Field(() => Boolean, {
    nullable: true,
    description: '활성(노출 조건 충족) 공지만',
  })
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'pinned 우선 정렬 여부',
  })
  @IsOptional()
  @IsBoolean()
  pinnedFirst?: boolean;
}

/**
 * 공지 페이지 응답
 */
@ObjectType()
class NoticesPage {
  @Field(() => [Notice])
  items: Notice[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;

  @Field(() => Boolean)
  hasNext: boolean;

  @Field(() => Boolean)
  hasPrev: boolean;
}

/* ============================================================================
 * Resolver
 * ==========================================================================*/
@Resolver(() => Notice)
export class NoticesResolver {
  constructor(private readonly noticesService: NoticesService) {}

  /* ────────────────────────────── Public Queries ───────────────────────────── */

  /**
   * 공지 단건 조회
   * - draft 이더라도 ID 를 알고 있으면 접근 허용 (필요 시 권한 제어 추가)
   */
  @Query(() => Notice, { description: '공지 단건 조회' })
  async notice(@Args('id') id: string): Promise<Notice> {
    return await this.noticesService.findById(id);
  }

  /**
   * 공지 목록 조회
   * - 기본 정렬: createdAt DESC
   * - pinnedFirst=true → pinned DESC, createdAt DESC
   */
  @Query(() => NoticesPage, { description: '공지 목록 조회' })
  async notices(
    @Args('input', { nullable: true }) input?: FindNoticesInput,
  ): Promise<NoticesPage> {
    const pageData = await this.noticesService.findPaged({
      page: input?.page,
      limit: input?.limit,
      category: input?.category,
      importance: input?.importance,
      activeOnly: input?.activeOnly,
      pinnedFirst: input?.pinnedFirst,
    });
    return {
      items: pageData.items,
      total: pageData.total,
      page: pageData.page,
      limit: pageData.limit,
      totalPages: pageData.totalPages,
      hasNext: pageData.hasNext,
      hasPrev: pageData.hasPrev,
    };
  }

  /**
   * FeedNotice 등에 사용될 강조 배너 1건
   * - 없으면 null
   */
  @Query(() => Notice, {
    nullable: true,
    description: '강조(배너) 공지 1건 조회',
  })
  async highlightNotice(): Promise<Notice | null> {
    return await this.noticesService.findHighlightBanner();
  }

  /* ────────────────────────────── Admin Mutations ─────────────────────────── */

  /**
   * 공지 생성 (ADMIN)
   */
  @Mutation(() => Notice, { description: '공지 생성 (관리자 전용)' })
  @UseGuards(GqlAuthGuard)
  async createNotice(
    @CurrentUser() user: User,
    @Args('input') input: CreateNoticeGqlInput,
  ): Promise<Notice> {
    if (user.role !== UserRole.ADMIN) {
      throw new Error('관리자만 생성할 수 있습니다.');
    }
    return await this.noticesService.create(
      {
        title: input.title,
        content: input.content,
        category: input.category,
        importance: input.importance,
        pinned: input.pinned,
        highlightBanner: input.highlightBanner,
        draft: input.draft,
        startAt: input.startAt,
        endAt: input.endAt,
      },
      user,
    );
  }

  /**
   * 공지 수정 (ADMIN)
   */
  @Mutation(() => Notice, { description: '공지 수정 (관리자 전용)' })
  @UseGuards(GqlAuthGuard)
  async updateNotice(
    @CurrentUser() user: User,
    @Args('input') input: UpdateNoticeGqlInput,
  ): Promise<Notice> {
    if (user.role !== UserRole.ADMIN) {
      throw new Error('관리자만 수정할 수 있습니다.');
    }

    const { id, ...rest } = input;
    return await this.noticesService.update(id, rest, user);
  }

  /**
   * 공지 삭제 (ADMIN)
   * - 단순 물리 삭제
   */
  @Mutation(() => Boolean, { description: '공지 삭제 (관리자 전용)' })
  @UseGuards(GqlAuthGuard)
  async deleteNotice(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<boolean> {
    if (user.role !== UserRole.ADMIN) {
      throw new Error('관리자만 삭제할 수 있습니다.');
    }
    return await this.noticesService.delete(id, user);
  }
}

/* ============================================================================
 * 유지보수 / 확장 포인트
 * - 검색 키워드 파라미터 추가
 * - Author (관리자) 정보 eager 로딩 → 작성자 표시
 * - Soft Delete 및 감사 로그 (deletedAt, editorId 등)
 * - 다국어 (titleI18nKey, contentI18nKey) / Markdown 렌더링 정책
 * ==========================================================================*/
