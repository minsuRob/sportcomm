/**
 * 기본 크롤러 인터페이스
 * 모든 크롤러가 구현해야 하는 기본 구조
 */

export interface CrawlerConfig {
  name: string;
  baseUrl: string;
  enabled: boolean;
  rateLimit?: number; // 요청 간격 (ms)
  timeout?: number; // 타임아웃 (ms)
  headers?: Record<string, string>;
}

export interface CrawledArticle {
  id: string;
  title: string;
  description: string;
  content?: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
  author?: string;
  category: string;
  tags?: string[];
  source: string;
  sourceIcon?: string;
  viewCount?: number;
}

export interface CrawlerResult {
  articles: CrawledArticle[];
  totalCount: number;
  hasMore: boolean;
  nextPage?: string | number;
}

export interface CrawlerOptions {
  category?: string;
  limit?: number;
  page?: number;
  keywords?: string[];
}

/**
 * 기본 크롤러 추상 클래스
 */
export abstract class BaseCrawler {
  protected config: CrawlerConfig;
  protected lastRequestTime: number = 0;

  constructor(config: CrawlerConfig) {
    this.config = config;
  }

  /**
   * 크롤링 실행 (하위 클래스에서 구현)
   */
  abstract crawl(options?: CrawlerOptions): Promise<CrawlerResult>;

  /**
   * 특정 기사 상세 정보 크롤링 (선택적 구현)
   */
  async crawlArticleDetail(url: string): Promise<CrawledArticle | null> {
    // 기본 구현: 기본 정보만 반환
    return null;
  }

  /**
   * Rate limiting 적용
   */
  protected async applyRateLimit(): Promise<void> {
    if (!this.config.rateLimit) return;

    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.config.rateLimit) {
      const waitTime = this.config.rateLimit - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * HTTP 요청 헬퍼
   */
  protected async fetchWithTimeout(
    url: string,
    options?: RequestInit,
  ): Promise<Response> {
    const timeout = this.config.timeout || 10000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      await this.applyRateLimit();

      const response = await fetch(url, {
        ...options,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15",
          ...this.config.headers,
          ...options?.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * HTML 파싱 헬퍼 (간단한 정규식 기반)
   */
  protected extractTextFromHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * URL 정규화
   */
  protected normalizeUrl(url: string, baseUrl?: string): string {
    if (url.startsWith("http")) return url;
    if (url.startsWith("//")) return `https:${url}`;
    if (url.startsWith("/")) return `${baseUrl || this.config.baseUrl}${url}`;
    return `${baseUrl || this.config.baseUrl}/${url}`;
  }

  /**
   * 크롤러 상태 확인
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * 크롤러 정보 반환
   */
  getInfo(): { name: string; baseUrl: string; enabled: boolean } {
    return {
      name: this.config.name,
      baseUrl: this.config.baseUrl,
      enabled: this.config.enabled,
    };
  }
}
