import { useTranslation as useI18nTranslation } from "react-i18next";
import { useEffect } from "react";
import * as storage from "../storage";
import {
  changeLanguage,
  getCurrentLanguage,
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
} from "./index";

/**
 * 다국어 지원을 위한 커스텀 훅
 * react-i18next의 useTranslation을 래핑하여 추가 기능 제공
 */
const APP_LANGUAGE_KEY = "app-language";

export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation();

  useEffect(() => {
    /**
     * 앱이 로드될 때 저장된 언어 설정을 불러옵니다.
     */
    const loadLanguageSetting = async () => {
      const storedLanguage = (await storage.loadString(
        APP_LANGUAGE_KEY,
      )) as SupportedLanguage | null;
      // 저장된 언어가 있으면 적용하고, 없으면 기본 언어(ko)를 사용합니다.
      await i18n.changeLanguage(storedLanguage || "ko");
    };

    loadLanguageSetting();
  }, [i18n]);

  /**
   * 언어 변경 함수
   */
  const switchLanguage = async (language: SupportedLanguage) => {
    await changeLanguage(language);
    await storage.saveString(APP_LANGUAGE_KEY, language);
  };

  /**
   * 현재 언어 가져오기
   */
  const currentLanguage = getCurrentLanguage();

  /**
   * 지원하는 언어 목록
   */
  const supportedLanguages = SUPPORTED_LANGUAGES;

  /**
   * 언어가 RTL인지 확인 (현재는 모두 LTR)
   */
  const isRTL = false;

  return {
    t,
    i18n,
    currentLanguage,
    switchLanguage,
    supportedLanguages,
    isRTL,
  };
};

/**
 * 번역 키의 타입 안전성을 위한 헬퍼 함수들
 */
export const createTranslationKey = (key: string) => key;

// 자주 사용되는 번역 키들을 상수로 정의
export const TRANSLATION_KEYS = {
  // 공통
  COMMON_LOADING: "common.loading",
  COMMON_ERROR: "common.error",
  COMMON_RETRY: "common.retry",
  COMMON_BACK: "common.back",
  COMMON_CLOSE: "common.close",
  COMMON_SEND: "common.send",

  // 네비게이션
  NAV_FEED: "navigation.feed",
  NAV_SEARCH: "navigation.search",
  NAV_PROFILE: "navigation.profile",

  // 인증
  AUTH_LOGIN: "auth.login",
  AUTH_LOGOUT: "auth.logout",
  AUTH_SIGNUP_LOGIN: "auth.signupLogin",

  // 피드
  FEED_TITLE: "feed.title",
  FEED_LOADING_POSTS: "feed.loadingPosts",
  FEED_NO_POSTS: "feed.noPostsAvailable",
  FEED_PULL_REFRESH: "feed.pullToRefresh",
  FEED_ERROR_FETCHING: "feed.errorFetching",
  FEED_CREATE_POST: "feed.createPost",

  // 글 작성
  CREATE_POST_TITLE: "createPost.title",
  CREATE_POST_PLACEHOLDER: "createPost.contentPlaceholder",
  CREATE_POST_SELECT_TYPE: "createPost.selectType",
  CREATE_POST_PUBLISH: "createPost.publish",
  CREATE_POST_PUBLISHING: "createPost.publishing",

  // 게시물
  POST_TITLE: "post.title",
  POST_LIKE: "post.like",
  POST_COMMENT: "post.comment",
  POST_SHARE: "post.share",
  POST_LOADING: "post.loadingPost",
  POST_NOT_FOUND: "post.postNotFound",
  POST_GO_BACK: "post.goBack",
  POST_REPOST: "post.repost",
  POST_VIEW_ALL_COMMENTS: "post.viewAllComments",
  POST_LIKE_COUNT: "post.likeCount",
  POST_COMMENT_COUNT: "post.commentCount",
  POST_VIEW_COUNT: "post.viewCount",
  POST_TYPE_ANALYSIS: "post.postTypes.analysis",
  POST_TYPE_HIGHLIGHT: "post.postTypes.highlight",
  POST_TYPE_CHEERING: "post.postTypes.cheering",
  POST_FOLLOW: "post.follow",
  POST_FOLLOWING: "post.following",
  POST_FOLLOW_SUCCESS: "post.followSuccess",
  POST_UNFOLLOW_SUCCESS: "post.unfollowSuccess",
  POST_FOLLOW_ERROR: "post.followError",
  POST_LIKE_ERROR: "post.likeError",
  POST_LIKING: "post.liking",
  POST_UNLIKING: "post.unliking",

  // 댓글
  COMMENTS_TITLE: "comments.title",
  COMMENTS_PLACEHOLDER: "comments.placeholder",
  COMMENTS_NO_COMMENTS: "comments.noComments",
  COMMENTS_LOGIN_REQUIRED: "comments.loginRequired",

  // 프로필
  PROFILE_TITLE: "profile.title",
  PROFILE_EDIT: "profile.editProfile",
  PROFILE_SETTINGS: "profile.settings",
  PROFILE_NO_POSTS: "profile.noPosts",
  PROFILE_LOADING: "profile.loadingProfile",

  // 검색
  SEARCH_TITLE: "search.title",
  SEARCH_PLACEHOLDER: "search.placeholder",
  SEARCH_BUTTON: "search.searchButton",
  SEARCH_PROMPT: "search.searchPrompt",
} as const;
