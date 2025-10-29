# Quick Start Guide

## First Time Setup

1. **Ensure Node.js is installed via nvm**
   ```bash
   nvm use --lts
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

## Daily Workflow

### Start Development Server
```bash
npm start
```

### Run on Specific Platform

**iOS Simulator** (macOS only)
```bash
npm run ios
```

**Android Emulator**
```bash
npm run android
```

**Web Browser**
```bash
npm run web
```

### Testing on Physical Device

1. Install **Expo Go** from App Store or Play Store
2. Run `npm start`
3. Scan QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app

## Common Commands

### Clear Cache
```bash
npm start -- --clear
```

### Reset Project
```bash
rm -rf node_modules package-lock.json
npm install
```

### Check for Updates
```bash
npx expo-doctor
```

## Features to Test

- [x] Login with Epitech credentials
- [x] Switch between QR and NFC modes
- [x] Scan QR codes (works on all platforms)
- [x] Scan NFC cards (mobile only)
- [x] View scan history
- [x] Clear scan history
- [x] Logout

## Customization Points

### API Endpoints
Edit: `services/epitechApi.ts`

### UI Styling
Edit screens in: `screens/`
Edit components in: `components/`
Modify Tailwind: `tailwind.config.js`

### Permissions
Edit: `app.json`

## Troubleshooting

**Metro bundler won't start**
```bash
npm start -- --clear
```

**Dependencies issues**
```bash
rm -rf node_modules
npm install
```

**TypeScript errors**
```bash
npm run web  # Verify build works
```

**Camera not working**
- Check permissions in `app.json`
- Restart Expo Go app
- Grant camera permissions on device

**NFC not working**
- Only works on physical devices with NFC
- Ensure NFC is enabled in device settings
- iOS requires iPhone 7+ with iOS 13+

## Next Steps

1. Test login with actual Epitech credentials
2. Configure API endpoints based on Epitech API docs
3. Test QR code scanning with student cards
4. Test NFC scanning on compatible devices
5. Customize UI colors/branding in Tailwind config

Enjoy building with EpiCheck! 🚀
