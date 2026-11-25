# EpiCheck

Mobile app (Android, iOS) for Epitech staff to take attendance and follow projects on the Epitech Intranet: scan the students' QR codes, mark presences in batch, register students on the fly, and grade follow-ups with their Jenkins build results at hand. A web version exists, with a limitation (see below).

> **Status:** maintained until the Epitech Intranet it relies on is retired. The end-of-life plan lives in `END.md`; this repository then becomes an archive. To bring it back to life later, start with [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and the [version rules](docs/IOS_XCODE_TROUBLESHOOTING.md#5-workflow-de-version-bump).

## Features

| Screen | What it does |
|---|---|
| Login | Office 365 login through the Intranet in a WebView; the Intranet cookie is kept in the device's secure storage |
| Activities | Your activities on the Intranet, in chronological order |
| Presence | QR code scanning (one code, or **several at once** with multi-scan), batch mode (queue, then send), register mode (registers the student on the module and the event first), camera on/off, success/error sounds |
| Manual attendance | Mark students from the registered list |
| Follow-ups (RDV) | Registered students or groups, their last Jenkins build, trigger a build, open Jenkins |
| Grading | Fill the grading scale (bareme) of a follow-up and save it to the Intranet |
| Settings | Theme, custom sounds, Jenkins credentials (validated before saving), manual cookie |

NFC: the scanner reads the card, but it returns the card's own identifier, not the student's email, and the card-to-student mapping is not available. QR codes are the supported method.

## Platforms

| Platform | How it talks to the Intranet |
|---|---|
| Android, iOS | Directly |
| Web | Through the CORS proxy (`proxy-server/`), because the Intranet sends no CORS headers. Outside the Epitech network the Intranet refuses requests coming from a server (anti-DDoS page), so the deployed web version is only reliable on the school network |

## Getting started

Requirements: Node 22 (`.nvmrc`) and pnpm (`corepack enable` installs the version pinned in `package.json`). Android: JDK 17 and the Android SDK. iOS: Xcode (macOS).

```bash
corepack enable
pnpm install

pnpm android        # build and run on an Android device or emulator
pnpm ios            # build and run on the iOS simulator (pnpm ios:device for a device)
pnpm start          # Metro only, for an installed development build

# Web: the proxy and the Expo web server, in two terminals
pnpm proxy
pnpm web
```

Checks run by the CI: `pnpm exec tsc --noEmit`, `pnpm exec eslint .`, `pnpm exec expo install --check`, and `pnpm test` in `proxy-server/`.

## Versions and releases

`package.json` holds the only version; the Android `versionCode` and iOS build number are derived from it (1.3.0 → 10300).

```bash
pnpm run version:bump patch    # or minor / major
git commit -am "chore(release): vX.Y.Z"
# after the merge on main: tag vX.Y.Z -> signed APK and AAB attached to a GitHub release
```

Details: [docs/IOS_XCODE_TROUBLESHOOTING.md](docs/IOS_XCODE_TROUBLESHOOTING.md#4-synchronisation-des-versions), signing: [docs/BUILD_APK.md](docs/BUILD_APK.md).

## Deployment (web)

`develop` deploys https://epicheck.ppd.nice-tek.eu (preprod) and `main` deploys https://epicheck.nice-tek.eu, on Kubernetes through GitHub Actions, with a deploy account limited to each namespace. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docker/README.md](docker/README.md).

## Repository layout

```
App.tsx, index.ts      navigation and entry point
screens/               one file per screen
components/            QR, multi-QR and NFC scanners, text components
services/              Intranet, Office 365, Jenkins clients; secure storage; sounds
types/, hooks/, contexts/, utils/
proxy-server/          CORS proxy for the web version (Express, tests with node:test)
docker/, Dockerfile    web image: Expo web export + nginx + proxy
k8s/                   Kubernetes manifests and deploy accounts
.github/workflows/     ci, build, deploy, android
docs/                  guides (below)
```

## Documentation

| Guide | Topic |
|---|---|
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Kubernetes, GitHub settings, operations |
| [BUILD_APK.md](docs/BUILD_APK.md), [BUILD_IOS.md](docs/BUILD_IOS.md) | Local builds, release signing |
| [ANDROID_QUICK_COMMANDS.md](docs/ANDROID_QUICK_COMMANDS.md), [ANDROID_APK_INSTALL_TROUBLESHOOTING.md](docs/ANDROID_APK_INSTALL_TROUBLESHOOTING.md), [ANDROID_BUILD_OPTIMIZATION.md](docs/ANDROID_BUILD_OPTIMIZATION.md) | Android |
| [IOS_XCODE_TROUBLESHOOTING.md](docs/IOS_XCODE_TROUBLESHOOTING.md) | Xcode, macOS 26, versions |
| [EXPO_BUILD_FIXES.md](docs/EXPO_BUILD_FIXES.md) | Known Expo build issues |
| [HYBRID_AUTH.md](docs/HYBRID_AUTH.md), [OFFICE365_SETUP.md](docs/OFFICE365_SETUP.md), [AZURE_AD_SPA_SETUP.md](docs/AZURE_AD_SPA_SETUP.md), [DEBUG_AUTH.md](docs/DEBUG_AUTH.md) | Authentication |
| [COOKIE_EXTRACTION_SOLUTIONS.md](docs/COOKIE_EXTRACTION_SOLUTIONS.md), [COOKIE_WORKAROUND.md](docs/COOKIE_WORKAROUND.md) | Intranet cookie |
| [WEB_CORS_LIMITATION.md](docs/WEB_CORS_LIMITATION.md), [WEB_QUICKSTART.md](docs/WEB_QUICKSTART.md), [WEB_TESTING_CHECKLIST.md](docs/WEB_TESTING_CHECKLIST.md) | Web version |
| [JENKINS_INTEGRATION.md](docs/JENKINS_INTEGRATION.md) | Jenkins |
| [CUSTOM_SOUNDS.md](docs/CUSTOM_SOUNDS.md) | Sounds |
| [DEVELOPMENT_GUIDELINES.md](docs/DEVELOPMENT_GUIDELINES.md), [GIT_SETUP.md](docs/GIT_SETUP.md), [QUICKSTART.md](docs/QUICKSTART.md) | Development |
| [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Contributing |

## License

The source files carry an MIT permission notice (© 2025 Epitech). Built as part of Epitech coursework.
