// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
    expoConfig,
    {
        ignores: [
            "dist/*",
            "old/**",
            "android/**",
            "ios/**",
            "proxy-server/node_modules/**",
            "proxy-server/dist/**",
            "proxy-server/.backup/**",
        ],
    },
]);
