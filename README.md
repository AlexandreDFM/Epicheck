# EpiCheck

Mobile app (Android, iOS) for Epitech staff to take attendance and follow projects on the Epitech Intranet: scan the students' QR codes, mark presences in batch, register students on the fly, and grade follow-ups with their Jenkins build results at hand. A web version exists, with a limitation (see below).

> **Status:** maintained until the Epitech Intranet it relies on is retired. The end-of-life plan lives in `END.md`; this repository then becomes an archive. To bring it back to life later, start with [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and the [version rules](docs/development/VERSIONING.md).

## Features

| Screen            | What it does                                                                                                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login             | Office 365 login through the Intranet in a WebView; the Intranet cookie is kept in the device's secure storage                                                                                                   |
| Activities        | Your activities on the Intranet, in chronological order                                                                                                                                                          |
| Presence          | QR code scanning (one code, or **several at once** with multi-scan), batch mode (queue, then send), register mode (registers the student on the module and the event first), camera on/off, success/error sounds |
| Manual attendance | Mark students from the registered list                                                                                                                                                                           |
| Follow-ups (RDV)  | Registered students or groups, their last Jenkins build, trigger a build, open Jenkins                                                                                                                           |
| Grading           | Fill the grading scale (bareme) of a follow-up and save it to the Intranet                                                                                                                                       |
| Settings          | Theme, custom sounds, Jenkins credentials (validated before saving), manual cookie                                                                                                                               |

NFC: the scanner reads the card, but it returns the card's own identifier, not the student's email, and the card-to-student mapping is not available. QR codes are the supported method.

## Platforms

| Platform     | How it talks to the Intranet                                                                                                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Android, iOS | Directly                                                                                                                                                                                                                                                |
| Web          | Through the CORS proxy (`apps/proxy/`), because the Intranet sends no CORS headers. Outside the Epitech network the Intranet refuses requests coming from a server (anti-DDoS page), so the deployed web version is only reliable on the school network |

## Getting started

Requirements: Node 22 (`.nvmrc`) and pnpm (`corepack enable` installs the version pinned in `package.json`). Android: JDK 17 and the Android SDK. iOS: Xcode (macOS).

```bash
corepack enable
pnpm install

pnpm android        # build and run on an Android device or emulator
pnpm ios            # build and run on the iOS simulator (pnpm ios:device for a device)
pnpm start          # Metro only, for an installed development build
# native projects are generated in apps/mobile/android and apps/mobile/ios

# Web: the proxy and the Expo web server, in two terminals
pnpm proxy
pnpm web
```

Checks run by the CI: `pnpm typecheck`, `pnpm lint`, `pnpm test` (all workspace projects) and `pnpm --filter mobile exec expo install --check`.

## Versions and releases

`apps/mobile/package.json` holds the only version; the Android `versionCode` and iOS build number are derived from it (1.3.0 → 10300).

```bash
pnpm run version:bump patch    # or minor / major
# move the [Unreleased] notes of CHANGELOG.md under the new version
git commit -am "chore(release): vX.Y.Z"
# after the merge on main: tag vX.Y.Z -> signed APK and AAB attached to a GitHub release
```

Details: [docs/development/VERSIONING.md](docs/development/VERSIONING.md); signing keys, store publishing and the secrets they need: [docs/development/RELEASES.md](docs/development/RELEASES.md).

## Deployment (web)

`develop` deploys https://epicheck.ppd.nice-tek.eu (preprod) and `main` deploys https://epicheck.nice-tek.eu, on Kubernetes through GitHub Actions, with a deploy account limited to each namespace. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docker/README.md](docker/README.md).

## Repository layout

A pnpm workspace with two applications:

```
apps/
  mobile/              Expo app (Android, iOS, web): app.json, app.config.ts, configs
    src/               App.tsx, screens/, components/, services/, hooks/,
                       contexts/, types/, utils/   (imported as @/…)
    assets/            fonts, images, sounds
  proxy/               CORS proxy for the web version (Express, tests with node:test)
  e-token-plus/        git submodule: E-Token, the app that inspired EpiCheck (private archive)
docker/                image (Expo web export + nginx + proxy), nginx config
k8s/                   Kubernetes manifests and deploy accounts
scripts/               version.mjs, ci/ helpers
docs/                  guides, by topic (docs/README.md)
.github/workflows/     ci, build, deploy, android
```

Run a command in one project with `pnpm --filter mobile …` or `pnpm --filter proxy …`; the root scripts cover the usual ones.

## Documentation

The guides are grouped by topic in [docs/](docs/README.md): deployment, development (conventions, versions), Android, iOS, authentication and the Intranet cookie, web version, features (Jenkins, sounds). See also [apps/proxy/README.md](apps/proxy/README.md), [docker/README.md](docker/README.md), [CHANGELOG.md](CHANGELOG.md), [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Credits

- Developed by [@AlexandreDFM](https://github.com/AlexandreDFM).
- Thanks to [@xJundo](https://github.com/xJundo) (Gianni TUERO) for the follow-up (RDV) view and the date selection of activities (December 2025).
- Inspired by E-Token, the former Epitech attendance app by Mickaël Leclerc ([@MickaToast](https://github.com/MickaToast)) and Enguerrand Allamel ([@AEnguerrand](https://github.com/AEnguerrand)), property of Epitech. EpiCheck is a complete rewrite and reuses none of its code; E-Token is kept as a submodule for reference (`apps/e-token-plus`, private).
- Preceded by EpiTIG (2023), a first Flutter attempt for the pedagogical team with Corentin Levet ([@clevetdev](https://github.com/clevetdev)), whose unfinished state led to bringing EpiCheck to completion.

## License

Written by Alexandre Kévin DE FREITAS MARTINS for Epitech. The source files carry an MIT permission notice in Epitech's name (© 2025 Epitech), granted by the author.
