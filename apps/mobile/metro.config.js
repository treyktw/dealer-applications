const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
 
const config = getDefaultConfig(__dirname);

// Ensure react-native-css-interop is properly resolved
config.resolver.sourceExts.push('css');

// Ensure all node_modules are properly resolved
config.resolver.nodeModulesPaths = [
  require('path').resolve(__dirname, 'node_modules'),
];
 
module.exports = withNativeWind(config, { input: './global.css' })