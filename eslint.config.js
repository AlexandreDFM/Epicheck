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
            // Standalone project with its own dependencies: checked by its
            // own CI job (pnpm typecheck / pnpm test in proxy-server/)
            "proxy-server/**",
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
