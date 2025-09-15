/**
 * AdFit 카카오 광고 배너 컴포넌트
 *
 * Expo Web 환경에서만 작동하는 카카오 AdFit 광고 컴포넌트입니다.
 * React Native 앱에서는 광고가 표시되지 않습니다.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, ViewStyle, Text, ActivityIndicator, TextStyle } from "react-native";
import { isWeb } from "@/lib/platform";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { AD_FIT_AD_UNIT as ENV_AD_FIT_AD_UNIT } from "@env";

interface AdFitBannerProps {
  /**
   * 광고 유닛 ID. 전달하지 않으면 환경변수 또는 기본값을 사용합니다.
   */
  adUnit?: string;
  width: number;
  height: number;
  style?: ViewStyle;
}

/**
 * AdFit 광고 배너 컴포넌트
 *
 * 웹 환경에서만 카카오 AdFit 광고를 표시합니다.
 */
export default function AdFitBanner({
  adUnit,
  width,
  height,
  style,
}: AdFitBannerProps) {
  const { themed, theme } = useAppTheme();
  const adContainerRef = useRef<any>(null);
  const [adStatus, setAdStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [adError, setAdError] = useState<string | null>(null);

  // 환경변수 혹은 EXPO_PUBLIC 값, 마지막으로 하드코딩 기본값 순서로 결합
  const DEFAULT_AD_UNIT: string = "DAN-jaKdyGIgnRkALWCc";
  const CONFIG_AD_UNIT: string =
    (ENV_AD_FIT_AD_UNIT as unknown as string) ||
    ((process.env as any)?.EXPO_PUBLIC_AD_FIT_AD_UNIT as string) ||
    DEFAULT_AD_UNIT;
  const effectiveAdUnit: string = adUnit ?? CONFIG_AD_UNIT;

  useEffect(() => {
    // 웹 환경에서만 광고 스크립트 로드
    if (isWeb() && typeof window !== "undefined" && adContainerRef.current) {
      try {
        // 기존 광고 요소 제거 (재렌더링 시 중복 방지)
        const existingAd = adContainerRef.current.querySelector('.kakao_ad_area');
        if (existingAd) {
          existingAd.remove();
        }

        // AdFit 광고 요소 생성
        const adElement = document.createElement('ins');
        adElement.className = 'kakao_ad_area';
        adElement.style.display = 'none';
        // 환경/기본값을 고려한 최종 광고 유닛 사용
        adElement.setAttribute('data-ad-unit', effectiveAdUnit);
        adElement.setAttribute('data-ad-width', width.toString());
        adElement.setAttribute('data-ad-height', height.toString());

        // 컨테이너에 광고 요소 추가
        adContainerRef.current.appendChild(adElement);

        // AdFit 스크립트가 로드되어 있는지 확인
        const existingScript = document.querySelector('script[src*="t1.daumcdn.net/kas/static/ba.min.js"]');

        if (!existingScript) {
          // AdFit 스크립트 로드
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.charset = 'utf-8';
          script.src = '//t1.daumcdn.net/kas/static/ba.min.js';
          script.async = true;

          // 스크립트 로드 완료 후 광고 표시
          script.onload = () => {
            if (__DEV__) //console.log('AdFit 스크립트 로드 완료');
            setAdStatus('loaded');
            // 광고 표시 (display: block으로 변경)
            if (adElement) {
              adElement.style.display = 'block';
            }
          };

          script.onerror = () => {
            if (__DEV__) console.warn('AdFit 스크립트 로드 실패');
            setAdStatus('error');
            setAdError('광고 스크립트 로드 실패');
          };

          document.head.appendChild(script);
        } else {
          // 이미 스크립트가 로드되어 있다면 바로 광고 표시
          adElement.style.display = 'block';
        }

        // 컴포넌트 언마운트 시 정리
        return () => {
          if (adElement && adElement.parentNode) {
            adElement.parentNode.removeChild(adElement);
          }
        };
      } catch (error) {
        if (__DEV__) console.warn('AdFit 광고 초기화 실패:', error);
        setAdStatus('error');
        setAdError('광고 초기화 실패');
      }
    }
  }, [effectiveAdUnit, width, height]);

  // 웹 환경에서만 광고 컨테이너 렌더링
  if (!isWeb()) {
    return null;
  }

  return (
    <View style={[themed($adContainer), style]}>
      {/* 광고 상태에 따른 UI 표시 */}
      {adStatus === 'loading' && (
        <View style={themed($loadingContainer)}>
          <ActivityIndicator size="small" color={theme.colors.tint} />
          <Text style={themed($loadingText)}>광고 로딩 중...</Text>
        </View>
      )}

      {adStatus === 'error' && (
        <View style={themed($errorContainer)}>
          <Text style={themed($errorText)}>광고 로드 실패</Text>
          {adError && (
            <Text style={themed($errorSubText)}>{adError}</Text>
          )}
        </View>
      )}

      {/* 웹 환경에서만 div 컨테이너 생성 */}
      <div
        ref={adContainerRef as any}
        style={{
          width: '100%',
          display: adStatus === 'loaded' ? 'flex' : 'none',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      />
    </View>
  );
}

// --- 스타일 정의 ---

const $adContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 50, // 광고가 로드되지 않은 경우에도 공간 확보
  borderTopWidth: 1,
  borderBottomWidth: 1,
  borderColor: colors.border + '30',
});

const $loadingContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: spacing.sm,
  gap: spacing.sm,
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});

const $errorContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: spacing.sm,
  gap: spacing.xs,
});

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  fontWeight: '500',
});

const $errorSubText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  opacity: 0.7,
});
