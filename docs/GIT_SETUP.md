# Git Setup Guide — EpiCheck

Complete setup guide to get the project running on a local machine after cloning.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [1. Clone the Repository](#1-clone-the-repository)
- [2. Branch Strategy](#2-branch-strategy)
- [3. Configure Git Remotes](#3-configure-git-remotes)
- [4. Install Node.js & pnpm](#4-install-nodejs--pnpm)
- [5. Install Dependencies](#5-install-dependencies)
- [6. Environment Configuration](#6-environment-configuration)
- [7. Editor Configuration](#7-editor-configuration)
- [8. Running the Project](#8-running-the-project)
- [9. Useful Commands](#9-useful-commands)
- [10. Troubleshooting](#10-troubleshooting)

---

## Prerequisites

| Tool          | Minimum Version | Install                                                    |
| ------------- | --------------- | ---------------------------------------------------------- |
| **Git**       | 2.30+           | `brew install git` or [git-scm.com](https://git-scm.com/) |
| **Node.js**   | 22+ (LTS)       | Via **nvm** (recommended) — see below                      |
| **pnpm**      | 9+              | `corepack enable && corepack prepare pnpm@latest`          |
| **Xcode**     | 15+ (macOS)     | Mac App Store (for iOS builds)                             |
| **CocoaPods** | 1.14+ (macOS)   | `sudo gem install cocoapods`                               |
| **JDK**       | 17 (Android)    | `brew install openjdk@17`                                  |
| **Android Studio** | Latest     | [developer.android.com](https://developer.android.com/studio) |

After cloning the repository, run `nvm install && nvm use` in the project root to use the Node.js version defined in the `.nvmrc` file.
> **Note:** For **web-only** development, only Git, Node.js, and pnpm are required.

---

## 1. Clone the Repository

```bash
# SSH (recommended — requires SSH key on your GitHub account)
git clone git@github.com:AlexandreDFM/Epicheck.git
cd Epicheck

# Or HTTPS
git clone https://github.com/AlexandreDFM/Epicheck.git
cd Epicheck
```

---

## 2. Branch Strategy

| Branch        | Purpose                       | Deploys to          |
| ------------- | ----------------------------- | ------------------- |
| `main`        | Production-ready code         | Production (CI/CD)  |
| `develop`     | Integration / staging branch  | Staging (CI/CD)     |
| `feature/*`   | New features                  | —                   |
| `fix/*`       | Bug fixes                     | —                   |

### Day-to-day workflow

```bash
# Always start from develop
git checkout develop
git pull origin develop

# Create your feature branch
git checkout -b feature/my-feature

# Work, commit, push
git add .
git commit -m "feat: description of the change"
git push origin feature/my-feature

# Then open a Pull Request into develop on GitHub
```

### Commit convention (recommended)

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add NFC scan on presence screen
fix: resolve login token expiration
docs: update setup guide
chore: bump expo to v54
refactor: extract QR scanner component
```

---

## 3. Configure Git Remotes

The repository has two push targets (personal fork + Epitech organization):

```bash
# Verify current remotes
git remote -v

# Expected output:
# origin  git@github.com:AlexandreDFM/Epicheck.git (fetch)
# origin  git@github.com:AlexandreDFM/Epicheck.git (push)
# origin  git@github.com:epitech-nice/EpiCheck.git (push)
```

If the Epitech push remote is missing, add it:

```bash
git remote set-url --add --push origin git@github.com:epitech-nice/EpiCheck.git
```

> This setup fetches from your personal repo and pushes to **both** remotes simultaneously.

---

## 4. Install Node.js & pnpm

### Using nvm (recommended)

```bash
# Install nvm if not present
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Install and use Node LTS
nvm install --lts
nvm use --lts

# Enable corepack (ships with Node 16.13+)
corepack enable

# Activate pnpm
corepack prepare pnpm@latest --activate

# Verify
node -v   # Should be v18+ (LTS)
pnpm -v   # Should be v9+
```

> **Important:** This project uses **pnpm** — not npm or yarn. Always use `pnpm` commands.

---

## 5. Install Dependencies

### Main application

```bash
pnpm install
```

### Proxy server (for web development with CORS bypass)

```bash
cd proxy-server
pnpm install
cd ..
```

### Native prebuild (Android/iOS)

```bash
# Generate native projects (android/ and ios/ folders)
npx expo prebuild

# iOS only — install CocoaPods dependencies
cd ios && pod install && cd ..
```

### Android Gradle properties

If the `android/gradle.properties` file is missing or needs reset:

```bash
cp android.gradle.properties.template android/gradle.properties
```

---

## 6. Environment Configuration

### Main app `.env`

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
# Epitech API
EXPO_PUBLIC_API_BASE_URL=https://my.epitech.eu/api

# Proxy URL (for web — CORS bypass)
EXPO_PUBLIC_PROXY_URL=http://localhost:3001/api/intra-proxy

# Azure AD Authentication (get from Azure Portal)
EXPO_PUBLIC_AZURE_CLIENT_ID=<your-client-id>
EXPO_PUBLIC_AZURE_TENANT_ID=organizations
```

### Proxy server `.env`

```bash
cp proxy-server/.env.example proxy-server/.env
```

Edit `proxy-server/.env`:

```env
PORT=3001
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006,http://localhost:3000
NODE_ENV=development
```

> **Never commit `.env` files.** They are already in `.gitignore`.

---

## 7. Editor Configuration

### VS Code (recommended)

Install these extensions:

- **ESLint** — `dbaeumer.vscode-eslint`
- **Prettier** — `esbenp.prettier-vscode`
- **Tailwind CSS IntelliSense** — `bradlc.vscode-tailwindcss`
- **React Native Tools** — `msjsdiag.vscode-react-native`

Create or update `.vscode/settings.json` (local, gitignored):

```json
{
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 4,
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": "explicit"
    },
    "typescript.tsdk": "node_modules/typescript/lib",
    "files.eol": "\n"
}
```

### Prettier config (already in repo)

The project uses this `.prettierrc`:

```json
{
    "singleQuote": false,
    "trailingComma": "all",
    "tabWidth": 4,
    "useTabs": false,
    "plugins": ["prettier-plugin-tailwindcss"]
}
```

---

## 8. Running the Project

### Start the Expo development server

```bash
pnpm start
```

### Platform-specific

```bash
# iOS Simulator (macOS only)
pnpm ios

# iOS Physical device
pnpm ios:device

# Android Emulator
pnpm android

# Web Browser
pnpm web
```

### Proxy server (needed for web platform)

```bash
pnpm proxy
```

### Run with cache cleared

```bash
pnpm start --clear
```

---

## 9. Useful Commands

| Command                        | Description                        |
| ------------------------------ | ---------------------------------- |
| `pnpm start`                   | Start Expo dev server              |
| `pnpm web`                     | Start in web browser               |
| `pnpm ios`                     | Run on iOS Simulator               |
| `pnpm android`                 | Run on Android Emulator            |
| `pnpm lint`                    | Run ESLint                         |
| `pnpm format`                  | Format all files with Prettier     |
| `pnpm proxy`                   | Start proxy server (web platform)  |
| `pnpm build:android:release`   | Build Android release APK          |
| `pnpm build:ios`               | Build iOS via EAS                  |
| `npx expo prebuild`            | Generate native project files      |
| `npx expo-doctor`              | Check project health               |

---

## 10. Troubleshooting

### `pnpm install` fails

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Metro bundler won't start

```bash
pnpm start --clear
```

### iOS build fails (CocoaPods)

```bash
cd ios
pod deintegrate
pod install --repo-update
cd ..
```

### Android build fails

```bash
cd android
./gradlew clean
cd ..
npx expo prebuild --clean
```

### Permission denied on `gradlew`

```bash
chmod +x android/gradlew
```

### TypeScript / lint errors

```bash
pnpm lint
pnpm format
```

### Environment variables not loading

- Ensure your `.env` file exists at the project root
- Restart the Metro bundler after changing `.env`
- Variables must be prefixed with `EXPO_PUBLIC_` to be accessible in the app

---

## Quick Start TL;DR

```bash
git clone git@github.com:AlexandreDFM/Epicheck.git
cd Epicheck
git checkout develop
nvm use --lts
corepack enable
pnpm install
cp .env.example .env
# Edit .env with your values
pnpm start
```
