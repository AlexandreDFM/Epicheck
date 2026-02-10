# Expo Build Issues & Workarounds

## Overview

This document outlines the issues encountered when building the EpiCheck project with Expo and the solutions applied to resolve them.

---

## Issue 1: Incompatible Expo Package Versions

### Problem
When running `expo start`, multiple packages had version mismatches:
```
Some dependencies are incompatible with the installed expo version:
  @react-native-community/datetimepicker@8.5.1 - expected version: 8.4.4
  expo-audio@1.0.15 - expected version: ~1.1.1
  expo-auth-session@7.0.9 - expected version: ~7.0.10
  ... (and many others)
```

### Root Cause
The project had outdated dependency versions that didn't match the Expo SDK 54 requirements.

### Solution
Updated all packages to their correct versions:

```bash
npx expo install \
  @react-native-community/datetimepicker@8.4.4 \
  expo-audio@~1.1.1 \
  expo-auth-session@~7.0.10 \
  expo-camera@~17.0.10 \
  expo-crypto@~15.0.8 \
  expo-document-picker@~14.0.8 \
  expo-font@~14.0.11 \
  expo-secure-store@~15.0.8 \
  expo-splash-screen@~31.0.13 \
  expo-status-bar@~3.0.9 \
  expo-web-browser@~15.0.10 \
  react-native-worklets@0.5.1 \
  babel-preset-expo@~54.0.10
```

Also updated Expo itself:
```bash
pnpm add expo@~54.0.33
```

---

## Issue 2: Missing `metro-core` Module

### Problem
When starting the dev server, the build process failed with:
```
Error: Cannot find module 'metro-core'
Require stack:
- /Users/.../metro/instantiateMet ro.js
- /Users/.../MetroBundlerDevServer.js
```

### Root Cause
The `metro` and `metro-core` packages were not installed as dev dependencies. This is required for the Expo CLI to bundle the JavaScript code.

### Solution
Install metro and metro-core as dev dependencies:

```bash
pnpm add -D metro metro-core
```

**Important**: Always use `pnpm start` (or `npx expo start`) instead of the global `expo start` command, which uses an outdated Expo CLI version that doesn't include metro-core in its dependencies.

---

## Issue 3: Missing PrivacyInfo.xcprivacy File

### Problem
Xcode build error:
```
Build input file cannot be found: '.../expo-application/ios/PrivacyInfo.xcprivacy'
```

### Root Cause
The `expo-application` package was missing the `PrivacyInfo.xcprivacy` file in the Pods directory structure.

### Solution
Create a minimal `PrivacyInfo.xcprivacy` XML file in the correct location:

```bash
mkdir -p node_modules/.pnpm/expo-application@7.0.7_expo@54.0.25_@babel+core@7.28.5_react-native-webview@13.15.0_rea_376ef56a0f338d5bf1862eeb211d870c/node_modules/expo-application/ios/

# Create the file with basic plist structure
cat > PrivacyInfo.xcprivacy << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict/>
</plist>
EOF
```

---

## Issue 4: Missing react-native-nfc-manager Build Files

### Problem
Xcode couldn't find multiple `.m` files from react-native-nfc-manager:
```
Build input file cannot be found:
  - '.../react-native-nfc-manager/ios/NfcManager.m'
  - '.../react-native-nfc-manager/ios/NfcManager+Felica.m'
  - '.../react-native-nfc-manager/ios/NfcManager+Iso15693.m'
  - '.../react-native-nfc-manager/ios/NfcManager+IsoDep.m'
  - '.../react-native-nfc-manager/ios/NfcManager+Mifare.m'
  - '.../react-native-nfc-manager/ios/Util.m'
```

### Root Cause
After updating Expo, CocoaPods was looking for files in the old pnpm directory structure. The issue occurred because:
1. Expo was updated from 54.0.25 to 54.0.33
2. This changed the dependency path from `@expo+config-plugins@54.0.2` to `@54.0.4`
3. Xcode's build cache still referenced the old paths

### Solution

#### Step 1: Clean Xcode Derived Data
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
```

#### Step 2: Reinstall Pods
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
```

#### Step 3: Regenerate Native Project Files
```bash
npx expo prebuild --clean
```

This regenerates all iOS native files to match the current dependency structure and creates correct references for all native modules.

---

## Working Development Setup

After applying all fixes, use these commands:

### Start the development server:
```bash
pnpm start
# or
npx expo start
```

### Run on iOS simulator:
```bash
pnpm ios
# or
npx expo run:ios
```

### Open in Xcode (if needed):
```bash
open ios/EpiCheck.xcworkspace
```

---

## Prevention Tips

1. **Keep dependencies in sync**: After major Expo updates, always run `npx expo install` to align versions
2. **Use local Expo CLI**: Always use `pnpm start` or `npx expo start` instead of the global `expo start` command
3. **Clean builds**: If you encounter mysterious build errors, clean and rebuild:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   cd ios && rm -rf Pods Podfile.lock
   pod install
   npx expo prebuild --clean
   ```
4. **Check pnpm structure**: With pnpm's strict dependency management, occasionally rebuild the dependency tree to ensure all files are properly linked

---

## Issue 5: Missing dSYM Files for Prebuilt Frameworks (TestFlight/App Store Upload)

### Problem
When uploading to TestFlight or App Store, Xcode reports missing dSYM files:
```
Upload Symbols Failed
The archive did not include a dSYM for the React.framework with the UUIDs [76FBCEE9-3517-30B3-9DC6-62C4E914E908].
The archive did not include a dSYM for the ReactNativeDependencies.framework with the UUIDs [B35F1182-B82E-3372-8A74-A4FE502C0906].
The archive did not include a dSYM for the hermes.framework with the UUIDs [80D5528F-2C78-3B90-B90F-747E89A9F880].
```

### Root Cause
React Native's prebuilt frameworks (downloaded from Maven) are distributed without debug symbols. This is normal and expected behavior for prebuilt frameworks.

### Solution

#### Option 1: Skip Symbol Upload (Recommended for Development/TestFlight)

If you're uploading to TestFlight or just need to submit the app, you can skip the symbol upload:

1. In Xcode, go to **Product → Archive**
2. After archiving completes, click **Distribute App**
3. Choose your distribution method
4. When prompted about symbolication, select **"Do Not Include Symbols"** or **"Skip"**

#### Option 2: Use EAS Build (Recommended for Production)

EAS (Expo Application Services) automatically handles dSYM generation and upload:

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure the project
eas build:configure

# Build for TestFlight/App Store
eas build --platform ios --auto-submit
```

This approach is simpler and handles all symbol management automatically.

#### Option 3: Disable Bitcode (If symbols are required)

If your organization requires symbols, you can disable bitcode to generate dSYM files:

1. Open `ios/EpiCheck.xcworkspace` in Xcode
2. Select the **EpiCheck** target
3. Go to **Build Settings**
4. Search for "bitcode"
5. Set **Enable Bitcode** to **No**
6. Rebuild and archive

Note: Disabling bitcode may affect app size and performance optimizations.

#### Option 4: Generate Loose dSYMs

Edit your `ios/Podfile` to force dSYM generation:

```ruby
post_install do |installer|
  installer.pods_project.targets.each do |target|
    flutter_additional_ios_build_settings(target)
    target.build_configurations.each do |config|
      config.build_settings['DEBUG_INFORMATION_FORMAT'] = 'dwarf-with-dsym'
    end
  end
end
```

Then rebuild:
```bash
cd ios && rm -rf Pods Podfile.lock build
pod install
npx expo prebuild --clean
```

---

## Summary

| Issue | Solution |
|-------|----------|
| Version mismatches | Run `npx expo install` with correct versions |
| Missing metro-core | Add `metro` and `metro-core` as dev dependencies |
| Missing PrivacyInfo.xcprivacy | Create minimal XML plist file |
| Wrong CocoaPods paths | Clean Derived Data, reinstall Pods, run `expo prebuild --clean` |
| Missing dSYM files (Upload failed) | Skip symbol upload, use EAS Build, disable bitcode, or generate dSYM via Podfile |

All issues have been resolved and the project should now build successfully on iOS.
