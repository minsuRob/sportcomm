/**
 * 크롤러 설정 및 확장 관리
 * 새로운 뉴스 소스를 쉽게 추가할 수 있도록 구성
 */

/**
 * 네이버 스포츠 URL 패턴 설정
 */
export const NAVER_SPORTS_CONFIG = {
  baseUrl: "https://m.sports.naver.com",
  categories: {
    baseball: "kbaseball",
    soccer: "soccer",
    basketball: "basketball",
    volleyball: "volleyball",
    golf: "golf",
    general: "general",
  },
  teams: {
    // KBO 팀들
    kbo: {
      SS: { name: "삼성 라이온즈", sectionId: "SS" },
      HT: { name: "KIA 타이거즈", sectionId: "HT" },
      OB: { name: "두산 베어스", sectionId: "OB" },
      LG: { name: "LG 트윈스", sectionId: "LG" },
      NC: { name: "NC 다이노스", sectionId: "NC" },
      KT: { name: "KT 위즈", sectionId: "KT" },
      SK: { name: "SSG 랜더스", sectionId: "SK" },
      LT: { name: "롯데 자이언츠", sectionId: "LT" },
      HH: { name: "한화 이글스", sectionId: "HH" },
      WO: { name: "키움 히어로즈", sectionId: "WO" },
    },
    // K리그 팀들 (향후 추가)
    kleague: {
      // FC서울, 수원삼성 등...
    },
    // KBL 팀들 (향후 추가)
    kbl: {
      // 서울SK나이츠, 부산KT소닉붐 등...
    },
  },
} as const;

/**
 * 향후 추가할 크롤러 설정들
 */
export const FUTURE_CRAWLER_CONFIGS = {
  // 다음 스포츠
  daum: {
    baseUrl: "https://sports.daum.net",
    enabled: false, // 아직 구현되지 않음
    categories: {
      baseball: "baseball",
      soccer: "soccer",
      basketball: "basketball",
    },
  },

  // OSEN
  osen: {
    baseUrl: "https://osen.mt.co.kr",
    enabled: false,
    categories: {
      baseball: "baseball",
      soccer: "soccer",
      basketball: "basketball",
    },
  },

  // 스포탈코리아
  sportalkorea: {
    baseUrl: "https://www.sportalkorea.com",
    enabled: false,
    categories: {
      baseball: "baseball",
      soccer: "soccer",
      basketball: "basketball",
    },
  },

  // 스포츠조선
  sportsChosun: {
    baseUrl: "https://sports.chosun.com",
    enabled: false,
    categories: {
      baseball: "baseball",
      soccer: "soccer",
      basketball: "basketball",
    },
  },
} as const;

/**
 * 크롤링 우선순위 설정
 */
export const CRAWLER_PRIORITY = [
  "naver", // 1순위: 네이버 스포츠
  "daum", // 2순위: 다음 스포츠
  "osen", // 3순위: OSEN
  "sportalkorea", // 4순위: 스포탈코리아
  "sportsChosun", // 5순위: 스포츠조선
] as const;

/**
 * 크롤링 제한 설정
 */
export const CRAWLING_LIMITS = {
  maxArticlesPerSource: 20,
  maxConcurrentRequests: 3,
  requestTimeout: 15000, // 15초
  retryAttempts: 2,
  rateLimitDelay: 1000, // 1초
} as const;

/**
 * 카테고리별 크롤링 설정
 */
export const CATEGORY_SETTINGS = {
  popular: {
    sources: ["naver"],
    limit: 2,
    sortBy: "viewCount",
  },
  myteams: {
    sources: ["naver"],
    limit: 2,
    sortBy: "publishedAt",
  },
  news: {
    sources: ["naver", "daum", "osen"],
    limit: 3,
    sortBy: "publishedAt",
  },
} as const;

/**
 * 새로운 크롤러 추가를 위한 템플릿
 */
export interface NewCrawlerTemplate {
  name: string;
  baseUrl: string;
  enabled: boolean;
  categories: Record<string, string>;
  teams?: Record<string, Record<string, { name: string; sectionId: string }>>;
  rateLimit?: number;
  timeout?: number;
  headers?: Record<string, string>;
  selectors?: {
    articleList?: string;
    title?: string;
    link?: string;
    description?: string;
    image?: string;
    publishedAt?: string;
  };
}

/**
 * 크롤러 확장 가이드
 */
export const CRAWLER_EXTENSION_GUIDE = {
  steps: [
    "1. NewCrawlerTemplate을 참고하여 새 크롤러 설정 추가",
    "2. BaseCrawler를 상속받는 새 크롤러 클래스 구현",
    "3. CrawlerManager에 새 크롤러 등록",
    "4. CRAWLER_PRIORITY에 우선순위 추가",
    "5. 테스트 및 검증",
  ],
  examples: {
    // 예시: 새로운 크롤러 설정
    newSite: {
      name: "NewSportsSite",
      baseUrl: "https://newsports.example.com",
      enabled: true,
      categories: {
        baseball: "baseball-news",
        soccer: "soccer-news",
      },
      rateLimit: 2000,
      timeout: 10000,
      selectors: {
        articleList: ".news-list .article-item",
        title: ".article-title",
        link: ".article-link",
        description: ".article-summary",
        image: ".article-image img",
        publishedAt: ".article-date",
      },
    },
  },
} as const;
