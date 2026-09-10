// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite's web build imports wa-sqlite.wasm, which Metro will not resolve
// unless wasm is registered as an asset extension. Without this the web
// bundle fails outright. See https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/
config.resolver.assetExts.push('wasm');

module.exports = config;
