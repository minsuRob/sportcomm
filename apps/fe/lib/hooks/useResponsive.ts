import { useState, useEffect } from "react";
import { Dimensions } from "react-native";

/**
 * 화면 크기를 감지하여 반응형 레이아웃을 위한 정보를 제공하는 훅
 * @returns 현재 화면 크기와 데스크톱 여부
 */
export const useResponsive = () => {
  const [screenData, setScreenData] = useState(() => {
    const { width, height } = Dimensions.get("window");
    return {
      width,
      height,
      isDesktop: width >= 768, // 768px 이상을 데스크톱으로 간주 (태블릿 이상)
    };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenData({
        width: window.width,
        height: window.height,
        isDesktop: window.width >= 768,
      });
    });

    return () => subscription?.remove();
  }, []);

  return screenData;
};
