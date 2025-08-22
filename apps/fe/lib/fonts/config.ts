import { Platform } from "react-native";

// 폰트 이름과 URL만 공통으로 정의
export const customFonts = {
  TTTogether:
    "https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/TTTogetherA.woff",
};

// 플랫폼별 폰트 설정
export const getFontConfig = () => {
  if (Platform.OS === "web") {
    // 웹: 웹 폰트 사용
    return {
      TTTogether: { uri: customFonts.TTTogether },
    };
  } else {
    // iOS/Android: 로컬 TTF 파일 사용
    return {
      TTTogether: require("@/assets/fonts/TTTogetherA.ttf"),
    };
  }
};
