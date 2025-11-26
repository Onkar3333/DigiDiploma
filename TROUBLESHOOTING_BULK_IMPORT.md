# Troubleshooting Bulk Subject Import

If subjects are not getting added when you try to bulk import, follow these steps:

## Step 1: Check Firebase Status

Run this command in your terminal:

```bash
node backend/check-firebase-status.js
```

This will tell you:
- ✅ If Firebase is properly configured
- ✅ If the database connection works
- ✅ How many subjects are currently in Firebase

## Step 2: Check Your Backend Console

When you try to import subjects, check your backend server console. You should see:

```
📥 Starting bulk import of X subjects...
  Creating subject: CODE - Name
  ✅ Created: CODE
```

If you see errors instead, note them down.

## Step 3: Common Issues & Solutions

### Issue 1: "Firebase is not initialized"

**Solution:**
1. Make sure you have `backend/.env` file
2. Add Firebase configuration (see `backend/QUICK_FIREBASE_SETUP.md`)
3. Restart your backend server

### Issue 2: "Cannot read properties of undefined"

**Solution:**
- Firebase Admin SDK is not set up
- Follow the setup guide: `backend/QUICK_FIREBASE_SETUP.md`

### Issue 3: "Subject code already exists"

**Solution:**
- The subject with that code already exists
- Either delete the existing subject or use a different code

### Issue 4: "Missing required fields"

**Solution:**
- Make sure each subject has:
  - `name` (required)
  - `code` (required)
  - `branch` (required) - must be one of the 7 branches
  - `semester` (required) - must be 1-6

### Issue 5: Subjects import but don't show up

**Solution:**
1. Check the branch filter in the admin panel
2. Make sure you're filtering by the correct branch
3. Refresh the page
4. Check Firebase Console to verify subjects were saved

## Step 4: Verify Subjects in Firebase

1. Go to: https://console.firebase.google.com/project/digidiploma-f106d/firestore
2. Look for the `subjects` collection
3. Check if your subjects are there

## Step 5: Test with a Single Subject

Try importing just one subject first to test:

```json
[
  {
    "name": "Test Subject",
    "code": "TEST101",
    "branch": "Computer Engineering",
    "semester": 1,
    "credits": 4,
    "hours": 60,
    "type": "Theory",
    "description": "Test description"
  }
]
```

If this works, the issue might be with your JSON format for multiple subjects.

## Step 6: Check JSON Format

Make sure your JSON is valid:

✅ **Correct:**
```json
[
  {
    "name": "Subject 1",
    "code": "SUB101",
    "branch": "Computer Engineering",
    "semester": 1
  },
  {
    "name": "Subject 2",
    "code": "SUB102",
    "branch": "Computer Engineering",
    "semester": 1
  }
]
```

❌ **Incorrect:**
- Missing commas between objects
- Missing quotes around keys
- Trailing commas
- Invalid branch names

## Still Not Working?

1. **Check backend console logs** - Look for error messages
2. **Run the diagnostic script**: `node backend/check-firebase-status.js`
3. **Verify Firebase setup**: Follow `backend/QUICK_FIREBASE_SETUP.md`
4. **Check network tab** in browser DevTools - Look at the API response

## Example: Complete Subject JSON

Here's a complete example for Computer Engineering, Semester 1:

```json
[
  {
    "name": "Applied Mathematics I",
    "code": "AM101",
    "branch": "Computer Engineering",
    "semester": 1,
    "credits": 4,
    "hours": 60,
    "type": "Theory",
    "description": "Basic mathematics concepts"
  },
  {
    "name": "Applied Physics I",
    "code": "AP101",
    "branch": "Computer Engineering",
    "semester": 1,
    "credits": 4,
    "hours": 60,
    "type": "Theory",
    "description": "Basic physics concepts"
  },
  {
    "name": "Programming in C",
    "code": "PC101",
    "branch": "Computer Engineering",
    "semester": 1,
    "credits": 3,
    "hours": 45,
    "type": "Practical",
    "description": "C programming fundamentals"
  }
]
```

## Need More Help?

1. Check the error message in the import dialog
2. Check backend console for detailed logs
3. Run `node backend/check-firebase-status.js` and share the output

