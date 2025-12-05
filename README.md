# EpiCheck - Student Presence Management App

A React Native Expo application for managing student presence at Epitech using QR code scanning (desktop/web) and NFC card scanning (mobile).

## Features

- 📱 **Multi-Platform Support**: Works on iOS, Android, and Web
- 📷 **QR Code Scanning**: Scan student QR codes using device camera
- 🔌 **NFC Support**: Scan student NFC cards on mobile devices
- 🔐 **Epitech Authentication**: Secure login with Epitech credentials
- 📊 **Real-time Tracking**: View scanned students in real-time
- 🎨 **Modern UI**: Beautiful interface built with NativeWind (Tailwind CSS)

## Prerequisites

- **Node.js** (v18 or later) - [Download](https://nodejs.org/)
- **npm** or **yarn**
- **Expo Go** app on your mobile device (for testing)
- **Epitech Account** with API access

## Installation

### 1. Clone or Navigate to the Project

```bash
cd /Users/alexandredfm/Documents/@Code/EpiCheck
```

### 2. Install Dependencies

If you haven't already installed dependencies:

```bash
# Using nvm (recommended)
nvm use --lts

# Install packages
npm install
```

### 3. Install Expo CLI (if not already installed)

```bash
npm install -g expo-cli
```

## Configuration

### Epitech API Setup

The app is pre-configured to use the Epitech API at `https://my.epitech.eu/api`.

**Important**: You may need to adjust the API endpoints in `services/epitechApi.ts` based on the actual Epitech API documentation:

```typescript
// services/epitechApi.ts
const API_BASE_URL = "https://my.epitech.eu/api";
```

### Modifying API Endpoints

Based on the [Epitech API documentation](https://my.epitech.eu/api/docs), you might need to adjust these methods:

- **Authentication**: `/auth/login` or similar endpoint
- **Presence Marking**: `/presence` or module-specific endpoint
- **Student Info**: `/students/{email}` or user lookup endpoint

## Running the App

### Development Mode

Start the Expo development server:

```bash
npm start
```

This will open Expo DevTools in your browser. You can then:

### Run on Different Platforms

#### iOS (requires macOS)

```bash
npm run ios
```

#### Android

```bash
npm run android
```

#### Web (with Proxy Server)

**Important**: The web platform requires a proxy server to bypass CORS restrictions.

**Quick Start:**

1. **Start the proxy server** (in one terminal):

    ```bash
    npm run proxy
    ```

2. **Start the web app** (in another terminal):

    ```bash
    npm run web
    ```

3. **Follow authentication steps** in the app to extract your Intranet cookie

#### Web (with Docker)

##### Development Mode

1. **Build and run with Docker**:

    ```bash
    docker compose -f docker-compose.dev.yml -p epicheck-dev build
    ```

2. **Run the container**:

    ```bash
    docker compose -f docker-compose.dev.yml -p epicheck-dev up -d
    ```

##### Prod Mode

1. **Build and run with Docker**:

    ```bash
    docker compose -f docker-compose.yml -p epicheck-prod build
    ```

2. **Run the container**:

    ```bash
    docker compose -f docker-compose.yml -p epicheck-prod up -d
    ```

📚 **Full web setup guide:** See [`docs/WEB_QUICKSTART.md`](docs/WEB_QUICKSTART.md)

**Note:** For production deployment, see [`proxy-server/README.md`](proxy-server/README.md)

### Using Expo Go (Mobile Testing)

1. Install **Expo Go** from App Store (iOS) or Play Store (Android)
2. Run `npm start`
3. Scan the QR code shown in the terminal with:
    - **iOS**: Camera app
    - **Android**: Expo Go app

## Usage Guide

### 1. Login

- Launch the app
- Enter your Epitech email and password
- Tap "Login"

### 2. Scanning Modes

#### QR Code Mode (Desktop/Web/Mobile)

- Select "📷 QR Code" tab
- Point camera at student's QR code
- Presence will be marked automatically

#### NFC Mode (Mobile Only)

- Select "📱 NFC" tab (available only on mobile)
- Hold student's NFC card near device
- Presence will be marked automatically

### 3. View Scan History

- Scanned students appear at the bottom of the screen
- Green = Success, Red = Error
- Tap "Clear" to remove history

### 4. Logout

- Tap the "Logout" button in the top-right corner

## Project Structure

```
EpiCheck/
├── App.tsx                      # Main app entry with navigation
├── app.json                     # Expo configuration
├── package.json                 # Dependencies
├── tsconfig.json               # TypeScript configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── metro.config.js             # Metro bundler config (NativeWind)
├── global.css                  # Global Tailwind styles
├── nativewind-env.d.ts         # NativeWind type declarations
│
├── components/
│   ├── QRScanner.tsx           # QR code scanner component
│   └── NFCScanner.tsx          # NFC scanner component
│
├── screens/
│   ├── LoginScreen.tsx         # Authentication screen
│   └── PresenceScreen.tsx      # Main presence marking screen
│
└── services/
    └── epitechApi.ts           # Epitech API service layer
```

## API Integration

### Authentication Flow

```typescript
import epitechApi from "./services/epitechApi";

// Login
await epitechApi.login({
    email: "user@epitech.eu",
    password: "password",
});

// Mark presence
await epitechApi.markPresence("student@epitech.eu");

// Logout
epitechApi.logout();
```

### Customizing QR Code Format

If your QR codes contain JSON or specific format, modify `components/QRScanner.tsx`:

```typescript
// Example: QR code contains JSON
const handleBarCodeScanned = ({ data }) => {
    try {
        const parsed = JSON.parse(data);
        const email = parsed.email || parsed.studentId + "@epitech.eu";
        onScan(email);
    } catch (e) {
        // Handle plain text QR codes
        onScan(data);
    }
};
```

### Customizing NFC Card Reading

For specific NFC card formats, modify `components/NFCScanner.tsx`:

```typescript
// Read NDEF message or use tag ID
// Map tag ID to student email if needed
const tagId = "..."; // extracted from NFC tag
const email = await lookupEmailByTagId(tagId);
```

## Building for Production

### Android APK/AAB

```bash
# Build APK
eas build --platform android --profile preview

# Build for Play Store
eas build --platform android --profile production
```

### iOS (requires Apple Developer Account)

```bash
eas build --platform ios --profile production
```

### Web

```bash
npm run web
# Then deploy the web-build folder to your hosting
```

## Troubleshooting

### Camera Permission Issues

**iOS**: Check `app.json` for `NSCameraUsageDescription`
**Android**: Ensure `CAMERA` permission is in `app.json`

### NFC Not Working

- **Android**: Ensure device has NFC hardware and it's enabled
- **iOS**: Requires iPhone 7 or later with iOS 13+
- Check `app.json` for proper NFC permissions

### API Connection Errors

1. Verify Epitech API endpoint is correct
2. Check network connection
3. Verify API credentials
4. Check API documentation for correct endpoints

### Metro Bundler Issues

```bash
# Clear cache and restart
npm start -- --clear
```

## Development Notes

### NativeWind v4

This project uses NativeWind v4 for styling. Key features:

- Tailwind CSS classes work directly on React Native components
- Use `className` prop instead of `style`
- See [NativeWind docs](https://www.nativewind.dev/) for more info

### TypeScript

The app is fully typed with TypeScript for better development experience.

## Dependencies

### Core

- **expo** - React Native framework
- **react-native** - Mobile app framework
- **typescript** - Type safety

### UI & Styling

- **nativewind** - Tailwind CSS for React Native
- **tailwindcss** - CSS framework
- **react-native-reanimated** - Animations
- **react-native-safe-area-context** - Safe area handling

### Navigation

- **@react-navigation/native** - Navigation library
- **@react-navigation/native-stack** - Stack navigator
- **react-native-screens** - Native navigation primitives

### Features

- **expo-camera** - Camera and QR code scanning
- **react-native-nfc-manager** - NFC card reading
- **axios** - HTTP client for API calls
- **@expo/vector-icons** - Icon library

## License

This project is for educational purposes as part of Epitech coursework.

## Support

For issues or questions:

1. Check the Epitech API documentation
2. Review the troubleshooting section
3. Contact your Epitech administrator

---

Made with ❤️ for Epitech Students
