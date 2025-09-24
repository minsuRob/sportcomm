module.exports = {
  expo: {
    name: "sportalkdev",
    slug: "sportalkdev",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    assetBundlePatterns: ["**/*"],
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    ios: {
      bundleIdentifier: "com.releaseteamginger2.sportalkdev", // iOS용 고유 식별자
      supportsTablet: true // 필요에 따라 true/false
    },
    android: {
      package: "com.releaseteamginger2.sportalkdev"
    },
    plugins: ["expo-router"],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      "eas": {
        "projectId": "289a6b7c-67b0-4b74-adf0-d9ea50fdd875"
      }
    },
    owner: "releaseteamginger2",
  },
};
