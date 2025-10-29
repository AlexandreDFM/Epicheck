# Building for iOS

This guide explains how to build and install EpiCheck on your iPhone.

## Prerequisites

### 1. Xcode
- Install from Mac App Store (free)
- Open Xcode once to accept license agreement
- Install Command Line Tools: `xcode-select --install`

### 2. Apple Developer Account
- Free account works for testing (7-day certificates)
- Sign in to Xcode with your Apple ID
- Go to: Xcode → Settings → Accounts → Add Apple ID

### 3. iPhone Setup
- Connect iPhone via USB
- Trust your Mac on the iPhone
- Enable Developer Mode on iPhone (iOS 16+):
  - Settings → Privacy & Security → Developer Mode → ON
  - Restart iPhone when prompted

## Quick Build (Development)

### Option 1: Using npm script

```bash
npm run ios
```

This will:
1. Generate iOS project (if needed)
2. Build the app
3. Install on connected iPhone
4. Launch the app

### Option 2: Manual build

```bash
# Generate iOS project (first time only)
npx expo prebuild --platform ios

# Build and install
npx expo run:ios --device
```

## Troubleshooting

### "No connected devices found"

1. Connect iPhone via USB
2. Unlock your iPhone
3. Trust the Mac (popup on iPhone)
4. Run `xcrun xctrace list devices` to verify connection

### "Signing requires a development team"

1. Open Xcode: `open ios/epiccheck.xcworkspace`
2. Select the project in the left sidebar
3. Go to "Signing & Capabilities" tab
4. Under "Team", select your Apple ID
5. Xcode will automatically generate a provisioning profile

### "Could not launch app"

1. On your iPhone: Settings → General → VPN & Device Management
2. Trust your developer certificate
3. Try running the app again from Xcode or Metro

### "Build failed"

Common fixes:
```bash
# Clean build
cd ios && xcodebuild clean && cd ..

# Reset pods
cd ios && rm -rf Pods Podfile.lock && pod install && cd ..

# Regenerate project
npx expo prebuild --platform ios --clean
```

## Development vs Production

### Development Build (Testing)
- **Certificate**: 7 days with free account
- **Installation**: Via Xcode/USB
- **Updates**: Requires rebuild
- **Size**: Larger (includes dev tools)

### Production Build (Distribution)
- **Certificate**: Requires paid Apple Developer Program ($99/year)
- **Installation**: App Store or TestFlight
- **Updates**: Over-the-air
- **Size**: Optimized

## Building for Distribution

If you want to distribute the app:

### 1. Join Apple Developer Program
- Cost: $99/year
- Required for: App Store, TestFlight, Enterprise distribution
- Sign up at: https://developer.apple.com/programs/

### 2. Use EAS Build (Expo Application Services)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

### 3. Or Build Locally for TestFlight

```bash
# Generate production build
npx expo run:ios --configuration Release

# Archive in Xcode
open ios/epiccheck.xcworkspace

# In Xcode: Product → Archive
# Then upload to App Store Connect
```

## Quick Commands Reference

```bash
# List connected devices
xcrun xctrace list devices

# Build for specific device
npx expo run:ios --device "Your iPhone Name"

# Build for simulator
npx expo run:ios

# Clean and rebuild
cd ios && xcodebuild clean && cd .. && npm run ios

# Check iOS version
xcrun simctl list devices

# Install pods
cd ios && pod install && cd ..
```

## File Locations

**iOS Project**: `ios/epiccheck.xcworkspace`
**Build Output**: `ios/build/`
**App Bundle**: `ios/build/Build/Products/Debug-iphoneos/epiccheck.app`

## Common Issues

### Certificate Expired
- Free accounts: Rebuild every 7 days
- Paid account: Valid for 1 year
- Fix: Re-sign in Xcode or rebuild

### "Could not find iPhone"
```bash
# Reset USB connection
# Unplug → Wait 5 seconds → Replug
# Then run: npm run ios
```

### "Bundle identifier already exists"
- Change bundle ID in app.json
- Or: Clean derived data in Xcode

### Metro bundler issues
```bash
# Reset Metro
npx expo start --clear

# In another terminal
npm run ios
```

## Performance Tips

1. **First build is slow** (5-10 minutes)
2. **Subsequent builds are faster** (1-3 minutes)
3. **Use USB 3.0** for faster deployment
4. **Close other Xcode projects** to free memory
5. **Simulator is faster** for UI testing

## Testing Workflow

### For Development:
```bash
# 1. Start Metro bundler
npm start

# 2. In another terminal, install on iPhone
npm run ios --device

# 3. App auto-reloads on code changes
```

### For Production Testing:
```bash
# Build release version
npx expo run:ios --configuration Release --device
```

## App Capabilities

The app requires these iOS capabilities:
- ✅ Camera (QR scanning)
- ✅ NFC (Student cards)
- ✅ Network (API calls)
- ✅ Background audio (Silent mode sounds)

These are automatically configured in `ios/epiccheck/Info.plist`.

## Notes

- **Wireless debugging** is possible after first USB install
- **Hot reload** works over network after initial install
- **Production builds** require paid Apple Developer account
- **Free account** is perfect for personal testing
- **Simulator** doesn't support NFC or Camera

## Next Steps

After successful build:
1. ✅ App installs on iPhone
2. ✅ Trust developer certificate in Settings
3. ✅ Test camera QR scanning
4. ✅ Test NFC if available
5. ✅ Test presence marking
6. ✅ Verify sounds work
