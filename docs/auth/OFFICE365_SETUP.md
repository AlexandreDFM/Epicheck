# Office 365 Authentication Setup Guide

## Overview

The EpiCheck app now uses Office 365 authentication via Microsoft Azure AD. Students and staff must sign in with their Epitech Office 365 accounts (@epitech.eu).

## ⚠️ IMPORTANT: Azure AD App Registration Required

Before the app can work, you **MUST** register the app in Azure AD and configure the credentials.

---

## Step 1: Register App in Azure AD Portal

### 1.1 Access Azure AD Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Sign in with an Epitech admin account (or your personal Microsoft account if testing)
3. Navigate to **Azure Active Directory** → **App registrations**
4. Click **New registration**

### 1.2 Configure App Registration

**Name**: `EpiCheck` (or your preferred name)

**Supported account types**: Select one of:

- `Accounts in any organizational directory (Any Azure AD directory - Multitenant)` - Recommended
- `Accounts in this organizational directory only (Epitech only)` - If you have access to Epitech's tenant

**Redirect URI**:

- Platform: `Public client/native (mobile & desktop)`
- Add these redirect URIs:
    ```
    exp://localhost:8081/auth
    epicheck://auth
    ```
- For production, also add:
    ```
    exp://your-production-domain/auth
    ```

Click **Register**

### 1.3 Get Application (Client) ID

1. After registration, you'll see the **Overview** page
2. Copy the **Application (client) ID** (e.g., `12345678-1234-1234-1234-123456789abc`)
3. Copy the **Directory (tenant) ID** if using single tenant

### 1.4 Configure Authentication

1. Go to **Authentication** in the left menu
2. Under **Advanced settings** → **Allow public client flows**: Set to **Yes**
3. Click **Save**

### 1.5 Configure API Permissions

1. Go to **API permissions** in the left menu
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Select **Delegated permissions**
5. Add these permissions:
    - `openid`
    - `profile`
    - `email`
    - `User.Read`
    - `offline_access`
6. Click **Add permissions**
7. (Optional) Click **Grant admin consent** if you have admin rights

---

## Step 2: Configure the App

### 2.1 Update services/office365Auth.ts

Open `/services/office365Auth.ts` and update the configuration:

```typescript
const AZURE_AD_CONFIG = {
    // Replace with your Client ID from Step 1.3
    clientId: "YOUR_CLIENT_ID_HERE",

    // Use 'organizations' for multi-tenant OR your specific tenant ID
    tenantId: "organizations", // or 'YOUR_EPITECH_TENANT_ID'

    scopes: ["openid", "profile", "email", "User.Read", "offline_access"],

    redirectUri: AuthSession.makeRedirectUri({
        scheme: "epicheck",
        path: "auth",
    }),
};
```

### 2.2 Update Environment Variables (Optional)

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Edit `.env`:

```env
EXPO_PUBLIC_AZURE_CLIENT_ID=your-client-id-here
EXPO_PUBLIC_AZURE_TENANT_ID=organizations
```

Then update `office365Auth.ts` to use environment variables:

```typescript
const AZURE_AD_CONFIG = {
    clientId: process.env.EXPO_PUBLIC_AZURE_CLIENT_ID || "YOUR_CLIENT_ID_HERE",
    tenantId: process.env.EXPO_PUBLIC_AZURE_TENANT_ID || "organizations",
    // ... rest of config
};
```

---

## Step 3: Test the Authentication Flow

### 3.1 Development Testing

```bash
npm start
```

### 3.2 Login Flow

1. Launch the app
2. Click **"Sign in with Microsoft"**
3. Browser will open with Microsoft login
4. Sign in with Epitech credentials (`firstname.lastname@epitech.eu`)
5. Grant permissions if prompted
6. App will redirect back and complete login

### 3.3 Verify Email Domain

The app automatically validates that users sign in with `@epitech.eu` emails. Non-Epitech accounts will be rejected.

---

## Architecture Overview

### Components

1. **services/office365Auth.ts** - Handles OAuth flow, token management
2. **screens/LoginScreen.tsx** - UI for Microsoft sign-in button
3. **App.tsx** - Auto-login on app launch, token restoration
4. **services/epitechApi.ts** - Uses Office 365 access token for API calls

### Authentication Flow

```
┌─────────────┐
│ App Launch  │
└──────┬──────┘
       │
       ├─> Check SecureStore for token
       │
       ├─> Token exists & valid?
       │   ├─> Yes: Auto-login ✓
       │   └─> No: Show Login Screen
       │
┌──────▼──────────┐
│ Login Screen    │
│ (Office365 btn) │
└──────┬──────────┘
       │
       ├─> Click "Sign in with Microsoft"
       │
┌──────▼──────────┐
│ Azure AD OAuth  │
│ (Browser popup) │
└──────┬──────────┘
       │
       ├─> User signs in
       ├─> Microsoft returns auth code
       │
┌──────▼──────────┐
│ Exchange code   │
│ for tokens      │
└──────┬──────────┘
       │
       ├─> Access Token
       ├─> Refresh Token
       ├─> Store in SecureStore
       │
┌──────▼──────────┐
│ Fetch user info │
│ (Microsoft      │
│  Graph API)     │
└──────┬──────────┘
       │
       ├─> Validate @epitech.eu domain
       │
┌──────▼──────────┐
│ Navigate to     │
│ Presence Screen │
└─────────────────┘
```

### Token Management

- **Access Token**: Used for API calls, expires in ~1 hour
- **Refresh Token**: Used to get new access tokens, long-lived
- **Auto-refresh**: Tokens are automatically refreshed before expiry
- **Secure Storage**: Tokens stored in device's secure storage (Keychain/Keystore)

---

## Troubleshooting

### "AADSTS50011: The reply URL specified in the request does not match"

**Solution**: Add the redirect URI to Azure AD:

1. Get the redirect URI by running:
    ```typescript
    console.log(
        AuthSession.makeRedirectUri({ scheme: "epicheck", path: "auth" }),
    );
    ```
2. Add this exact URI to Azure AD **Authentication** → **Redirect URIs**

### "Invalid client"

**Solution**: Verify the Client ID in `office365Auth.ts` matches Azure AD

### "AADSTS700016: Application not found"

**Solution**: Check that:

- Client ID is correct
- App registration is in the correct tenant
- Tenant ID is correct (or use 'organizations')

### Login popup doesn't appear

**Solution**:

- Ensure `expo-web-browser` is installed
- Check device/browser popup settings
- Try on different device/platform

### "Please use your Epitech Office 365 account"

**Solution**: You signed in with a non-Epitech email. Use `@epitech.eu` address.

### Token expired errors

**Solution**: Refresh token should handle this automatically. If persists:

1. Logout and login again
2. Clear app data/cache
3. Check refresh token in Azure AD permissions

---

## Production Deployment

### For EAS Build

1. Update `app.json`:

```json
{
    "expo": {
        "scheme": "epicheck",
        "extra": {
            "azureClientId": "your-client-id"
        }
    }
}
```

2. Add production redirect URI in Azure AD:

```
epicheck://auth
https://your-production-url/auth
```

3. Build:

```bash
eas build --platform android
eas build --platform ios
```

### For Standalone Apps

Ensure redirect URIs include:

- iOS: `epicheck://auth`
- Android: `epicheck://auth`
- Web: `https://your-domain/auth`

---

## Security Considerations

✅ **What's Secure:**

- OAuth 2.0 + PKCE flow
- Tokens stored in device secure storage
- No passwords stored in app
- Automatic token refresh
- Domain validation (@epitech.eu only)

⚠️ **Important:**

- Never commit Client ID to public repositories
- Use environment variables for sensitive data
- Regularly rotate Client Secrets (if using)
- Monitor Azure AD sign-in logs

---

## Support

For issues with:

- **Azure AD setup**: Contact Epitech IT administrators
- **App configuration**: Check this guide and `services/office365Auth.ts`
- **Authentication errors**: Check Azure AD sign-in logs in Azure Portal

---

## Summary Checklist

- [ ] Register app in Azure AD Portal
- [ ] Copy Client ID and Tenant ID
- [ ] Add redirect URIs to Azure AD
- [ ] Enable public client flows
- [ ] Add Microsoft Graph API permissions
- [ ] Update `office365Auth.ts` with Client ID
- [ ] Test login with Epitech account
- [ ] Verify automatic login works
- [ ] Test logout functionality
- [ ] Configure production redirect URIs

✅ Once complete, the app will use secure Office 365 authentication for all Epitech users!
