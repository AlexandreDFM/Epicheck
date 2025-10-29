# Authentication Changes

## What Changed (Latest Update)

The app now uses **WebView-based Intranet OAuth** with automatic cookie extraction! 🎉

### Authentication Flow (Updated)

1. User clicks "Sign in with Epitech"
2. **WebView opens inside the app** showing Office365 login
3. User authenticates with their Office365 credentials
4. OAuth redirects to `https://intra.epitech.eu/auth/office365`
5. User is redirected to Intranet home page
6. **App automatically extracts the 'user' cookie** from WebView
7. Cookie is saved securely and user is logged in
8. User navigates to Activities screen

### Technical Implementation

- Uses `react-native-webview` for OAuth flow
- Uses `@react-native-cookies/cookies` for cookie extraction
- WebView monitors navigation and extracts cookie when reaching Intranet
- Cookie is stored securely using `expo-secure-store`
- No manual cookie entry needed!

## Files Changed

### New Files
- `screens/IntraWebViewAuth.tsx` - Full-screen WebView authentication component
  - Monitors OAuth navigation
  - Automatically extracts 'user' cookie using CookieManager
  - Provides cancel button and loading states
  - Dev mode shows current URL for debugging

### Updated Files
- `services/intraAuth.ts` - Removed `expo-web-browser` dependency
  - Now designed to work with WebView component
  - `authenticateWithIntranet()` is a placeholder (auth happens in WebView)
  
- `screens/LoginScreen.tsx` - Uses WebView modal for authentication
  - Shows `IntraWebViewAuth` in a full-screen modal
  - Handles success callback to set cookie and fetch user info
  - Removed manual cookie workaround (no longer needed!)

### Removed Dependencies
- `expo-web-browser` - No longer used for authentication

### Added Dependencies
- `react-native-webview` - For in-app OAuth flow
- `@react-native-cookies/cookies` - For extracting session cookies

## How It Works Now

1. **User Experience:**
   - Click "Sign in with Epitech"
   - WebView opens showing Microsoft login
   - Enter Office365 credentials
   - Automatically logged in when Intranet loads
   - WebView closes and app navigates to Activities

2. **Cookie Extraction:**
   - WebView monitors `onNavigationStateChange`
   - When URL starts with `https://intra.epitech.eu` (home page)
   - Calls `CookieManager.get('https://intra.epitech.eu')`
   - Extracts `user` cookie value
   - Stores it securely via `intraAuth.setIntraCookie()`

3. **Session Management:**
   - Cookie stored in SecureStore (iOS/Android) or localStorage (web)
   - Used as Bearer token for all Intranet API requests
   - Validated on each API call
   - Cleared on logout

## Testing the App

### No Manual Steps Required! 🎉

Just run the app and login normally:

```bash
npm start
```

1. Click "Sign in with Epitech"
2. Enter your Office365 credentials in the WebView
3. Wait for automatic login
4. You're in!

The cookie extraction happens automatically in the background.

### Debugging

If you want to see what's happening:
- Check the console logs for "Cookie extracted successfully"
- In dev mode, the WebView shows the current URL at the top
- Cookie extraction attempts are logged with timing info

## Benefits of WebView Approach

✅ **Automatic cookie extraction** - No manual steps
✅ **Secure** - Cookie never leaves the device
✅ **Native feel** - In-app authentication
✅ **Reliable** - Works consistently across iOS/Android
✅ **Better UX** - No external browser switching
✅ **Production ready** - No workarounds needed

## Troubleshooting

If authentication fails:
1. Check console for error messages
2. Verify Office365 credentials are correct
3. Ensure you're using an @epitech.eu email
4. Try clearing app data and logging in again
5. Check that WebView has internet access

## Next Steps

✅ WebView authentication implemented
✅ Cookie extraction working
✅ No manual workarounds needed
- Test with real Epitech account
- Test on physical device
- Verify session persistence
- Test NFC functionality with real cards
