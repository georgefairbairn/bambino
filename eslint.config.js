// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const pluginPrettier = require('eslint-plugin-prettier');
const configPrettier = require('eslint-config-prettier');
const pluginReactNative = require('eslint-plugin-react-native');

module.exports = defineConfig([
  expoConfig,
  {
    plugins: { prettier: pluginPrettier },
    rules: {
      'prettier/prettier': ['error'],
    },
  },
  {
    // Catch StyleSheet.create entries that are never referenced (#222). 'warn'
    // so it surfaces dead styles without blocking; CI lint can flag new ones.
    plugins: { 'react-native': pluginReactNative },
    rules: {
      'react-native/no-unused-styles': 'warn',
    },
  },
  configPrettier,
  {
    ignores: ['dist/*'],
  },
]);
