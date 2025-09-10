import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  Notice,
  NoticeCategory,
  NoticeImportance,
} from '../../entities/notice.entity';
import { User, UserRole } from '../../entities/user.entity';

/**
 * 공지 생성 입력 DTO (간단 버전)
 * - Resolver 단계에서 ValidationPipe를 붙여 세밀 검증을 추가해도 됨
 */
export interface CreateNoticeInput {
  title: string;
  content: string;
  category: NoticeCategory;
  importance?: NoticeImportance;
  pinned?: boolean;
  highlightBanner?: boolean;
  draft?: boolean;
  startAt?: string | null; // ISO 문자열 (optional)
  endAt?: string | null; // ISO 문자열 (optional)
}

/**
 * 공지 수정 입력 DTO (모든 필드 optional)
 */
export interface UpdateNoticeInput {
  title?: string;
  content?: string;
  category?: NoticeCategory;
  importance?: NoticeImportance;
  pinned?: boolean;
  highlightBanner?: boolean;
  draft?: boolean;
  startAt?: string | null;
  endAt?: string | null;
}

/**
 * 공지 목록 조회 옵션
 */
export interface FindNoticesOptions {
  page?: number;
  limit?: number;
  category?: NoticeCategory;
  importance?: NoticeImportance;
  activeOnly?: boolean;
  pinnedFirst?: boolean;
}

/**
 * 공지 목록 응답
 */
export interface NoticePage {
  items: Notice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * NoticesService
 *
 * 요구사항:
 * - 관리자(ADMIN)만 create/update/delete 가능
 * - 일반 사용자는 목록/단건/배너 조회만 (Resolver 레벨에서 Mutation 보호 예정)
 * - FE 기존 NOTICE_MOCKS 대체를 위한 최소 기능만 구현
 *
 * 확장 여지:
 * - 검색(키워드, 태그)
 * - Soft Delete / 감사 로그
 * - i18n / 다국어 필드
 */
@Injectable()
export class NoticesService {
  constructor(
    @InjectRepository(Notice) private readonly noticeRepo: Repository<Notice>,
  ) {}

  /* ───────────────────────── 관리자 권한 헬퍼 ───────────────────────── */

  private ensureAdmin(user: User): void {
    if (!user || user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('관리자만 수행할 수 있는 작업입니다.');
    }
  }

  /* ────────────────────────────── 생성 ────────────────────────────── */

  /**
   * 공지 생성 (관리자 전용)
   */
  async create(input: CreateNoticeInput, adminUser: User): Promise<Notice> {
    this.ensureAdmin(adminUser);

    const entity = Notice.create({
      title: input.title,
      content: input.content,
      category: input.category,
      importance: input.importance,
      pinned: input.pinned,
      highlightBanner: input.highlightBanner,
      draft: input.draft,
      startAt: input.startAt ? new Date(input.startAt) : null,
      endAt: input.endAt ? new Date(input.endAt) : null,
      authorId: adminUser.id,
    });

    return await this.noticeRepo.save(entity);
  }

  /* ────────────────────────────── 수정 ────────────────────────────── */

  /**
   * 공지 수정 (관리자 전용)
   */
  async update(
    id: string,
    input: UpdateNoticeInput,
    adminUser: User,
  ): Promise<Notice> {
    this.ensureAdmin(adminUser);

    const notice = await this.noticeRepo.findOne({ where: { id } });
    if (!notice) {
      throw new NotFoundException('공지를 찾을 수 없습니다.');
    }

    if (input.title !== undefined) notice.title = input.title;
    if (input.content !== undefined) notice.content = input.content;
    if (input.category !== undefined) notice.category = input.category;
    if (input.importance !== undefined) notice.importance = input.importance;
    if (input.pinned !== undefined) notice.pinned = input.pinned;
    if (input.highlightBanner !== undefined)
      notice.highlightBanner = input.highlightBanner;
    if (input.draft !== undefined) notice.draft = input.draft;
    if (input.startAt !== undefined)
      notice.startAt = input.startAt ? new Date(input.startAt) : null;
    if (input.endAt !== undefined)
      notice.endAt = input.endAt ? new Date(input.endAt) : null;

    return await this.noticeRepo.save(notice);
  }

  /* ────────────────────────────── 삭제 ────────────────────────────── */

  /**
   * 공지 삭제 (물리 삭제 - 단순 요구사항)
   */
  async delete(id: string, adminUser: User): Promise<boolean> {
    this.ensureAdmin(adminUser);
    const res = await this.noticeRepo.delete(id);
    return res.affected === 1;
  }

  /* ────────────────────────────── 조회 ────────────────────────────── */

  /**
   * 단건 조회
   * - 존재하지 않으면 NotFoundException
   * - draft 문서도 ID 를 알면 접근 가능(권한 판단은 Resolver 에서 조정 가능)
   */
  async findById(id: string): Promise<Notice> {
    const notice = await this.noticeRepo.findOne({ where: { id } });
    if (!notice) {
      throw new NotFoundException('공지를 찾을 수 없습니다.');
    }
    return notice;
  }

  /**
   * 강조(배너) 공지 1건 조회
   * - highlightBanner=true && active
   * - 최신(createdAt DESC)
   */
  async findHighlightBanner(): Promise<Notice | null> {
    const now = new Date();
    const qb = this.noticeRepo
      .createQueryBuilder('n')
      .where('n.highlightBanner = :banner', { banner: true })
      .andWhere('n.draft = false')
      .andWhere(
        '( (n.startAt IS NULL OR n.startAt <= :now) AND (n.endAt IS NULL OR n.endAt >= :now) )',
        { now },
      )
      .orderBy('n.createdAt', 'DESC')
      .limit(1);

    return await qb.getOne();
  }

  /**
   * 목록 조회 (페이징)
   * - activeOnly=true 이면 시작/종료/드래프트 조건 필터
   * - pinnedFirst=true 이면 pinned DESC + createdAt DESC
   */
  async findPaged(options: FindNoticesOptions = {}): Promise<NoticePage> {
    const {
      page = 1,
      limit = 10,
      category,
      importance,
      activeOnly,
      pinnedFirst,
    } = options;

    const qb = this.noticeRepo.createQueryBuilder('n');

    // 기본 where (필요 시 추가)
    if (category) {
      qb.andWhere('n.category = :category', { category });
    }
    if (importance) {
      qb.andWhere('n.importance = :importance', { importance });
    }
    if (activeOnly) {
      const now = new Date();
      qb.andWhere('n.draft = false')
        .andWhere('(n.startAt IS NULL OR n.startAt <= :now)', { now })
        .andWhere('(n.endAt IS NULL OR n.endAt >= :now)', { now });
    }

    // 정렬
    if (pinnedFirst) {
      qb.orderBy('n.pinned', 'DESC').addOrderBy('n.createdAt', 'DESC');
    } else {
      qb.orderBy('n.createdAt', 'DESC');
    }

    // total 계산 (clone)
    const countQb = qb.clone();
    const total = await countQb.getCount();

    // 페이지네이션
    const offset = (page - 1) * limit;
    qb.skip(offset).take(limit);

    const items = await qb.getMany();

    const totalPages = Math.ceil(total / limit) || 1;
    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /* ────────────────────────────── 유틸 ────────────────────────────── */

  /**
   * 여러 ID 로 한 번에 조회 (선택적 사용)
   */
  async findByIds(ids: string[]): Promise<Notice[]> {
    if (!ids || ids.length === 0) return [];
    return await this.noticeRepo
      .createQueryBuilder('n')
      .whereInIds(ids)
      .getMany();
  }

  /**
   * 내부 테스트용 목 데이터 시드 (운영 비활성)
   * - 필요 시 별도 Seeder 로 이동 가능
   */
  async seedIfEmpty(adminUser: User): Promise<number> {
    if (process.env.NODE_ENV === 'production') return 0;
    const count = await this.noticeRepo.count();
    if (count > 0) return 0;

    const now = new Date();
    const samples: CreateNoticeInput[] = [
      {
        title: '스포츠 커뮤니티 베타 오픈 안내',
        content:
          '안녕하세요! 스포츠 팬 여러분.\n\n커뮤니티가 베타로 오픈했습니다. 버그 제보와 피드백은 언제나 환영합니다.',
        category: NoticeCategory.GENERAL,
        importance: NoticeImportance.HIGH,
        pinned: true,
        highlightBanner: true,
      },
      {
        title: '팀 컬러 커스터마이징 기능 추가',
        content:
          '프로필 > 팀 설정에서 커뮤니티 컬러를 설정할 수 있습니다. 계속 확장 예정!',
        category: NoticeCategory.FEATURE,
        importance: NoticeImportance.NORMAL,
      },
    ];

    for (const s of samples) {
      await this.create(s, adminUser);
    }
    return samples.length;
  }

  /**
   * 단순 검색 (제목/내용 LIKE) - 향후 고도화 시 별도 search 모듈
   */
  async simpleSearch(keyword: string, limit = 5): Promise<Notice[]> {
    const qb = this.noticeRepo
      .createQueryBuilder('n')
      .where('(n.title ILIKE :kw OR n.content ILIKE :kw)', {
        kw: `%${keyword}%`,
      })
      .andWhere('n.draft = false')
      .orderBy('n.createdAt', 'DESC')
      .take(limit);
    return await qb.getMany();
  }

  /**
   * QueryBuilder 외부 재사용 (고급 조건 필요 시)
   */
  getQueryBuilder(): SelectQueryBuilder<Notice> {
    return this.noticeRepo.createQueryBuilder('n');
  }
}
