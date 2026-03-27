import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Zoey's World",
  slug: "zoeys-world",
  version: "2.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "zoeysworld",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#FFF8EE",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.zoeysworld.app",
    infoPlist: {
      NSMicrophoneUsageDescription:
        "Zoey listens to your voice so you can talk to her!",
      NSCameraUsageDescription:
        "Used for profile photos.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#FFF8EE",
    },
    package: "com.zoeysworld.app",
    permissions: ["RECORD_AUDIO"],
  },
  plugins: [
    "expo-router",
    "expo-font",
    [
      "expo-av",
      {
        microphonePermission:
          "Zoey listens to your voice so you can talk to her!",
      },
    ],
  ],
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  },
});
