// ESLint for the proxy (standalone project, linted by its own CI job)
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["dist/**", "node_modules/**", ".backup/**", "src/**"] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: { globals: globals.node },
        rules: {
            // Error handlers receive axios errors and Express errors of any shape
            "@typescript-eslint/no-explicit-any": "off",
            // Express needs the 4 parameters of an error handler, used or not
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_" },
            ],
        },
    },
);
