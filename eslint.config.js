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
    {
        rules: {
            // axios.create() is the documented API; axios >= 1.21 also
            // exports `create`, which this rule reports as ambiguous
            "import/no-named-as-default-member": "off",
        },
    },
]);
