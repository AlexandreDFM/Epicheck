# Changelog

All notable changes to EpiCheck. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/): the version in `package.json` is the only one to edit, and the Android `versionCode` / iOS build number are derived from it (`MAJOR*10000 + MINOR*100 + PATCH`).

The section of a version is used as the notes of its GitHub release (`.github/workflows/android.yaml`).

## [Unreleased]

## [1.3.0] - 2026-11-25

### Added

- Multi-QR scanning: several codes detected at once, queued in batch mode or sent at once in one-by-one mode, duplicates skipped (#13).
- Web deployment following the shared convention: production on https://epicheck.nice-tek.eu (`www` redirects), preprod on https://epicheck.ppd.nice-tek.eu, deployed from `main` and `develop`.
- One image for the web app and the CORS proxy, run as two containers (nginx and Node), non-root with a read-only file system.
- Workflows: checks on pull requests, image build, deploy with smoke tests on the public site, Android APK and AAB attached to the release of a `vX.Y.Z` tag.
- Android release builds signed with the key given by the `ANDROID_KEYSTORE_*` variables or secrets.
- `docs/DEPLOYMENT.md`, `docker/README.md`, this changelog (also the notes of the GitHub release).
- ESLint for the proxy, run by its CI job; per-project audit gate in CI.

### Changed

- The deploy account is limited to the app's namespace (`github-deployer`), instead of a cluster-admin kubeconfig; secrets and settings live in the GitHub environments `production` and `preprod`.
- The image is private and pulled with a dedicated read-only token.
- Repository layout: a pnpm workspace with `apps/mobile` (Expo app, sources under `src/`, `@/` imports) and `apps/proxy`; Dockerfile in `docker/`; guides grouped by topic under `docs/`.
- README rewritten; superseded implementation notes removed.

### Fixed

- Local Android release builds on macOS: `libworklets.so` is now provided where react-native-reanimated links it.
- Jenkins: the token is not sent to protocol-relative URLs (`//host/…`) either, and a Jenkins URL saved before https was required falls back to the default instance.

### Security

- `.env` files are ignored by Git (only the examples are versioned).

### Removed

- The former `kubernetes/` folder, deploy and staging workflows, the script that uploaded a local admin kubeconfig, and the separate proxy image.

## [1.2.1] - 2026-11-25

Not tagged: released together with 1.3.0.

### Fixed

- CORS proxy: requests are restricted to the Intranet origin; an `endpoint` value could send the request, with the user's cookie, to another host. Redirects are no longer followed.
- Jenkins: credentials are checked before being saved and a refusal is reported (#24); only a 404 marks a project as missing, other errors can be retried (#27); concurrent build fetches no longer overwrite each other (#25, #26); the token is only sent to the configured Jenkins, over https.
- The Intranet cookie is no longer written to the device logs; release builds drop debug logs and strip request headers from logged errors.
- NFC scanner cleanup on unmount.
- Missing `expo-file-system` dependency (custom sounds).

### Security

- Web: the Intranet cookie, Jenkins token and Office 365 tokens are kept in `sessionStorage` instead of `localStorage` (#23).
- CORS proxy: CORS limited to configured origins, GET/POST only, body size limit, per-client rate limit, security headers, no cookie in logs or error answers.
- Dependencies updated: `axios` 1.21, Expo SDK 54 patch versions, React Navigation 7.5, overrides for vulnerable build-tool dependencies (179 advisories down to 5, all in build tools).
- Android: external storage permissions removed.

### Changed

- Version numbers derived from `package.json` (`pnpm run version:bump`), including the Xcode project settings.
- pnpm 11 and Node 22 pinned; type check and lint clean.

## [1.2.0] - 2026-04-13

### Added

- Jenkins integration: credentials in Settings, last build per student or group, trigger a build, open Jenkins.
- Follow-up grading (bareme) saved to the Intranet.
- Batch mode for presence scanning and batch actions in manual attendance.
- Camera on/off toggle.

Earlier versions: see the Git history.

[Unreleased]: https://github.com/epitech-nice/EpiCheck/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/epitech-nice/EpiCheck/compare/v.1.2.0...v1.3.0
[1.2.1]: https://github.com/epitech-nice/EpiCheck/compare/v.1.2.0...0a50bab
[1.2.0]: https://github.com/epitech-nice/EpiCheck/releases/tag/v.1.2.0
