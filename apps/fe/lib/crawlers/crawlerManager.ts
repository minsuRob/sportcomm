/**
 * 크롤러 매니저
 * 여러 크롤러를 통합 관리하고 결과를 병합
 */

import {
  BaseCrawler,
  CrawlerResult,
  CrawlerOptions,
  CrawledArticle,
} from "./baseCrawler";
import { NaverSportsCrawler } from "./naverSportsCrawler";

export interface CrawlerManagerOptions extends CrawlerOptions {
  sources?: string[]; // 사용할 크롤러 소스들
  mergeResults?: boolean; // 결과 병합 여부
}

export class CrawlerManager {
  private crawlers: Map<string, BaseCrawler> = new Map();
  private static instance: CrawlerManager;

  private constructor() {
    this.initializeCrawlers();
  }

  static getInstance(): CrawlerManager {
    if (!CrawlerManager.instance) {
      CrawlerManager.instance = new CrawlerManager();
    }
    return CrawlerManager.instance;
  }

  /**
   * 크롤러들 초기화
   */
  private initializeCrawlers(): void {
    // 네이버 스포츠 크롤러 등록
    this.crawlers.set("naver", new NaverSportsCrawler());

    // 향후 추가할 크롤러들
    // this.crawlers.set('daum', new DaumSportsCrawler());
    // this.crawlers.set('osen', new OsenCrawler());
    // this.crawlers.set('sportalkorea', new SportalKoreaCrawler());
  }

  /**
   * 새 크롤러 등록
   */
  registerCrawler(name: string, crawler: BaseCrawler): void {
    this.crawlers.set(name, crawler);
    //console.log(`크롤러 등록됨: ${name}`);
  }

  /**
   * 크롤러 제거
   */
  unregisterCrawler(name: string): boolean {
    const removed = this.crawlers.delete(name);
    if (removed) {
      //console.log(`크롤러 제거됨: ${name}`);
    }
    return removed;
  }

  /**
   * 모든 활성화된 크롤러로부터 뉴스 수집
   */
  async crawlAll(options: CrawlerManagerOptions = {}): Promise<CrawlerResult> {
    const {
      sources = ["naver"], // 기본적으로 네이버만 사용
      mergeResults = true,
      ...crawlerOptions
    } = options;

    const results: CrawlerResult[] = [];
    const errors: Array<{ source: string; error: Error }> = [];

    // 병렬로 크롤링 실행
    const crawlPromises = sources.map(async (source) => {
      const crawler = this.crawlers.get(source);

      if (!crawler) {
        console.warn(`크롤러를 찾을 수 없음: ${source}`);
        return null;
      }

      if (!crawler.isEnabled()) {
        //console.log(`크롤러 비활성화됨: ${source}`);
        return null;
      }

      try {
        //console.log(`크롤링 시작: ${source}`);
        const result = await crawler.crawl(crawlerOptions);
        //console.log(
          `크롤링 완료: ${source}, 기사 수: ${result.articles.length}`,
        );
        return { source, result };
      } catch (error) {
        console.error(`크롤링 실패: ${source}`, error);
        errors.push({ source, error: error as Error });
        return null;
      }
    });

    const crawlResults = await Promise.all(crawlPromises);

    // 성공한 결과들만 수집
    for (const crawlResult of crawlResults) {
      if (crawlResult?.result) {
        results.push(crawlResult.result);
      }
    }

    if (results.length === 0) {
      console.warn("모든 크롤러에서 데이터를 가져오지 못했습니다.");
      return {
        articles: [],
        totalCount: 0,
        hasMore: false,
      };
    }

    // 결과 병합 또는 첫 번째 결과 반환
    if (mergeResults && results.length > 1) {
      return this.mergeResults(results);
    } else {
      return results[0];
    }
  }

  /**
   * 특정 크롤러로 크롤링
   */
  async crawlBySource(
    source: string,
    options: CrawlerOptions = {},
  ): Promise<CrawlerResult> {
    const crawler = this.crawlers.get(source);

    if (!crawler) {
      throw new Error(`크롤러를 찾을 수 없음: ${source}`);
    }

    if (!crawler.isEnabled()) {
      throw new Error(`크롤러가 비활성화됨: ${source}`);
    }

    return crawler.crawl(options);
  }

  /**
   * 네이버 스포츠 팀별 뉴스 크롤링
   */
  async crawlNaverTeamNews(
    teamSectionId: string,
    limit: number = 5,
  ): Promise<CrawlerResult> {
    const naverCrawler = this.crawlers.get("naver") as NaverSportsCrawler;

    if (!naverCrawler) {
      throw new Error("네이버 크롤러를 찾을 수 없습니다.");
    }

    return naverCrawler.crawlTeamNews(teamSectionId, limit);
  }

  /**
   * 카테고리별 뉴스 크롤링 (모든 소스)
   */
  async crawlByCategory(
    category: string,
    limit: number = 10,
  ): Promise<CrawlerResult> {
    return this.crawlAll({
      category,
      limit,
      mergeResults: true,
    });
  }

  /**
   * 여러 크롤링 결과 병합
   */
  private mergeResults(results: CrawlerResult[]): CrawlerResult {
    const allArticles: CrawledArticle[] = [];
    let totalCount = 0;
    let hasMore = false;

    for (const result of results) {
      allArticles.push(...result.articles);
      totalCount += result.totalCount;
      hasMore = hasMore || result.hasMore;
    }

    // 중복 제거 (제목 기준)
    const uniqueArticles = this.removeDuplicates(allArticles);

    // 발행 시간 기준으로 정렬 (최신순)
    uniqueArticles.sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

    return {
      articles: uniqueArticles,
      totalCount: uniqueArticles.length,
      hasMore,
    };
  }

  /**
   * 중복 기사 제거 (제목 유사도 기준)
   */
  private removeDuplicates(articles: CrawledArticle[]): CrawledArticle[] {
    const unique: CrawledArticle[] = [];
    const seenTitles = new Set<string>();

    for (const article of articles) {
      const normalizedTitle = article.title
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

      // 간단한 중복 검사 (실제로는 더 정교한 유사도 검사 필요)
      let isDuplicate = false;
      for (const seenTitle of seenTitles) {
        if (this.calculateSimilarity(normalizedTitle, seenTitle) > 0.8) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        unique.push(article);
        seenTitles.add(normalizedTitle);
      }
    }

    return unique;
  }

  /**
   * 문자열 유사도 계산 (간단한 Jaccard 유사도)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.split(" "));
    const set2 = new Set(str2.split(" "));

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * 등록된 크롤러 목록 반환
   */
  getAvailableCrawlers(): Array<{ name: string; info: any }> {
    return Array.from(this.crawlers.entries()).map(([name, crawler]) => ({
      name,
      info: crawler.getInfo(),
    }));
  }

  /**
   * 크롤러 상태 확인
   */
  getStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};

    for (const [name, crawler] of this.crawlers.entries()) {
      status[name] = crawler.isEnabled();
    }

    return status;
  }
}

// 싱글톤 인스턴스 내보내기
export const crawlerManager = CrawlerManager.getInstance();
