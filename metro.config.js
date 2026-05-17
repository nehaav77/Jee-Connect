// metro.config.js - JEE Connect
// Configures Metro bundler for web compatibility
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add wasm to asset extensions so Metro can resolve .wasm files
config.resolver.assetExts = [...(config.resolver.assetExts || []), 'wasm'];

// Redirect expo-sqlite to an empty shim on web (it uses native .node modules
// that don't exist in browsers). The app uses an in-memory fallback instead.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'expo-sqlite') {
    return {
      filePath: path.resolve(__dirname, 'src/shims/expo-sqlite-web.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
