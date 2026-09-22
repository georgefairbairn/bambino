const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// ads/ is a separate Remotion project (see ads/README.md). Its node_modules
// holds ~775MB including a headless Chrome, so keep Metro from crawling it.
const adsDir = path.resolve(__dirname, 'ads').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [
  ...[].concat(config.resolver.blockList ?? []),
  new RegExp(`^${adsDir}([/\\\\].*)?$`),
];

module.exports = withNativeWind(config, { input: './global.css' });
