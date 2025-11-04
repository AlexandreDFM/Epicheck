# Hybrid Office365 + Intranet Authentication

## Overview

The app now uses a **hybrid authentication approach** combining:

1. **Office365 OAuth** (current implementation) - For user identity and Microsoft Graph API
2. **Intranet Session Cookie** (from old project) - For Epitech Intranet API access

This matches the old EToken project's authentication pattern while keeping the modern Office365 flow.

## Authentication Flow

### Step 1: Office365 Login

```
User clicks "Sign in with Office 365"
    ↓
Office365 OAuth flow (PKCE)
    ↓
Get user info from Microsoft Graph
    ↓
Validate @epitech.eu email
    ↓
Store Office365 access token
```

### Step 2: Intranet Authentication

```
After Office365 success:
    ↓
Open WebView with Intranet OAuth URL
    ↓
User authenticates via Microsoft (redirects to intra.epitech.eu/auth/office365)
    ↓
Intranet creates session and sets 'user' cookie
    ↓
Extract cookie value
    ↓
Store cookie for API calls
```

### Step 3: API Access

```
Intranet API calls:
    ↓
Use cookie as Bearer token
    Authorization: Bearer {cookie_value}
    ↓
Access all Intranet endpoints
```

## Implementation Files

### New Files

#### `services/intraAuth.ts`

- **Purpose**: Handle Intranet authentication and session management
- **Key Methods**:
    - `authenticateWithIntranet()` - Opens WebView for OAuth, extracts cookie
    - `checkIntranetSession()` - Validates existing session
    - `getIntraCookie()` / `setIntraCookie()` - Cookie storage
    - `fetchIntranetAPI(url, options)` - Make authenticated Intra API calls
    - `isAuthenticated()` - Check if user has valid Intranet session

#### `services/intraApi.ts`

- **Purpose**: Intranet API service using cookie authentication
- **Key Methods**:
    - `authenticate()` - Trigger Intranet OAuth flow
    - `getCurrentUser()` - Get user profile from Intranet
    - `getActivities()` - Load planning/events
    - `getRegisteredStudents()` - Get students for event
    - `updatePresence()` - Mark student presence
    - All methods automatically include cookie as Bearer token

### Modified Files

#### `screens/LoginScreen.tsx`

**Changes**:

- Import `intraApi`
- After Office365 login success, call `intraApi.authenticate()`
- Handle Intranet auth errors gracefully (continue with limited features)
- Navigate to Activities screen

```typescript
// After Office365 login:
try {
    await intraApi.authenticate();
} catch (intraError) {
    Alert.alert("Warning", "Intranet authentication failed...");
}
```

#### `screens/PresenceScreen.tsx`

**Changes**:

- Import `intraApi`
- Clear Intranet session on logout
- Pass event to `epitechApi.markPresence()`

```typescript
onPress: async () => {
  await office365Auth.logout();
  await intraApi.logout();
  epitechApi.logout();
  navigation.reset({ ... });
}
```

#### `screens/ActivitiesScreen.tsx`

**Changes**:

- Handle session expiration gracefully
- Prompt user to re-authenticate if session expired
- Clear Intranet session on logout

```typescript
catch (error) {
  if (error.message.includes('Session expired')) {
    Alert.alert('Re-login', ..., [
      { text: 'Re-login', onPress: () => intraApi.authenticate() }
    ]);
  }
}
```

## OAuth Configuration

### Old Epitech Client (from old project)

```typescript
CLIENT_ID: "e05d4149-1624-4627-a5ba-7472a39e43ab";
AUTHORIZE_URL: "https://login.microsoftonline.com/common/oauth2/authorize";
REDIRECT_URI: "https://intra.epitech.eu/auth/office365";
```

This client is configured in the old Epitech infrastructure and handles the OAuth redirect to Intranet.

### Current App Client (new)

```typescript
CLIENT_ID: "985e002b-598c-41a8-81a0-0c1d482f0bfb";
TENANT: "organizations";
REDIRECT_URI: "epicheck://auth";
```

This client is for the Office365 authentication in the new app.

## Cookie-Based Authentication (Like Old Project)

### How It Works

The old project used `react-native-cookies` to extract the session cookie after OAuth:

```javascript
// Old project code:
CookieManager.get(config.IntraUrl).then((res) => {
    params.headers.Authorization = "Bearer " + res.user;
    fetch(url, params);
});
```

### New Implementation

We replicate this behavior:

1. After OAuth redirect to Intranet, the server sets a `user` cookie
2. We extract this cookie from the response headers
3. Store it securely (SecureStore/localStorage)
4. Use it as Bearer token for all Intranet API calls

```typescript
// New implementation:
const cookie = await intraAuth.getIntraCookie();
headers.Authorization = `Bearer ${cookie}`;
```

## API Request Flow

### Old Project

```javascript
function fetchAPI(url, params = {}) {
    return new Promise((resolve, reject) => {
        CookieManager.get(require("../config.js").IntraUrl).then((res) => {
            params.headers.Authorization = "Bearer " + res.user;
            fetch(url, params).then((response) => resolve(response));
        });
    });
}
```

### New Project

```typescript
// In intraApi.ts interceptor:
this.api.interceptors.request.use(async (config) => {
    const cookie = await intraAuth.getIntraCookie();
    if (cookie) {
        config.headers.Authorization = `Bearer ${cookie}`;
    }
    return config;
});
```

## Session Management

### Session Validation

```typescript
// Check if session is still valid:
const isValid = await intraApi.isAuthenticated();

if (!isValid) {
    // Session expired, re-authenticate
    await intraApi.authenticate();
}
```

### Session Expiration Handling

```typescript
// In API calls:
catch (error) {
  if (error.response?.status === 401 || error.response?.status === 403) {
    await intraAuth.clearIntraCookie();
    throw new Error('Session expired. Please log in again.');
  }
}
```

### Logout

```typescript
// Clear all auth data:
await office365Auth.logout(); // Clear Office365 tokens
await intraApi.logout(); // Clear Intranet cookie
epitechApi.logout(); // Clear API tokens
```

## WebView OAuth Flow

### Authentication URL Construction

```typescript
const authUrl = `${OAUTH_AUTHORIZE_URL}?response_type=code&client_id=${EPITECH_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    `${INTRA_URL}/auth/office365`,
)}&state=${encodeURIComponent("/")}`;
```

### Opening WebView

```typescript
const result = await WebBrowser.openAuthSessionAsync(authUrl, `${INTRA_URL}/`);

if (result.type === "success") {
    // User authenticated, now fetch cookie
    const cookie = await this.fetchIntranetCookie();
}
```

### Cookie Extraction

```typescript
// Extract 'user' cookie from response headers:
const cookies = response.headers["set-cookie"];
const match = cookie.match(/user=([^;]+)/);
if (match) {
    return match[1]; // Cookie value
}
```

## Testing the Flow

### Manual Test Steps

1. **Start app** and click "Sign in with Office 365"
2. **Login** with Epitech Office365 account
3. **WebView opens** for Intranet authentication
4. **Authenticate** via Microsoft (may skip if already logged in)
5. **WebView closes**, cookie extracted
6. **Activities load** from Intranet API
7. **Select activity**, scan students
8. **Verify presence** on intra.epitech.eu

### Debugging Cookie Extraction

```typescript
// Add logging to see cookie:
const cookie = await intraAuth.getIntraCookie();
console.log(
    "Intranet cookie:",
    cookie ? cookie.substring(0, 20) + "..." : "null",
);
```

### Test API Call

```typescript
// Test Intranet API access:
try {
    const user = await intraApi.getCurrentUser();
    console.log("Intranet user:", user.login, user.email);
} catch (error) {
    console.error("Intranet API error:", error);
}
```

## Advantages of Hybrid Approach

### Office365 Authentication

✅ Modern OAuth 2.0 + PKCE flow
✅ Microsoft Graph API access
✅ Secure token management
✅ Cross-platform support

### Intranet Cookie Authentication

✅ Matches old project behavior
✅ Works with existing Intranet infrastructure
✅ No changes needed to Intranet backend
✅ Session-based authentication (like web app)

## Differences from Old Project

### Old Project (EToken)

- Used `react-native-cookies` package
- Required WebView navigation monitoring
- Cookie extraction was automatic via native module
- No Office365 token storage (only Intranet cookie)

### New Project (EpiCheck)

- Uses `expo-web-browser` for OAuth
- Manual cookie extraction from headers
- Cross-platform storage (SecureStore/localStorage)
- Dual tokens: Office365 + Intranet cookie

## Security Considerations

### Token Storage

- **Office365 tokens**: SecureStore (native) / localStorage (web)
- **Intranet cookie**: SecureStore (native) / localStorage (web)
- Both encrypted at rest on native platforms

### Cookie Lifecycle

- **Creation**: After successful OAuth with Intranet
- **Usage**: Sent as Bearer token in API calls
- **Validation**: Checked on each API call (401/403 = expired)
- **Renewal**: Re-authenticate via WebView
- **Deletion**: On logout or session expiration

### HTTPS Only

All authentication and API calls use HTTPS:

- `https://login.microsoftonline.com` - OAuth
- `https://intra.epitech.eu` - Intranet API
- `https://graph.microsoft.com` - Microsoft Graph

## Troubleshooting

### Issue: "Session expired" error

**Cause**: Intranet cookie has expired
**Solution**: Call `intraApi.authenticate()` to get new cookie

### Issue: WebView doesn't open

**Cause**: Platform limitations (web doesn't support WebView)
**Solution**: Use web-based OAuth flow or native build

### Issue: Cookie not extracted

**Cause**: OAuth redirect doesn't set cookie properly
**Solution**:

1. Verify OAuth client ID matches old project
2. Check redirect URI is correct
3. Ensure Intranet backend sets cookie after OAuth

### Issue: 401 Unauthorized on API calls

**Cause**: Cookie invalid or missing
**Solution**:

1. Check cookie is stored: `await intraAuth.getIntraCookie()`
2. Re-authenticate: `await intraApi.authenticate()`
3. Verify Bearer token format in headers

## Next Steps

- [ ] Test on real device with actual Epitech account
- [ ] Verify cookie extraction works correctly
- [ ] Test session expiration and renewal
- [ ] Add cookie refresh logic (before expiration)
- [ ] Implement automatic session renewal
- [ ] Add better error handling for network issues
- [ ] Cache user info to reduce API calls

## Code Examples

### Complete Login Flow

```typescript
// In LoginScreen.tsx:
const handleOffice365Login = async () => {
    try {
        // Step 1: Office365 OAuth
        const userInfo = await office365Auth.login();

        // Validate Epitech email
        if (!userInfo.mail?.endsWith("@epitech.eu")) {
            Alert.alert("Invalid Account", "Use Epitech account");
            return;
        }

        // Step 2: Set Office365 token for Graph API
        const accessToken = await office365Auth.getAccessToken();
        epitechApi.setOffice365Token(accessToken);

        // Step 3: Authenticate with Intranet
        try {
            await intraApi.authenticate();
        } catch (intraError) {
            Alert.alert("Warning", "Intranet auth failed. Limited features.");
        }

        // Step 4: Navigate to app
        navigation.replace("Activities");
    } catch (error) {
        Alert.alert("Login Failed", error.message);
    }
};
```

### Making Authenticated API Calls

```typescript
// Automatically includes cookie as Bearer token:
const activities = await intraApi.getActivities("FR/NCE", "2024-10-27");
const students = await intraApi.getRegisteredStudents(event);
await intraApi.markStudentPresent(event, "student.login");
```

### Handling Session Expiration

```typescript
// In ActivitiesScreen.tsx:
try {
    const data = await epitechApi.getTodayActivities();
    setActivities(data);
} catch (error) {
    if (error.message.includes("Session expired")) {
        Alert.alert("Session Expired", "Please log in again", [
            {
                text: "Re-login",
                onPress: async () => {
                    await intraApi.authenticate();
                    loadActivities(); // Retry
                },
            },
        ]);
    }
}
```
