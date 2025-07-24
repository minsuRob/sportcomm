module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        "module:react-native-dotenv",
        {
          moduleName: "@env",
          path: ".env",
        },
      ],
      "react-native-reanimated/plugin",
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./",
            "@/components": "./components",
            "@/lib": "./lib",
            "@/app": "./app",
            "@/hooks": "./hooks",
          },
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
      ],
    ],
  };
};
