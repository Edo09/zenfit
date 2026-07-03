const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = withNativewind(config, {
  // inline variables break PlatformColor in CSS variables
  inlineVariables: false,
  // Global className support required by gluestack-ui components
  // (components/ui/*), which style RN primitives via className.
  // The src/tw wrapper keeps working alongside it.
  globalClassNamePolyfill: true,
});
