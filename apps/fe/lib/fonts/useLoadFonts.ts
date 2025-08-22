import { useFonts } from "expo-font";
import { customFonts } from "./config";

export function useLoadFonts() {
  return useFonts({
    TTTogether: { uri: customFonts.TTTogether },
  });
}
