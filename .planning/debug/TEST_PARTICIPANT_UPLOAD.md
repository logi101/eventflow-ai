# Test Instructions: Participant File Upload

**Date**: 2026-02-01
**Purpose**: Diagnose why participant file upload still appears broken after previous fix

---

## Background

A fix was previously applied to change `pointerEvents:'none'` to `className="hidden"` on hidden file inputs. However, you reported the upload still doesn't work. I've added comprehensive debugging logs to find out exactly what's happening.

---

## Test Procedure

### Step 1: Prepare the Environment

1. **Stop the dev server** if it's running (Ctrl+C in terminal)
2. **Restart the dev server** to ensure latest code is loaded:
   ```bash
   cd /Users/eliyawolfman/claude_brain/projects/eventflows/eventflow-app
   npm run dev
   ```
3. **Clear browser cache** (or open an Incognito/Private window)
4. **Open browser DevTools** (F12 or Right-click → Inspect)
5. **Switch to Console tab** in DevTools

### Step 2: Prepare Test File

Create a simple Excel file with these columns:
- שם פרטי (First Name)
- שם משפחה (Last Name)
- טלפון (Phone)
- אימייל (Email) - optional
- טראק (Track) - optional

Example rows:
```
ישראל | ישראלי | 0501234567 | test@test.com | טכנולוגיה
שרה | כהן | 0509876543 | sara@test.com | עסקים
```

Save as `test-participants.xlsx`

### Step 3: Test the Upload

1. **Navigate to Program Management page** in the app
2. **Check console** - you should see page load logs
3. **Select an event** from the dropdown at top-right
4. **Check console** - note what's logged
5. **Click the "יבא משתתפים" (Import Participants) button**
6. **Check console** - you should see: `[DEBUG] Participants import button clicked`
7. **Observe** - does the file selection dialog open?
   - If YES → Select your test file → Continue to Step 4
   - If NO → Note this and copy all console logs
8. **After selecting file** - check console for more [DEBUG] logs
9. **Observe** - do you see any alerts or loading indicators?

### Step 4: Collect Diagnostic Information

Please report back with ALL of the following:

#### A. Console Logs
Copy ALL lines that start with `[DEBUG]` - paste them here:
```
(paste console logs here)
```

#### B. Behavior Observed
- [ ] Button is visible
- [ ] Button appears clickable (not grayed out)
- [ ] Clicking button shows alert "יש לבחור אירוע לפני ייבוא משתתפים"
- [ ] File dialog opens when clicking button
- [ ] File dialog does NOT open when clicking button
- [ ] After selecting file, loading spinner appears
- [ ] After selecting file, nothing happens
- [ ] After selecting file, alert appears with message: _____________

#### C. Browser Information
- Browser: (Chrome / Firefox / Safari / Edge)
- Version: __________
- Operating System: __________

#### D. Network Tab (if file dialog opened)
1. Switch to Network tab in DevTools
2. Click "יבא משתתפים" button again
3. Select file again
4. Look for requests to Supabase functions (filter by "bulk-insert")
5. Do you see any network requests? __________
6. If yes, what status codes? __________

---

## Expected Debug Output

If everything works correctly, you should see logs like this:

```
[DEBUG] Participants import button clicked {selectedEventId: "abc-123", importing: false, refExists: true}
[DEBUG] Triggering file input click
[DEBUG] handleParticipantsImport called {filesLength: 1, selectedEventId: "abc-123"}
[DEBUG] Starting import for file: test-participants.xlsx
```

Followed by either:
- Success alert: "יובאו X משתתפים בהצלחה!"
- Or error alert: "לא נמצאו משתתפים תקינים בקובץ" or "שגיאה בייבוא"

---

## Common Issues to Check

### Issue 1: No Event Selected
- **Symptom**: Alert shows "יש לבחור אירוע לפני ייבוא משתתפים"
- **Solution**: Select an event from dropdown first
- **Console log**: `[DEBUG] No event selected - showing alert`

### Issue 2: File Dialog Doesn't Open
- **Symptom**: Click button, nothing happens
- **Possible causes**:
  - Browser security blocking programmatic file open
  - Ref is null (refExists: false in console)
  - Another element blocking the button

### Issue 3: File Selected but No Feedback
- **Symptom**: File dialog opens, you select file, but nothing happens
- **Possible causes**:
  - onChange handler not firing
  - Early return in handler (check console for "Early return" log)
  - Error in XLSX parsing (should show error alert)

---

## Additional Debug Commands

If needed, you can also run these in the browser console:

```javascript
// Check if participantsFileRef exists
console.log('Ref exists:', !!document.querySelector('input[type="file"][accept*="xlsx"]'))

// Check selected event
console.log('Selected event:', document.querySelector('[data-testid="event-selector"]')?.value)

// Check importing state (not easily accessible, but page should show spinner if true)
```

---

## Next Steps

After you provide the diagnostic information above, I'll be able to:
1. Identify the exact failure point
2. Determine if it's a code issue or environment issue
3. Provide a targeted fix
4. Or guide you through additional troubleshooting if needed

---

**Thank you for your patience in testing this!**
