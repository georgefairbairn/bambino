// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const pluginPrettier = require('eslint-plugin-prettier');
const configPrettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  {
    plugins: { prettier: pluginPrettier },
    rules: {
      'prettier/prettier': ['error'],
    },
  },
  configPrettier,
  {
    ignores: ['dist/*'],
  },
]);
