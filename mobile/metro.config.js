const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Allow Metro to resolve modules from the monorepo root (shared/)
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
];

// Ensure Metro picks the React Native bundle for packages that ship
// platform-specific builds (e.g. firebase/auth ships dist/rn/index.js
// via the "react-native" field — without this the browser build loads
// and Firebase Auth's component never registers, causing the
// "Component auth has not been registered yet" error).
config.resolver.resolverMainFields = ["react-native", "browser", "main"];

module.exports = config;
