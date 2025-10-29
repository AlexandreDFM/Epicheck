# Intranet Cookie Workaround

## Problem

The Intranet authentication currently doesn't work because:

1. We use `expo-web-browser` which opens OAuth in a separate browser context
2. After successful OAuth, the Intranet sets a cookie in that browser
3. We cannot extract cookies from `expo-web-browser` - it's a security limitation
4. The old project used `react-native-webview` with `CookieManager` which CAN extract cookies
5. When you close the browser, it returns "dismiss" instead of providing the cookie

## Solutions

### Option 1: Manual Cookie Entry via UI (Easiest for Testing) ⭐

**In Development Mode Only:**

1. **Start the app** and you'll see the login screen
2. **Click "🧪 Dev: Use Manual Cookie"** button at the bottom
3. **Get your cookie from browser:**
   - Open https://intra.epitech.eu in Chrome/Firefox
   - Login with your Office365 account
   - Open Developer Tools (F12)
   - Go to Application tab → Cookies → https://intra.epitech.eu
   - Find the `user` cookie and copy its value (it's a long string)
4. **Paste the cookie** in the prompt that appears
5. **Click "Set Cookie"** and you'll be logged in!

This button only appears in development mode (`__DEV__` flag).

### Option 2: Manual Cookie via Code

### Option 2: Manual Cookie via Code

If the UI button doesn't work or you're testing programmatically:

You can manually extract and enter your Intranet cookie:

1. **Get your cookie:**
   - Open https://intra.epitech.eu in Chrome/Firefox
   - Login with your Office365 account
   - Open Developer Tools (F12)
   - Go to Application tab → Cookies → https://intra.epitech.eu
   - Find the `user` cookie and copy its value

2. **Set the cookie in the app:**
   - Add this to your code (e.g., in App.tsx or a test file)

```typescript
// In App.tsx or LoginScreen.tsx
import intraAuth from './services/intraAuth';

// Manually set your cookie (run this once)
async function setTestCookie() {
  const yourCookie = 'YOUR_COOKIE_VALUE_HERE';
  await intraAuth.setTestCookie(yourCookie);
  console.log('Cookie set successfully');
}

// Call this before testing
setTestCookie();
```

### Option 3: Use Web Version

The web version of the app can use the browser's existing cookies:

1. Run `npm run web`
2. Navigate to https://intra.epitech.eu and login
3. Then access your app at localhost:8081
4. The app will share cookies with the Intranet domain

### Option 4: Implement react-native-webview (Recommended for Production)

Install and configure react-native-webview:

```bash
npx expo install react-native-webview
```

Then update `services/intraAuth.ts` to use WebView instead of WebBrowser:

```typescript
import { WebView } from 'react-native-webview';
import CookieManager from '@react-native-cookies/cookies';

// In authenticateWithIntranet():
// Use WebView component to load OAuth URL
// Listen for navigation to intra.epitech.eu
// Extract cookie using CookieManager.get()
```

### Option 5: Use Intranet API Token (If Available)

If Epitech provides an API token system, use that instead of cookies:

1. Check if `/user/token` or similar endpoint exists
2. Exchange OAuth code for API token
3. Use token as Bearer instead of cookie

## Testing Without Cookie

To test the app without Intranet authentication:

1. Skip the login or use the "Continue Anyway" option when auth fails
2. Activities screen will show "No Intranet cookie found" warnings
3. Basic QR/NFC scanning UI will work
4. API calls will fail with 401/403 errors
5. Presence marking won't work without a valid event context

## Quick Start (Development)

**Easiest way to test right now:**

1. Start the app: `npm start`
2. Open the login screen
3. Click "🧪 Dev: Use Manual Cookie" at the bottom
4. Follow the prompt to get and paste your cookie
5. You're in! Test the Activities and Presence features

## Current Status

- ✅ Office365 OAuth works (with Azure AD SPA fix)
- ❌ Intranet cookie extraction doesn't work with expo-web-browser
- ✅ Manual cookie entry works as workaround
- ✅ API service is ready and will work once cookie is available

## Next Steps

1. **For testing:** Use manual cookie entry (Option 1)
2. **For production:** Implement react-native-webview (Option 3)
3. **Alternative:** Explore if Epitech has a token-based API
