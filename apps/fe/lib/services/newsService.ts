/**
 * 뉴스 크롤링 서비스
 * 스포츠 관련 뉴스 기사를 크롤링하여 스토리 데이터로 제공
 */

import { crawlerManager } from "../crawlers/crawlerManager";
import { CrawledArticle } from "../crawlers/baseCrawler";

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content?: string;
  url: string;
  source: string;
  sourceIcon?: string;
  imageUrl?: string;
  publishedAt: string;
  category: string;
  tags?: string[];
  viewCount?: number;
}

export interface NewsApiResponse {
  articles: NewsArticle[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * 뉴스 카테고리 정의
 */
export const NEWS_CATEGORIES = {
  BASEBALL: "baseball",
  SOCCER: "soccer",
  BASKETBALL: "basketball",
  GENERAL: "general",
} as const;

/**
 * 뉴스 소스 정의
 */
export const NEWS_SOURCES = {
  NAVER_SPORTS: "네이버 스포츠",
  SPORTS_NEWS: "스포츠뉴스",
  BASEBALL_MAGAZINE: "야구매거진",
  SOCCER_DIGEST: "축구다이제스트",
  SPORTS_CHOSUN: "스포츠조선",
  OSEN: "OSEN",
} as const;

/**
 * 모의 뉴스 데이터 생성기 (대체용)
 */
const generateMockNews = (count: number = 5): NewsArticle[] => {
  const mockArticles: NewsArticle[] = [
    {
      id: "news_1",
      title: "[속보] 2024 시즌 MVP 발표, 역대급 성과 달성",
      description:
        "올해의 최우수 선수가 발표되었습니다. 시즌 내내 뛰어난 활약을 보여준 선수가 영예를 안았습니다.",
      url: "https://example.com/news/mvp-2024",
      source: NEWS_SOURCES.NAVER_SPORTS,
      sourceIcon: "https://via.placeholder.com/32x32/03C75A/FFFFFF?text=N",
      imageUrl:
        "https://via.placeholder.com/400x300/FF6B35/FFFFFF?text=MVP+2024",
      publishedAt: new Date().toISOString(),
      category: NEWS_CATEGORIES.BASEBALL,
      tags: ["MVP", "시상식", "야구"],
      viewCount: 15420,
    },
    {
      id: "news_2",
      title: "내일 경기 일정 변경 안내, 기상 악화로 인한 조정",
      description:
        "기상 악화로 인한 경기 일정 변경사항입니다. 팬들의 안전을 위해 불가피한 결정이었습니다.",
      url: "https://example.com/news/schedule-change",
      source: NEWS_SOURCES.BASEBALL_MAGAZINE,
      sourceIcon: "https://via.placeholder.com/32x32",
      imageUrl:
        "https://via.placeholder.com/400x300/4ECDC4/FFFFFF?text=Schedule+Change",
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      category: NEWS_CATEGORIES.GENERAL,
      tags: ["일정변경", "날씨", "공지"],
      viewCount: 8930,
    },
    {
      id: "news_3",
      title: "신인왕 후보 3명 최종 발표, 치열한 경쟁 예상",
      description:
        "올해 신인왕 후보 3명이 최종 발표되었습니다. 각각 뛰어난 성과를 보여준 선수들입니다.",
      url: "https://example.com/news/rookie-award",
      source: NEWS_SOURCES.OSEN,
      sourceIcon: "https://via.placeholder.com/32x32",
      imageUrl:
        "https://via.placeholder.com/400x300/6C7CE7/FFFFFF?text=Rookie+Award",
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
      category: NEWS_CATEGORIES.BASEBALL,
      tags: ["신인왕", "시상", "후보"],
      viewCount: 12350,
    },
  ];

  return mockArticles.slice(0, count);
};

/**
 * 뉴스 크롤링 서비스 클래스
 */
export class NewsService {
  private static instance: NewsService;
  private cache: Map<string, { data: NewsApiResponse; timestamp: number }> =
    new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시

  static getInstance(): NewsService {
    if (!NewsService.instance) {
      NewsService.instance = new NewsService();
    }
    return NewsService.instance;
  }

  /**
   * 뉴스 기사 목록 가져오기 (실제 크롤링 사용)
   */
  async fetchNews(
    options: {
      category?: string;
      limit?: number;
      page?: number;
      sources?: string[];
    } = {},
  ): Promise<NewsApiResponse> {
    const {
      category = "general",
      limit = 10,
      page = 1,
      sources = ["naver"],
    } = options;
    const cacheKey = `${category}_${limit}_${page}_${sources.join(",")}`;

    // 캐시 확인
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log("캐시된 뉴스 데이터 사용:", cacheKey);
      return cached.data;
    }

    try {
      console.log("실제 뉴스 크롤링 시작:", { category, limit, sources });

      // 크롤러 매니저를 통해 실제 크롤링 실행
      const crawlResult = await crawlerManager.crawlAll({
        category: this.mapCategoryToCrawler(category),
        limit,
        page,
        sources,
        mergeResults: true,
      });

      // CrawledArticle을 NewsArticle로 변환
      const articles = crawlResult.articles.map(this.convertCrawledToNews);

      const response: NewsApiResponse = {
        articles,
        totalCount: crawlResult.totalCount,
        hasMore: crawlResult.hasMore,
      };

      // 캐시 저장
      this.cache.set(cacheKey, {
        data: response,
        timestamp: Date.now(),
      });

      console.log(`뉴스 크롤링 완료: ${articles.length}개 기사`);
      return response;
    } catch (error) {
      console.error("뉴스 크롤링 실패:", error);

      // 실패 시 대체 데이터 반환
      console.log("대체 뉴스 데이터 사용");
      return this.getFallbackNews(limit);
    }
  }

  /**
   * CrawledArticle을 NewsArticle로 변환
   */
  private convertCrawledToNews = (crawled: CrawledArticle): NewsArticle => {
    return {
      id: crawled.id,
      title: crawled.title,
      description: crawled.description,
      content: crawled.content,
      url: crawled.url,
      source: crawled.source,
      sourceIcon: crawled.sourceIcon,
      imageUrl: crawled.imageUrl,
      publishedAt: crawled.publishedAt,
      category: crawled.category,
      tags: crawled.tags,
      viewCount: crawled.viewCount,
    };
  };

  /**
   * 카테고리를 크롤러 형식으로 매핑
   */
  private mapCategoryToCrawler(category: string): string {
    const mapping: Record<string, string> = {
      baseball: "kbaseball",
      soccer: "soccer",
      basketball: "basketball",
      general: "general",
    };
    return mapping[category] || "kbaseball";
  }

  /**
   * 실패 시 대체 뉴스 데이터
   */
  private getFallbackNews(limit: number): NewsApiResponse {
    const fallbackArticles = generateMockNews(limit);
    return {
      articles: fallbackArticles,
      totalCount: fallbackArticles.length,
      hasMore: false,
    };
  }

  /**
   * 특정 뉴스 기사 상세 정보 가져오기
   */
  async fetchArticleDetail(articleId: string): Promise<NewsArticle | null> {
    try {
      // TODO: 실제 상세 크롤링 구현
      const mockArticles = generateMockNews(10);
      return mockArticles.find((article) => article.id === articleId) || null;
    } catch (error) {
      console.error("뉴스 상세 정보 로드 실패:", error);
      return null;
    }
  }

  /**
   * 인기 뉴스 기사 가져오기 (조회수 기준)
   */
  async fetchPopularNews(limit: number = 5): Promise<NewsArticle[]> {
    try {
      const response = await this.fetchNews({ limit: limit * 2 });
      return response.articles
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, limit);
    } catch (error) {
      console.error("인기 뉴스 로드 실패:", error);
      return generateMockNews(limit);
    }
  }

  /**
   * 카테고리별 최신 뉴스 가져오기
   */
  async fetchLatestByCategory(
    category: string,
    limit: number = 3,
  ): Promise<NewsArticle[]> {
    try {
      const response = await this.fetchNews({ category, limit });
      return response.articles.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
    } catch (error) {
      console.error(`${category} 카테고리 뉴스 로드 실패:`, error);
      return generateMockNews(limit);
    }
  }

  /**
   * 네이버 스포츠 팀별 뉴스 가져오기
   */
  async fetchTeamNews(
    teamSectionId: string,
    limit: number = 5,
  ): Promise<NewsArticle[]> {
    try {
      console.log(`팀별 뉴스 크롤링: ${teamSectionId}`);

      const crawlResult = await crawlerManager.crawlNaverTeamNews(
        teamSectionId,
        limit,
      );
      return crawlResult.articles.map(this.convertCrawledToNews);
    } catch (error) {
      console.error("팀별 뉴스 로드 실패:", error);
      return generateMockNews(limit);
    }
  }

  /**
   * 캐시 클리어
   */
  clearCache(): void {
    this.cache.clear();
    console.log("뉴스 캐시가 클리어되었습니다.");
  }

  /**
   * 크롤러 상태 확인
   */
  getCrawlerStatus(): Record<string, boolean> {
    return crawlerManager.getStatus();
  }

  /**
   * 사용 가능한 크롤러 목록
   */
  getAvailableSources(): Array<{ name: string; info: any }> {
    return crawlerManager.getAvailableCrawlers();
  }
}

// 싱글톤 인스턴스 내보내기
export const newsService = NewsService.getInstance();
