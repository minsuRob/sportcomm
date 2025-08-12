/**
 * 뉴스 크롤링 서비스
 * 스포츠 관련 뉴스 기사를 크롤링하여 스토리 데이터로 제공
 */

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
  SPORTS_NEWS: "스포츠뉴스",
  BASEBALL_MAGAZINE: "야구매거진",
  SOCCER_DIGEST: "축구다이제스트",
  SPORTS_CHOSUN: "스포츠조선",
  OSEN: "OSEN",
} as const;

/**
 * 모의 뉴스 데이터 생성기
 * TODO: 실제 크롤링 API로 교체
 */
const generateMockNews = (count: number = 5): NewsArticle[] => {
  const mockArticles: NewsArticle[] = [
    {
      id: "news_1",
      title: "[속보] 2024 시즌 MVP 발표, 역대급 성과 달성",
      description:
        "올해의 최우수 선수가 발표되었습니다. 시즌 내내 뛰어난 활약을 보여준 선수가 영예를 안았습니다.",
      url: "https://example.com/news/mvp-2024",
      source: NEWS_SOURCES.SPORTS_NEWS,
      sourceIcon: "https://via.placeholder.com/32x32",
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
    {
      id: "news_4",
      title: "월드컵 예선 대표팀 명단 발표, 새로운 얼굴들 대거 포함",
      description:
        "월드컵 예선을 위한 대표팀 명단이 발표되었습니다. 젊은 선수들의 발탁이 눈에 띕니다.",
      url: "https://example.com/news/world-cup-squad",
      source: NEWS_SOURCES.SOCCER_DIGEST,
      sourceIcon: "https://via.placeholder.com/32x32",
      imageUrl:
        "https://via.placeholder.com/400x300/FFD93D/FFFFFF?text=World+Cup",
      publishedAt: new Date(Date.now() - 10800000).toISOString(),
      category: NEWS_CATEGORIES.SOCCER,
      tags: ["월드컵", "대표팀", "명단"],
      viewCount: 25670,
    },
    {
      id: "news_5",
      title: "프로농구 시즌 개막, 새로운 룰 변경사항 안내",
      description:
        "새 시즌이 시작되면서 적용되는 룰 변경사항들을 안내드립니다. 팬들의 많은 관심 부탁드립니다.",
      url: "https://example.com/news/basketball-season",
      source: NEWS_SOURCES.SPORTS_CHOSUN,
      sourceIcon: "https://via.placeholder.com/32x32",
      imageUrl:
        "https://via.placeholder.com/400x300/9CA3AF/FFFFFF?text=Basketball",
      publishedAt: new Date(Date.now() - 14400000).toISOString(),
      category: NEWS_CATEGORIES.BASKETBALL,
      tags: ["농구", "시즌개막", "룰변경"],
      viewCount: 7890,
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
   * 뉴스 기사 목록 가져오기
   */
  async fetchNews(
    options: {
      category?: string;
      limit?: number;
      page?: number;
      sources?: string[];
    } = {}
  ): Promise<NewsApiResponse> {
    const {
      category = "general",
      limit = 10,
      page = 1,
      sources = [],
    } = options;
    const cacheKey = `${category}_${limit}_${page}_${sources.join(",")}`;

    // 캐시 확인
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // TODO: 실제 크롤링 API 호출
      // 현재는 모의 데이터 반환
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 네트워크 지연 시뮬레이션

      const mockArticles = generateMockNews(limit);

      // 카테고리 필터링
      const filteredArticles =
        category === "general"
          ? mockArticles
          : mockArticles.filter((article) => article.category === category);

      // 소스 필터링
      const finalArticles =
        sources.length > 0
          ? filteredArticles.filter((article) =>
              sources.includes(article.source)
            )
          : filteredArticles;

      const response: NewsApiResponse = {
        articles: finalArticles,
        totalCount: finalArticles.length,
        hasMore: page < 3, // 모의 데이터에서는 3페이지까지만
      };

      // 캐시 저장
      this.cache.set(cacheKey, {
        data: response,
        timestamp: Date.now(),
      });

      return response;
    } catch (error) {
      console.error("뉴스 크롤링 실패:", error);
      throw new Error("뉴스를 불러오는데 실패했습니다.");
    }
  }

  /**
   * 특정 뉴스 기사 상세 정보 가져오기
   */
  async fetchArticleDetail(articleId: string): Promise<NewsArticle | null> {
    try {
      // TODO: 실제 API 호출
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
      return [];
    }
  }

  /**
   * 카테고리별 최신 뉴스 가져오기
   */
  async fetchLatestByCategory(
    category: string,
    limit: number = 3
  ): Promise<NewsArticle[]> {
    try {
      const response = await this.fetchNews({ category, limit });
      return response.articles.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    } catch (error) {
      console.error(`${category} 카테고리 뉴스 로드 실패:`, error);
      return [];
    }
  }

  /**
   * 캐시 클리어
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// 싱글톤 인스턴스 내보내기
export const newsService = NewsService.getInstance();
