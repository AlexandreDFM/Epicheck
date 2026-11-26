# Debugging Office 365 Authentication - Redirect Issue

## What I've Added

I've added extensive console logging throughout the authentication flow to help diagnose why the redirect isn't happening after successful authentication.

## How to Debug

### 1. Open Console/Terminal Logs

When you run `npm start`, you'll see logs in the terminal. Watch for these specific messages:

### 2. Expected Log Flow (Successful Login)

```
1. "Starting Office 365 login..."
2. "Creating auth request with config: {...}"
3. "Prompting for authorization..."
4. [User signs in with Microsoft]
5. "Auth result type: success"
6. "Auth code received, exchanging for tokens..."
7. "Tokens received, storing..."
8. "Fetching user info..."
9. "User info received: [Name]"
10. "Login process complete"
11. "Login successful, user info: {...}"
12. "Email validated, calling onLoginSuccess..."
13. "handleLoginSuccess called"
14. "Access token retrieved: YES"
15. "Token set in API service"
16. "Setting isLoggedIn to true..."
17. "Login state updated"
18. "App render - isLoggedIn: true, isCheckingAuth: false"
```

### 3. Check for Issues

Look for where the log sequence stops. Common issues:

#### Issue 1: Alert Blocking the Flow

**Fixed**: Moved the success alert to appear AFTER calling `onLoginSuccess()`, not before.

#### Issue 2: State Not Updating

**Check**: If you see "Login state updated" but still on login screen, the navigation might not be re-rendering.

#### Issue 3: Token Not Retrieved

**Check**: If "Access token retrieved: NO" appears, tokens weren't stored properly.

## Testing Steps

### Step 1: Clear All Cached Data

```bash
# Stop the app
# Clear secure storage and cache
npm start -- --clear
```

### Step 2: Test Login Flow

1. Launch the app
2. Click "Sign in with Microsoft"
3. Watch the console logs
4. Complete Microsoft sign-in
5. Note where the log sequence stops

### Step 3: Check Metro Bundler

In the Metro bundler terminal, you should see:

- No red errors
- Log messages appearing in sequence
- "App render - isLoggedIn: true" after successful login

## Common Problems & Solutions

### Problem 1: "Authentication was cancelled"

**Symptoms**: User completes login but gets "cancelled" message

**Solution**:

- Check Azure AD redirect URI matches exactly
- Ensure `epicheck://auth` is registered
- Try adding your current IP: `exp://[your-ip]:8081/auth`

### Problem 2: Login succeeds but screen doesn't change

**Symptoms**:

- All logs show success
- "Login state updated" appears
- Still showing login screen

**Possible causes**:

1. React Navigation not re-rendering
2. State update not triggering re-render
3. Alert dialog blocking the UI update

**Solution**:

- I've already moved the Alert to appear AFTER navigation
- Check if you see multiple "App render" logs with isLoggedIn changing

### Problem 3: "Access token retrieved: NO"

**Symptoms**: Token not found after login

**Solution**:

- Check logs for "Tokens received, storing..."
- Verify SecureStore is working (on real device/simulator, not all platforms support it)
- Check for errors in token storage

### Problem 4: Redirect URI mismatch

**Symptoms**: "redirect_uri_mismatch" error in browser

**Current redirect URI in code**:

```
epicheck://auth
```

**What to do**:

1. Run the app
2. Check console for: "Creating auth request with config"
3. Copy the exact `redirectUri` value
4. Add it to Azure AD App Registration → Authentication → Redirect URIs

## Quick Test Without Azure AD

If you want to test the navigation without Office 365, temporarily modify LoginScreen:

```typescript
const handleOffice365Login = async () => {
    setIsLoading(true);

    // TEMPORARY TEST - Remove after debugging
    setTimeout(() => {
        onLoginSuccess();
        setIsLoading(false);
    }, 1000);
};
```

This will test if navigation works without the OAuth flow.

## Verify These Files

### 1. services/office365Auth.ts

- Client ID is set: `985e002b-598c-41a8-81a0-0c1d482f0bfb`
- Redirect URI is generated correctly
- Tokens are being stored

### 2. App.tsx

- `handleLoginSuccess` is defined
- State update happens: `setIsLoggedIn(true)`
- Navigation switches based on `isLoggedIn`

### 3. screens/LoginScreen.tsx

- `onLoginSuccess()` is called after email validation
- Loading state is managed properly

## Next Steps

1. Run the app: `npm start`
2. Open the console/terminal
3. Click "Sign in with Microsoft"
4. Copy all console logs from start to finish
5. Share the logs if issue persists

The logs will tell us exactly where the process is failing.

## Expected Outcome

After successful authentication:

1. Login screen should disappear
2. Presence screen should appear
3. "Welcome [Name]!" alert should show (after transition)
4. You should be able to scan QR codes/NFC

---

**Remember**: Check your terminal for the console logs - they will show exactly what's happening!
