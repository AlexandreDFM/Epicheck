# Jenkins Integration Guide

This document explains how to set up and use the Jenkins credential management and build tracking feature in EpiCheck.

## Overview

The Jenkins integration allows you to:
- Store Jenkins credentials securely in the app
- Automatically fetch and display build status for students
- Track build results across activities
- Quick access to build pages and build history

## Features

### 1. **Secure Credential Storage**
- Jenkins credentials are stored securely using `expo-secure-store` on mobile platforms and `localStorage` on web
- Credentials are never exposed in logs or console output

### 2. **Build Status Tracking**
- Automatically fetches the latest build information for each student when viewing an activity
- Displays build status with color-coded indicators:
  - 🟢 **SUCCESS** - Build passed
  - 🔴 **FAILURE** - Build failed
  - 🟡 **UNSTABLE** - Build has warnings
  - ⚪ **ABORTED** - Build was aborted
  - 🔵 **NOT_BUILT** - No build available

### 3. **Quick Access**
- Click on build status to open the build page in browser
- Fetch build info on demand for students without cached data
- Fallback to Jenkins URL if credentials aren't configured

## Setup Instructions

### Step 1: Generate Jenkins API Token

1. Log in to your Jenkins instance (e.g., https://jenkins.epitest.eu)
2. Click on your username in the top-right corner
3. Select **Configure**
4. Scroll down to **API Token** section
5. Click **Generate** button
6. Copy the generated token (keep it safe!)

### Step 2: Enter Credentials in Settings

1. Open the EpiCheck app
2. Navigate to **Settings**
3. Find the **JENKINS SETTINGS** section
4. Enter your credentials:
   - **Jenkins Base URL**: `https://jenkins.epitest.eu` (or your custom URL)
   - **Jenkins Username**: Your Jenkins username
   - **Jenkins API Token**: The token you generated in Step 1
5. Click **SAVE CREDENTIALS**

The app will validate your credentials immediately. If validation fails, check:
- Username and token are correct
- Jenkins server is accessible
- Base URL doesn't have trailing slashes

### Step 3: View Build Status

1. Navigate to **Activities** and select an activity
2. Go to the RDV Details screen
3. The app will automatically fetch build information for all students if credentials are configured
4. Build status will appear on each student's Jenkins button:
   - Shows the latest build number and status
   - Color-coded indicator for quick reference

## Usage

### Viewing Build Status

When viewing RDV details with Jenkins credentials configured:

- **For Individual Students**: Each student card displays:
  - Current build number
  - Build status (SUCCESS, FAILURE, etc.)
  - Click to open the build page

- **For Groups**: Each group member shows:
  - Status indicator
  - Click to view their build

### Opening Jenkins

- **With credentials**: Clicking opens the latest build page
- **Without credentials**: Clicking opens the Jenkins job page

### Managing Credentials

#### Updating Credentials
1. Go to Settings → Jenkins Settings
2. Update any field
3. Click **SAVE CREDENTIALS**

#### Clearing Credentials
1. Go to Settings → Jenkins Settings
2. Click **CLEAR** button
3. Confirm the action

## Technical Details

### File Structure

```
services/
├── jenkinsService.ts       # Credential management
└── jenkinsApi.ts           # Jenkins API calls

screens/
├── SettingsScreen.tsx      # Credentials input UI
└── RdvDetailsScreen.tsx    # Build status display & tracking
```

### API Integration

The Jenkins API service makes authenticated calls to Jenkins using Basic Auth:

```
Authorization: Basic <base64(username:token)>
```

### Build Information Fetched

For each student's build, the app retrieves:
- Build number
- Build status (SUCCESS, FAILURE, UNSTABLE, ABORTED, NOT_BUILT)
- Build timestamp
- Build duration
- Build URL
- Build display name

### Caching Strategy

- Build information is cached per student/login
- Cache is cleared when navigating away from RDV Details
- Manual refresh not required; builds are fetched automatically

## Troubleshooting

### "Failed to validate credentials"

**Possible causes:**
- Incorrect username or token
- Jenkins server is down or unreachable
- Firewall/proxy blocking connections
- Invalid Base URL

**Solution:**
- Verify Jenkins is accessible from your network
- Check username and token are correct
- Try using a different Base URL if behind a proxy
- Check Jenkins security settings allow API access

### "Could not fetch build information"

**Possible causes:**
- Build job doesn't exist for this student
- Job path is incorrect for the project structure
- Insufficient permissions

**Solution:**
- Verify the job path matches your Jenkins structure
- Check that the student's job exists (navigate manually in Jenkins)
- Ensure your API token has sufficient permissions

### Build status not updating

**Possible causes:**
- Jobs still being fetched (check for loading indicators)
- Network connection issues
- Jenkins credentials not saved

**Solution:**
- Wait for loading indicators to complete
- Check your network connection
- Verify credentials are saved in settings

## Jenkins Job Path Structure

The app constructs Jenkins job paths using the following pattern:

```
/view/{MODULE_BASE}/job/{MODULE_CODE}/job/{PROJECT_NAME}/job/{YEAR}/job/{INSTANCE}/job/{LOGIN}/
```

Example:
```
/view/G-PSU/job/G-PSU-100/job/myproject/job/2024/job/NCE-1-1/job/johndoe/
```

**Components:**
- `MODULE_BASE`: First two parts of module code (e.g., "G-PSU" from "G-PSU-100")
- `MODULE_CODE`: Full module code (e.g., "G-PSU-100")
- `PROJECT_NAME`: Project name extracted from activity/RDV
- `YEAR`: Academic year from activity
- `INSTANCE`: Instance code from activity
- `LOGIN`: Student's login (without @epitech.eu)

## Security Notes

1. **Token Storage**: API tokens are stored securely using platform-specific secure storage
2. **HTTPS**: Always use HTTPS URLs for Jenkins connections
3. **Token Rotation**: Consider rotating your Jenkins API token periodically
4. **Network**: Ensure your Jenkins instance is not exposed to the public internet
5. **Logging**: Sensitive information (tokens, credentials) is never logged

## API Reference

### JenkinsService

```typescript
// Store credentials
await jenkinsService.setCredentials(username, token, baseUrl);

// Check if credentials are configured
const hasCredentials = await jenkinsService.hasCredentials();

// Get stored credentials
const { username, token, baseUrl } = await jenkinsService.getCredentials();

// Clear credentials
await jenkinsService.clearCredentials();

// Validate credentials
const isValid = await jenkinsService.validateCredentials();
```

### JenkinsApi

```typescript
// Get last build info
const buildInfo = await jenkinsApi.getLastBuild(jobPath);

// Get specific build info
const buildInfo = await jenkinsApi.getBuildInfo(jobPath, buildNumber);

// Get job info
const jobInfo = await jenkinsApi.getJobInfo(jobPath);

// Get console output
const output = await jenkinsApi.getBuildConsoleOutput(jobPath, buildNumber);

// Trigger a build
await jenkinsApi.triggerBuild(jobPath, parameters);
```

## Future Enhancements

Potential features to add:
- Build history visualization
- Console output viewer in-app
- Manual build triggering from app
- Build notifications
- Historical build analytics
- Build trend charts
- Integration with other CI/CD systems

## Support

For issues or questions, refer to:
1. Check the troubleshooting section above
2. Review Jenkins server logs
3. Verify API token permissions in Jenkins
4. Check application console logs (DevTools)
