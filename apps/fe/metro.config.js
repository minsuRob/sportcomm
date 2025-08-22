const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// 1. 모노레포의 node_modules를 보도록 설정
config.watchFolders = [
  path.resolve(projectRoot, "..", "..", "node_modules"),
  path.resolve(projectRoot, "node_modules"),
];

// 2. 모노레포의 node_modules를 먼저 찾도록 설정
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "..", "..", "node_modules"),
  path.resolve(projectRoot, "node_modules"),
];

module.exports = config;
