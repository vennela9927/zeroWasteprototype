# 🔧 NGO Food Request Troubleshooting Guide

## ✅ Good News: Request Functionality Already Exists!

Your NGO portal **already has** the ability to request food donations. The "Request" button is implemented and working. Let's troubleshoot why you might not be seeing it or able to use it.

---

## 🎯 Common Issues & Solutions

### Issue #1: Not Seeing the "Request" Button

**Possible Causes:**
1. ❌ Logged in as a **Donor** instead of NGO
2. ❌ No **available** donations in the list
3. ❌ Donations have status other than "available"

**Solutions:**

#### Check Your Role:
```
1. Go to your dashboard
2. Look at the top navigation
3. Should say "NGO Dashboard" or show "recipient" role
```

**How to verify:**
- Open browser console (F12)
- Type: `localStorage.getItem('userRole')`
- Should show: `"recipient"`

#### Check if You're an NGO User:
1. Go to Firebase Console
2. Navigate to `Firestore Database`
3. Find `users` collection
4. Find your user document
5. Check `role` field = **"recipient"**

---

### Issue #2: No Donations Showing

**Possible Causes:**
1. ❌ No donors have added food yet
2. ❌ All donations are already claimed
3. ❌ Loading error

**Solutions:**

#### Add Test Donations (For Testing):
1. **Switch to Donor Account** (or create one)
2. Go to "Add Donation" 
3. Create a few test donations with status `"available"`
4. **Switch back to NGO account**
5. Refresh the page

#### Check Database:
1. Open Firebase Console → Firestore
2. Go to `food_items` collection
3. Look for items with:
   - ✅ `status: "available"`
   - ✅ `claimed: false`
   - ✅ `expiryTime` in the future

---

### Issue #3: Button is Grayed Out or Not Clickable

**Possible Causes:**
1. ❌ Donation status is not "available"
2. ❌ Already claimed by another NGO
3. ❌ JavaScript error

**Solutions:**

#### Check Console for Errors:
```javascript
// Press F12, go to Console tab
// Look for red error messages
// Common errors:
- "claimListing is not a function"
- "Permission denied"
- "Network request failed"
```

#### Check Firestore Rules:
Your Firestore rules should allow NGOs to create claims:
```javascript
// firestore.rules
match /claims/{claimId} {
  allow create: if request.auth != null && 
                   get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'recipient';
}
```

---

## 📍 Where to Find the Request Button

### Desktop View (Table):
```
┌─────────────────────────────────────────────────────┐
│ Food Item  | Match | Quantity | Expiry  | Action    │
├─────────────────────────────────────────────────────┤
│ Biryani    | 95%   | 50 meals | 5h left | [Request] │ ← HERE
│ Rice & Dal | 87%   | 30 meals | 8h left | [Request] │
└─────────────────────────────────────────────────────┘
```

### Mobile View (Cards):
```
┌────────────────────────────────┐
│ 🍱 Vegetable Biryani          │
│ by Marriott Hotel              │
│ 🎯 Match: 95% Excellent        │
│                                │
│ Quantity: 50 servings          │
│ Expiry: 5h 30m left ⚠️        │
│ Location: Mumbai, 2.3 km away  │
│                                │
│ ┌──────────────────────────┐  │
│ │      [REQUEST]           │  │ ← HERE
│ └──────────────────────────┘  │
└────────────────────────────────┘
```

---

## 🧪 Step-by-Step Testing

### Test 1: Verify You're Logged in as NGO

1. **Open Dashboard**: Go to `/dashboard`
2. **Check URL**: Should be at `/dashboard` (not `/donor`)
3. **Check Top Bar**: Should say your NGO name
4. **Check Stats**: Should show "Active Donations", "Impact This Week"

### Test 2: Check if Donations are Available

1. **Scroll to "Available Food Listings"** section
2. **Look for donation cards/table rows**
3. **Check status badges** - should say "available" (green)
4. **Look for blue "Request" button**

### Test 3: Click Request Button

1. **Click any "Request" button**
2. **Expected Result**: 
   - ✅ Toast notification: "Request sent to donor for approval"
   - ✅ Button changes or disappears
   - ✅ Status changes to "requested"

### Test 4: Verify Request in Database

1. **Go to Firebase Console**
2. **Check `claims` collection**
3. **Look for new document** with:
   ```json
   {
     "foodItemId": "...",
     "ngoId": "your-ngo-id",
     "status": "requested",
     "requestedAt": "timestamp"
   }
   ```

---

## 🐛 Common Error Messages

### Error: "claimListing is not a function"
**Fix**: Check that `useFoodListings` hook is imported correctly
```typescript
const { claimListing } = useFoodListings('ngo');
```

### Error: "Permission denied"
**Fix**: Update Firestore rules to allow NGO claims
```javascript
match /claims/{claimId} {
  allow create: if request.auth != null;
  allow read, update: if request.auth.uid == resource.data.ngoId || 
                         request.auth.uid == resource.data.donorId;
}
```

### Error: "Request sent but donor doesn't see it"
**Fix**: Check that donation status updates correctly
- Donation `status` should change to "requested"
- Claim document should be created in `claims` collection

---

## 🎬 Complete Flow Walkthrough

### As NGO User:

```
1. Login as NGO (role = "recipient")
   ↓
2. Go to Dashboard (/dashboard)
   ↓
3. See "Available Food Listings" section
   ↓
4. Browse donations (with AI match scores)
   ↓
5. Click "Request" button on desired donation
   ↓
6. See success toast: "Request sent to donor"
   ↓
7. Donation moves to "Recent Claims" section
   ↓
8. Wait for donor to approve
   ↓
9. Once approved, see map route to pickup location
   ↓
10. Mark as "Picked Up" → "Delivered"
```

---

## 🔍 Debug Checklist

Run through this checklist:

- [ ] I'm logged in as an NGO user (not donor)
- [ ] My user role in Firestore is "recipient"
- [ ] There are donations with status "available" in the database
- [ ] I can see the "Available Food Listings" section
- [ ] Donation cards/rows are visible
- [ ] I can see the blue "Request" button
- [ ] No errors in browser console (F12)
- [ ] Toast notifications are working
- [ ] Firebase rules allow creating claims

---

## 💡 Quick Fix: Force Test Request

If nothing works, try this manual test:

1. **Open Browser Console** (F12)
2. **Run this command:**
```javascript
// Manually trigger a request
fetch('/api/claims', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    foodItemId: 'test-donation-id',
    ngoId: 'your-ngo-id',
    status: 'requested'
  })
});
```

If this works, the issue is with the UI button, not the backend.

---

## 📸 Screenshots to Share

If you're still stuck, take screenshots of:

1. **Dashboard view** (full page)
2. **Available listings section**
3. **Browser console** (F12 → Console tab)
4. **Network tab** (F12 → Network, filter by "claims")
5. **Your user profile** (from Firebase Firestore)

---

## 🆘 Still Not Working?

### Share These Details:

1. **Current URL**: Where are you in the app?
2. **User Role**: What role shows in Firestore?
3. **Console Errors**: Any red errors in browser console?
4. **Available Donations**: How many donations show in the list?
5. **Button State**: Do you see the Request button at all?

---

## ✅ If It's Working:

Once you successfully request a donation:

1. ✅ You'll see toast: "Request sent to donor for approval"
2. ✅ Donation appears in "Recent Claims" section
3. ✅ Donor sees "🔔 REQUEST" badge on their dashboard
4. ✅ Donor can Accept/Reject in the modal
5. ✅ After approval, you see map route
6. ✅ You can update status to "Picked Up" → "Delivered"

---

## 🚀 Next Steps

1. **Verify your role** in Firebase Console
2. **Check available donations** exist
3. **Look for the Request button** in the listings
4. **Click and watch for toast notification**
5. **Report specific error** if something fails

The functionality is there - let's find out what's blocking it! 🔍

