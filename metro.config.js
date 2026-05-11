// metro.config.js - JEE Connect
// Configures Metro bundler for web compatibility
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add wasm to asset extensions so Metro can resolve .wasm files
config.resolver.assetExts = [...(config.resolver.assetExts || []), 'wasm'];

module.exports = config;
