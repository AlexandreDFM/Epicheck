# Azure AD Single-Page Application (SPA) Configuration

## Problem

You're encountering this error:

```
AADSTS9002326: Cross-origin token redemption is permitted only for the 'Single-Page Application' client-type
```

This happens because your Azure AD app is registered as a **Web Application** instead of a **Single-Page Application (SPA)**, which doesn't allow the PKCE flow required for web-based authentication.

## Solution: Change App Registration Type to SPA

### Step 1: Access Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find and select your app: `EpiCheck` (Client ID: `985e002b-598c-41a8-81a0-0c1d482f0bfb`)

### Step 2: Update Redirect URIs

1. In the left sidebar, click **Authentication**
2. Under **Platform configurations**, you should see **Web** platform configured
3. Click **Add a platform** button
4. Select **Single-page application**
5. Add your redirect URIs:
    - For Expo: `epicheck://auth`
    - For Web development: `https://auth.expo.io/@your-username/epicheck`
    - For local testing: `http://localhost:19006/auth` (if needed)
6. Click **Configure**

### Step 3: Remove Old Web Platform (Optional but Recommended)

1. Under **Platform configurations**, find the **Web** platform section
2. Click the **...** menu or **Remove** button
3. Confirm removal

### Step 4: Configure SPA Settings

1. Under **Single-page application** platform:
    - **Redirect URIs**: Ensure all URIs from Step 2 are listed
    - **Implicit grant and hybrid flows**: Leave unchecked (not needed for PKCE)

### Step 5: Update Supported Account Types (If Needed)

1. In the left sidebar, click **Overview**
2. Under **Essentials**, check **Supported account types**
3. It should be: **Accounts in any organizational directory (Any Azure AD directory - Multitenant)**
4. If not, go to **Authentication** and update it

### Step 6: API Permissions

Ensure these permissions are granted:

1. In the left sidebar, click **API permissions**
2. You should have:
    - **Microsoft Graph** → **User.Read** (Delegated)
    - **Microsoft Graph** → **email** (Delegated)
    - **Microsoft Graph** → **openid** (Delegated)
    - **Microsoft Graph** → **profile** (Delegated)
3. Click **Grant admin consent** if available (requires admin rights)

### Step 7: Save and Test

1. Click **Save** at the top if you made changes
2. Wait 1-2 minutes for changes to propagate
3. Test the authentication flow in your app

## Verification

After making these changes, try authenticating again. The error should be resolved and the OAuth flow should complete successfully with token exchange working.

## Additional Notes

### For Web Testing

- Make sure your Expo web server is running: `npm run web`
- The redirect URI should match your Expo web configuration

### For Mobile Testing

- The `epicheck://auth` redirect URI works for both iOS and Android
- Make sure your `app.json` has the correct scheme configured

### Troubleshooting

If you still encounter issues:

1. Clear browser cache and localStorage
2. Make sure all redirect URIs are exact matches (no trailing slashes)
3. Check Azure AD logs under **Enterprise applications** → **Sign-in logs**
4. Verify the `responseType` in `office365Auth.ts` is set to `ResponseType.Code`

## Current Configuration

- **Client ID**: `985e002b-598c-41a8-81a0-0c1d482f0bfb`
- **Tenant**: `organizations` (multi-tenant)
- **Auth Method**: Authorization Code with PKCE
- **Redirect URI**: `epicheck://auth`
