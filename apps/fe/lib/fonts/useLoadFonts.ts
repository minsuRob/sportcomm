import { useFonts } from "expo-font";
import { getFontConfig } from "./config";

export function useLoadFonts() {
  const fontConfig = getFontConfig();
  return useFonts(fontConfig);
}
