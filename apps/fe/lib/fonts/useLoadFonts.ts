import { useFonts } from "expo-font";
import {
  SpaceGrotesk_400Regular as spaceGroteskRegular,
  SpaceGrotesk_500Medium as spaceGroteskMedium,
  SpaceGrotesk_600SemiBold as spaceGroteskSemiBold,
  SpaceGrotesk_700Bold as spaceGroteskBold,
} from "@expo-google-fonts/space-grotesk";
import { getFontConfig } from "./config";

export function useLoadFonts() {
  const fontConfig = getFontConfig();
  // SpaceGrotesk는 expo-google-fonts 패키지의 폰트 리소스를 함께 로드합니다.
  return useFonts({
    ...fontConfig,
    "SpaceGrotesk-Regular": spaceGroteskRegular,
    "SpaceGrotesk-Medium": spaceGroteskMedium,
    "SpaceGrotesk-SemiBold": spaceGroteskSemiBold,
    "SpaceGrotesk-Bold": spaceGroteskBold,
  });
}
