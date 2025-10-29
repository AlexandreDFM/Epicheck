# Presence Marking Fix - Using Intranet API

## Problem

The app was trying to mark presence on a local `/presence` endpoint that doesn't exist:
```
POST https://my.epitech.eu/api/presence
→ 404 Not Found
```

## Solution

Updated the app to use the **Epitech Intranet API** for marking presence on specific events.

## Changes Made

### 1. Updated `epitechApi.ts`

**Before:**
```typescript
async markPresence(studentEmail: string): Promise<any> {
  const response = await this.api.post("/presence", { studentEmail });
  // This endpoint doesn't exist!
}
```

**After:**
```typescript
async markPresence(studentEmail: string, event?: IntraEvent): Promise<any> {
  // Requires event context
  if (!event) {
    throw new Error("Event context required to mark presence");
  }
  
  // Get login from email
  const login = intraApi.getLoginFromEmail(studentEmail);
  
  // Mark on Intranet using the correct endpoint
  await intraApi.markStudentPresent(event, login);
}
```

### 2. Updated `PresenceScreen.tsx`

**Added:**
- Event parameter from route: `const event = route.params?.event`
- Event context check before marking presence
- Event information in header (activity title, type, date)
- Back button to return to Activities
- Warning when no event is selected

**Before:**
```typescript
await epitechApi.markPresence(email);
// No event context!
```

**After:**
```typescript
if (!event) {
  throw new Error("No event selected. Please go back and select an activity first.");
}
await epitechApi.markPresence(email, event);
// Uses event context for Intranet API
```

## How It Works Now

### Complete Flow

1. **User logs in** → Authenticates with Intranet
2. **Activities screen loads** → Shows today's events where user has prof/assistant rights
3. **User selects an event** → Navigates to PresenceScreen with event parameter
4. **User scans QR/NFC** → Gets student email
5. **App marks presence** → Calls Intranet API with event context

### Intranet API Endpoint Used

```
POST /module/{year}/{module}/{instance}/{activity}/{event}/updateregistered
Body: items[0][login]=student.login&items[0][present]=present
```

This is the official Epitech Intranet endpoint for marking student presence.

## Event Context

The event parameter contains:
```typescript
{
  scolaryear: "2024",
  codemodule: "B-CPE-100",
  codeinstance: "NCE-1-1",
  codeacti: "acti-123456",
  codeevent: "event-789012",
  acti_title: "Workshop - React Native",
  type_code: "tp",
  start: "2025-10-27T14:00:00",
  end: "2025-10-27T18:00:00",
  rights: ["prof_inst"]
}
```

All these fields are required to build the correct Intranet API URL.

## Testing

### Successful Test Flow

1. Login with Intranet authentication
2. Navigate to Activities screen
3. Select any event (e.g., "Workshop - React Native")
4. Scan a student QR code or NFC card
5. Check console for: `Marked firstname.lastname present for event: Workshop - React Native`
6. Verify on https://intra.epitech.eu that presence was marked

### Error Handling

**No event selected:**
```
Error: Event context required to mark presence. 
Please select an activity first.
```

**Invalid email format:**
```
Error: Invalid email format
```

**Network error:**
```
Error: Failed to mark presence
(Shows Intranet API error details)
```

**Session expired:**
```
Error: Session expired. Please log in again.
```

## UI Updates

### Header Shows Event Info

**With event:**
```
← Workshop - React Native
  TP • 10/27/2025
```

**Without event:**
```
← Presence Scanner
  ⚠️ No event selected
```

## Benefits

✅ Uses official Intranet API
✅ Presence marked on correct event
✅ Requires event context (no accidental marking)
✅ Shows event information in UI
✅ Proper error handling
✅ Follows Epitech's presence system

## Next Steps

- Test with real student cards
- Verify presence appears on Intranet
- Test multiple students in same event
- Test marking absent (if needed)
- Add bulk marking for multiple students
