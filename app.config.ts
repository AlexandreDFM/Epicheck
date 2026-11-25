/**
 * File Name: app.config.ts
 * Description: Dynamic Expo config. The static part stays in app.json;
 *              this file only adds the version numbers, derived from the
 *              "version" field of package.json (single source of truth).
 *
 * 1.2.1 -> expo.version "1.2.1", android.versionCode 10201,
 *          ios.buildNumber "10201" (MAJOR * 10000 + MINOR * 100 + PATCH).
 * Bump with `pnpm run version:bump patch|minor|major`.
 */

import type { ConfigContext, ExpoConfig } from "expo/config";
import { withXcodeProject, type ConfigPlugin } from "expo/config-plugins";

import { version } from "./package.json";

/** Build number shared by Android (versionCode) and iOS (CFBundleVersion) */
export function buildNumberOf(semver: string): number {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(semver);
    if (!match) {
        throw new Error(`package.json version "${semver}" is not X.Y.Z`);
    }
    const [major, minor, patch] = match.slice(1).map(Number);
    if (minor > 99 || patch > 99) {
        throw new Error(`minor and patch must stay below 100 (${semver})`);
    }
    return major * 10000 + minor * 100 + patch;
}

/**
 * expo prebuild writes the version to Info.plist but can leave the Xcode
 * build settings at 1.0 / 1; set them too so that Xcode builds match.
 */
const withXcodeVersion: ConfigPlugin<{ version: string; build: string }> = (
    config,
    { version: marketingVersion, build },
) =>
    withXcodeProject(config, (mod) => {
        const configurations = mod.modResults.pbxXCBuildConfigurationSection();
        for (const entry of Object.values(configurations)) {
            const settings = (
                entry as { buildSettings?: Record<string, string> }
            ).buildSettings;
            if (settings?.PRODUCT_BUNDLE_IDENTIFIER) {
                settings.MARKETING_VERSION = marketingVersion;
                settings.CURRENT_PROJECT_VERSION = build;
            }
        }
        return mod;
    });

export default ({ config }: ConfigContext): ExpoConfig => {
    const build = buildNumberOf(version);
    const withVersions: ExpoConfig = {
        ...config,
        name: config.name ?? "EpiCheck",
        slug: config.slug ?? "EpiCheck",
        version,
        ios: { ...config.ios, buildNumber: String(build) },
        android: { ...config.android, versionCode: build },
    };
    return withXcodeVersion(withVersions, { version, build: String(build) });
};
