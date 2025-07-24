const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// 경로 별칭 설정 추가
config.resolver.extraNodeModules = {
  "@": path.resolve(__dirname),
  "@/components": path.resolve(__dirname, "components"),
  "@/lib": path.resolve(__dirname, "lib"),
  "@/app": path.resolve(__dirname, "app"),
  "@/hooks": path.resolve(__dirname, "hooks"),
};

module.exports = withNativeWind(config, { input: "./global.css" });
