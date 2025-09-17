/**
 * AdFit 카카오 광고 배너 컴포넌트
 *
 * Expo Web 환경에서만 작동하는 카카오 AdFit 광고 컴포넌트입니다.
 * React Native 앱에서는 광고가 표시되지 않습니다.
 */

import React, { useEffect, useRef } from "react";
import { View, ViewStyle } from "react-native";
import { isWeb } from "@/lib/platform";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

interface AdFitBannerProps {
  style?: ViewStyle;
}

/**
 * AdFit 광고 배너 컴포넌트
 *
 * 웹 환경에서만 카카오 AdFit 광고를 표시합니다.
 */
function AdFitBanner({ style }: AdFitBannerProps) {
  const { themed } = useAppTheme();

  // 웹 환경에서만 광고 컨테이너 렌더링
  if (!isWeb()) {
    return null;
  }

  // 최초 1회만 광고를 불러오기 위한 변수
  const adRef = useRef(false);

  useEffect(() => {
    // 로딩된 광고가 있으면, 추가 로딩 X
    // if (adRef.current) {
    //   return;
    // }

    const ins = document.createElement("ins");
    const script = document.createElement("script");

    ins.className = "kakao_ad_area";
    ins.style.display = "none";

    // 윈도우 사이즈에 따라 광고 사이즈 조정(사이즈마다 해당 광고 단위 ID 적용)
    const windowSize = window.innerWidth;
    // if (windowSize < 1024) {
    ins.setAttribute("data-ad-width", "320");
    ins.setAttribute("data-ad-height", "50");
    ins.setAttribute("data-ad-unit", "DAN-nQGfQA9mWth49XVX");
    // } else {
    // ins.setAttribute('data-ad-width', '728');
    // ins.setAttribute('data-ad-height', '90');
    // ins.setAttribute('data-ad-unit', 'DAN-E2n7vvhhl9oTgc6J');
    // ins.style.marginLeft = "12px";
    //}

    script.async = true;
    script.type = "text/javascript";
    script.src = "//t1.daumcdn.net/kas/static/ba.min.js";

    const adContainer = document.querySelector(".aside__kakaoAdFit");
    if (adContainer) {
      adContainer.appendChild(ins);
      adContainer.appendChild(script);
    }

    // 광고 로딩 여부 상태 변경
    adRef.current = true;
  }, []);

  return (
    <View style={[themed($adContainer), style]}>
      <div className="aside__kakaoAdFit" />
    </View>
  );
}

// --- 스타일 정의 ---

const $adContainer: ThemedStyle<ViewStyle> = () => ({
  width: '100%',
  position: 'relative',
  top: 0,
  zIndex: 1,
});

export default React.memo(AdFitBanner);
