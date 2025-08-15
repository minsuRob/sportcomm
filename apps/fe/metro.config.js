const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

// 모노레포의 루트 디렉토리 설정
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. 모노레포의 node_modules를 보도록 설정
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 2. workspaceRoot를 watchFolders에 추가
config.watchFolders = [workspaceRoot];

// 3. 경로 별칭 설정
config.resolver.alias = {
  "@": path.resolve(__dirname),
  "@/components": path.resolve(__dirname, "components"),
  "@/lib": path.resolve(__dirname, "lib"),
  "@/app": path.resolve(__dirname, "app"),
  "@/hooks": path.resolve(__dirname, "hooks"),
};

module.exports = withNativeWind(config, { input: "./global.css" });
