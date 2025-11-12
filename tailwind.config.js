/** @type {import('tailwindcss').Config} */
module.exports = {
    // Use class-based dark mode so NativeWind's setColorScheme can toggle it at runtime
    // Keep CSS using :root and :root.dark working because :root.dark matches the
    // root element when the `dark` class is applied to it.
    darkMode: "class",
    content: [
        "./App.{js,jsx,ts,tsx}",
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
        "./screens/**/*.{js,jsx,ts,tsx}",
        "./contexts/**/*.{js,jsx,ts,tsx}",
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                // Legacy Epitech colors (kept for backward compatibility)
                epitech: {
                    blue: "#013afb",
                    "blue-dark": "#0097A7",
                    "blue-light": "#00E5FF",
                    navy: "#1A237E",
                    gray: "#F5F5F5",
                    "gray-dark": "#424242",
                },
                // Theme colors using CSS variables
                primary: {
                    DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
                    dark: "rgb(var(--color-primary-dark) / <alpha-value>)",
                    light: "rgb(var(--color-primary-light) / <alpha-value>)",
                },
                background: {
                    DEFAULT: "rgb(var(--color-background) / <alpha-value>)",
                    secondary:
                        "rgb(var(--color-background-secondary) / <alpha-value>)",
                    tertiary:
                        "rgb(var(--color-background-tertiary) / <alpha-value>)",
                },
                surface: {
                    DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
                    elevated:
                        "rgb(var(--color-surface-elevated) / <alpha-value>)",
                },
                text: {
                    primary: "rgb(var(--color-text-primary) / <alpha-value>)",
                    secondary:
                        "rgb(var(--color-text-secondary) / <alpha-value>)",
                    tertiary: "rgb(var(--color-text-tertiary) / <alpha-value>)",
                    disabled: "rgb(var(--color-text-disabled) / <alpha-value>)",
                },
                border: {
                    DEFAULT: "rgb(var(--color-border) / <alpha-value>)",
                    focus: "rgb(var(--color-border-focus) / <alpha-value>)",
                },
                status: {
                    success: "rgb(var(--color-success) / <alpha-value>)",
                    "success-bg":
                        "rgb(var(--color-success-bg) / <alpha-value>)",
                    error: "rgb(var(--color-error) / <alpha-value>)",
                    "error-bg": "rgb(var(--color-error-bg) / <alpha-value>)",
                    warning: "rgb(var(--color-warning) / <alpha-value>)",
                    "warning-bg":
                        "rgb(var(--color-warning-bg) / <alpha-value>)",
                    info: "rgb(var(--color-info) / <alpha-value>)",
                    "info-bg": "rgb(var(--color-info-bg) / <alpha-value>)",
                },
                card: {
                    bg: "rgb(var(--color-card-bg) / <alpha-value>)",
                    border: "rgb(var(--color-card-border) / <alpha-value>)",
                },
                input: {
                    bg: "rgb(var(--color-input-bg) / <alpha-value>)",
                    border: "rgb(var(--color-input-border) / <alpha-value>)",
                    text: "rgb(var(--color-input-text) / <alpha-value>)",
                },
            },
        },
    },
    plugins: [],
};
