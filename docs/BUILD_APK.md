# Building APK Locally (Without EAS)

This guide explains how to build an APK for your EpiCheck app without using Expo Application Services (EAS).

## Prerequisites

✅ **Already Installed:**

- Java JDK 17 (OpenJDK)
- Android SDK
- Android platform-tools (adb)
- Android build-tools 36.0.0
- Android platform 36

## Build Options

### 1. Debug APK (Development Build)

Build a debug APK that can be installed on any Android device:

```bash
npm run build:android:debug
```

Or directly:

```bash
expo run:android --variant debug
```

**Output location:** `android/app/build/outputs/apk/debug/app-debug.apk`

```bash
cp android/app/build/outputs/apk/debug/app-debug.apk ./epicheck-debug.apk
```

### 2. Release APK (Production Build)

Build a release APK for distribution:

```bash
npm run build:apk
```

Or:

```bash
npm run build:android:release
```

**Output location:** `android/app/build/outputs/apk/release/app-release.apk`

```bash
cp android/app/build/outputs/apk/release/app-release.apk ./epicheck-release-unsigned.apk
```

## First Time Setup

If the `android` folder doesn't exist yet, generate it first:

```bash
npx expo prebuild --platform android
```

This creates the native Android project with all necessary configurations.

## Signing the Release APK (Production)

For production releases, you need to sign your APK. Create a keystore:

### Step 1: Generate a Keystore

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore epicheck-release-key.keystore -alias epicheck -keyalg RSA -keysize 2048 -validity 10000
```

You'll be asked for:

- Keystore password (remember this!)
- Key password
- Your name/organization details

### Step 2: Configure Gradle Signing

Create `android/gradle.properties`:

```properties
epicheck_UPLOAD_STORE_FILE=epicheck-release-key.keystore
epicheck_UPLOAD_KEY_ALIAS=epicheck
epicheck_UPLOAD_STORE_PASSWORD=your_keystore_password
epicheck_UPLOAD_KEY_PASSWORD=your_key_password
```

### Step 3: Update Build Configuration

Edit `android/app/build.gradle` to add signing config:

```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('epicheck_UPLOAD_STORE_FILE')) {
                storeFile file(epicheck_UPLOAD_STORE_FILE)
                storePassword epicheck_UPLOAD_STORE_PASSWORD
                keyAlias epicheck_UPLOAD_KEY_ALIAS
                keyPassword epicheck_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 4: Build Signed Release APK

```bash
npm run build:apk
```

## Installing the APK

### On Connected Device

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Manual Installation

1. Copy the APK to your device
2. Open the APK file on your device
3. Allow installation from unknown sources if prompted
4. Install the app

## Build Options Comparison

| Build Type | Command                       | Use Case            | Size    | Performance |
| ---------- | ----------------------------- | ------------------- | ------- | ----------- |
| Debug      | `npm run build:android:debug` | Development/Testing | Larger  | Slower      |
| Release    | `npm run build:apk`           | Production          | Smaller | Optimized   |

## Troubleshooting

### Build Fails

1. Clean the build:

```bash
cd android && ./gradlew clean && cd ..
```

2. Rebuild:

```bash
npm run build:apk
```

### Missing Android Folder

Run prebuild:

```bash
npx expo prebuild --platform android
```

### Gradle Issues

Update Gradle wrapper:

```bash
cd android && ./gradlew wrapper --gradle-version=8.14.3 && cd ..
```

### Out of Memory

Edit `android/gradle.properties` and add:

```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

## Build Artifacts Location

After successful build, find your APK at:

**Debug:**

```
android/app/build/outputs/apk/debug/app-debug.apk
```

**Release:**

```
android/app/build/outputs/apk/release/app-release.apk
```

## Quick Build Commands

```bash
# Generate Android project (first time only)
npx expo prebuild --platform android

# Debug build
npm run build:android:debug

# Release build (unsigned)
npm run build:apk

# Install on device
adb install android/app/build/outputs/apk/release/app-release.apk

# Build and install in one command
expo run:android --variant release
```

## Notes

- Debug builds are automatically signed with a debug keystore
- Release builds need proper signing for distribution
- APK size will be ~30-50MB depending on assets and dependencies
- First build takes longer (5-10 minutes)
- Subsequent builds are faster (1-3 minutes)
