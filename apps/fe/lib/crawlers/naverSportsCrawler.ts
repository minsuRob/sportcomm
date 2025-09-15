/**
 * 네이버 스포츠 뉴스 크롤러
 * https://m.sports.naver.com/kbaseball/news 등의 URL에서 뉴스 크롤링
 */

import {
  BaseCrawler,
  CrawlerConfig,
  CrawlerResult,
  CrawlerOptions,
  CrawledArticle,
} from "./baseCrawler";

/**
 * 네이버 스포츠 카테고리 매핑
 */
export const NAVER_SPORTS_CATEGORIES = {
  BASEBALL: "kbaseball",
  SOCCER: "soccer",
  BASKETBALL: "basketball",
  VOLLEYBALL: "volleyball",
  GOLF: "golf",
  GENERAL: "general",
} as const;

/**
 * 네이버 스포츠 섹션 ID 매핑
 */
export const NAVER_SPORTS_SECTIONS = {
  KBO: "kbo", // KBO 리그
  SS: "SS", // 삼성 라이온즈
  HT: "HT", // KIA 타이거즈
  OB: "OB", // 두산 베어스
  LG: "LG", // LG 트윈스
  // 추가 팀들...
} as const;

interface NaverSportsOptions extends CrawlerOptions {
  sectionId?: string; // 특정 팀이나 섹션
}

export class NaverSportsCrawler extends BaseCrawler {
  constructor() {
    const config: CrawlerConfig = {
      name: "NaverSports",
      baseUrl: "https://m.sports.naver.com",
      enabled: true,
      rateLimit: 1000, // 1초 간격
      timeout: 15000, // 15초 타임아웃
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    };
    super(config);
  }

  /**
   * 네이버 스포츠 뉴스 크롤링
   */
  async crawl(options: NaverSportsOptions = {}): Promise<CrawlerResult> {
    const {
      category = NAVER_SPORTS_CATEGORIES.BASEBALL,
      limit = 10,
      page = 1,
      sectionId,
    } = options;

    try {
      const url = this.buildUrl(category, sectionId, page);
      //console.log(`네이버 스포츠 크롤링 시작: ${url}`);

      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const articles = this.parseArticles(html, category);

      // limit 적용
      const limitedArticles = articles.slice(0, limit);

      return {
        articles: limitedArticles,
        totalCount: articles.length,
        hasMore: articles.length >= limit,
        nextPage: page + 1,
      };
    } catch (error) {
      console.error("네이버 스포츠 크롤링 실패:", error);

      // 실패 시 모의 데이터 반환 (개발 중)
      return this.getFallbackData(category, limit);
    }
  }

  /**
   * URL 생성
   */
  private buildUrl(
    category: string,
    sectionId?: string,
    page: number = 1,
  ): string {
    let url = `${this.config.baseUrl}/${category}/news`;

    const params = new URLSearchParams();

    if (sectionId) {
      params.append("sectionId", sectionId);
    }

    if (page > 1) {
      params.append("page", page.toString());
    }

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  /**
   * HTML에서 기사 정보 파싱
   */
  private parseArticles(html: string, category: string): CrawledArticle[] {
    const articles: CrawledArticle[] = [];

    try {
      // 네이버 모바일 뉴스 구조에 맞는 정규식 패턴들
      // 실제 HTML 구조 분석 후 정확한 패턴으로 수정 필요

      // 기사 제목 추출
      const titlePattern =
        /<a[^>]*class="[^"]*news_tit[^"]*"[^>]*>([^<]+)<\/a>/gi;
      // 기사 링크 추출
      const linkPattern =
        /<a[^>]*href="([^"]*)"[^>]*class="[^"]*news_tit[^"]*"/gi;
      // 기사 요약 추출
      const summaryPattern =
        /<p[^>]*class="[^"]*news_summary[^"]*"[^>]*>([^<]+)<\/p>/gi;
      // 이미지 추출
      const imagePattern = /<img[^>]*src="([^"]*)"[^>]*alt="[^"]*"/gi;
      // 시간 추출
      const timePattern =
        /<span[^>]*class="[^"]*time[^"]*"[^>]*>([^<]+)<\/span>/gi;

      let titleMatch;
      let index = 0;

      while ((titleMatch = titlePattern.exec(html)) !== null && index < 20) {
        const title = this.extractTextFromHtml(titleMatch[1]).trim();

        if (title && title.length > 5) {
          // 유효한 제목인지 확인
          const articleId = `naver_${category}_${Date.now()}_${index}`;

          articles.push({
            id: articleId,
            title: title,
            description: `${title.substring(0, 100)}...`, // 임시 설명
            url: this.normalizeUrl(`/news/${articleId}`), // 임시 URL
            imageUrl:
              "https://via.placeholder.com/400x300/4ECDC4/FFFFFF?text=Naver+Sports",
            publishedAt: new Date(Date.now() - index * 3600000).toISOString(), // 임시 시간
            category: this.mapCategoryToKorean(category),
            source: "네이버 스포츠",
            sourceIcon:
              "https://via.placeholder.com/32x32/03C75A/FFFFFF?text=N",
            tags: [category, "스포츠", "뉴스"],
            viewCount: Math.floor(Math.random() * 10000) + 1000,
          });

          index++;
        }
      }
    } catch (error) {
      console.error("HTML 파싱 실패:", error);
    }

    return articles;
  }

  /**
   * 카테고리를 한국어로 매핑
   */
  private mapCategoryToKorean(category: string): string {
    const mapping: Record<string, string> = {
      [NAVER_SPORTS_CATEGORIES.BASEBALL]: "야구",
      [NAVER_SPORTS_CATEGORIES.SOCCER]: "축구",
      [NAVER_SPORTS_CATEGORIES.BASKETBALL]: "농구",
      [NAVER_SPORTS_CATEGORIES.VOLLEYBALL]: "배구",
      [NAVER_SPORTS_CATEGORIES.GOLF]: "골프",
      [NAVER_SPORTS_CATEGORIES.GENERAL]: "일반",
    };
    return mapping[category] || "스포츠";
  }

  /**
   * 실패 시 대체 데이터 (개발용)
   */
  private getFallbackData(category: string, limit: number): CrawlerResult {
    const fallbackArticles: CrawledArticle[] = [
      {
        id: "naver_fallback_1",
        title: "[네이버 스포츠] 2024 시즌 하이라이트 모음",
        description: "올 시즌 가장 인상 깊었던 순간들을 모아봤습니다.",
        url: "https://sports.naver.com/news/1",
        imageUrl:
          "https://via.placeholder.com/400x300/4ECDC4/FFFFFF?text=Naver+Highlight",
        publishedAt: new Date().toISOString(),
        category: this.mapCategoryToKorean(category),
        source: "네이버 스포츠",
        sourceIcon: "https://via.placeholder.com/32x32/03C75A/FFFFFF?text=N",
        tags: [category, "하이라이트"],
        viewCount: 15420,
      },
      {
        id: "naver_fallback_2",
        title: "[속보] 주요 선수 이적 소식",
        description: "이번 시즌 주목할 만한 선수 이적 소식을 전해드립니다.",
        url: "https://sports.naver.com/news/2",
        imageUrl:
          "https://via.placeholder.com/400x300/FF6B35/FFFFFF?text=Transfer+News",
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        category: this.mapCategoryToKorean(category),
        source: "네이버 스포츠",
        sourceIcon: "https://via.placeholder.com/32x32/03C75A/FFFFFF?text=N",
        tags: [category, "이적", "속보"],
        viewCount: 8930,
      },
    ];

    return {
      articles: fallbackArticles.slice(0, limit),
      totalCount: fallbackArticles.length,
      hasMore: false,
      nextPage: 1,
    };
  }

  /**
   * 특정 섹션(팀) 뉴스 크롤링
   */
  async crawlTeamNews(
    teamSectionId: string,
    limit: number = 5,
  ): Promise<CrawlerResult> {
    return this.crawl({
      category: NAVER_SPORTS_CATEGORIES.BASEBALL,
      sectionId: teamSectionId,
      limit,
    });
  }

  /**
   * 카테고리별 최신 뉴스 크롤링
   */
  async crawlByCategory(
    category: string,
    limit: number = 10,
  ): Promise<CrawlerResult> {
    return this.crawl({
      category,
      limit,
    });
  }
}
