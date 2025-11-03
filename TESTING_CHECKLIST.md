# ✅ Testing Checklist - DonorPage & Donation Form

## Pre-Test Setup

1. **Start Development Server**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open Browser Console** (F12)
   - Watch for debug logs prefixed with `[DonorPage]` and `[DonationForm]`

3. **Clear Browser Cache** (if you made recent changes)
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

---

## 🔐 Authentication Flow

### Test 1: Login as Donor
- [ ] Go to `http://localhost:5173`
- [ ] Click "Sign In" or "Get Started"
- [ ] Select "Donor" role
- [ ] Login with existing donor credentials
- [ ] **Expected**: Redirects to `/donor` (new DonorPage)
- [ ] **Check Console**: Should see `[DonorPage] User:`, `[DonorPage] Profile:`, etc.

### Test 2: Login as NGO
- [ ] Logout and return to home
- [ ] Click "Sign In"
- [ ] Select "NGO" role
- [ ] Login with NGO credentials
- [ ] **Expected**: Redirects to `/dashboard` (old Dashboard)

---

## 📊 DonorPage - Dashboard Display

### Test 3: Dashboard Metrics
When logged in as donor on `/donor`:

- [ ] **Header** displays:
  - [ ] "ZeroWaste" logo
  - [ ] Navigation tabs: Home | My Donations | Rewards (or CSR if company) | Support
  - [ ] User name and email
  - [ ] Logout button

- [ ] **Dashboard Summary** shows:
  - [ ] Total Meals Donated (number)
  - [ ] Active Donations (number)
  - [ ] Reward Points (number for individuals) OR Completed (for companies)

- [ ] **Console Logs** show:
  ```
  [DonorPage] User: {...}
  [DonorPage] Profile: {...}
  [DonorPage] Listings: [...]
  [DonorPage] Claims: [...]
  ```

---

## 📋 Donation Form Testing

### Test 4: Form Display
- [ ] Navigate to "Home" tab on `/donor`
- [ ] **Donation Form** is visible below welcome message
- [ ] All fields are present:
  - [ ] Food Name (text input)
  - [ ] Food Type (dropdown with 🥗 Veg, 🍗 Non-Veg, 🍳 Cooked, 🥕 Raw, 📦 Packaged)
  - [ ] Quantity (number input)
  - [ ] Quantity Unit (dropdown: kg/meals)
  - [ ] Expiry Date (date picker)
  - [ ] Expiry Time (time picker)
  - [ ] Pickup Location (text input with autocomplete)
  - [ ] "Use My Location" button
  - [ ] Special Notes (textarea, optional)
  - [ ] Submit button

### Test 5: Form Validation
Try submitting empty form:
- [ ] **Expected**: Red error messages appear for required fields
- [ ] Errors show: "Food name is required", "Location is required", etc.

Try invalid data:
- [ ] Enter food name with 1 character → Error: "Food name must be at least 2 characters"
- [ ] Enter past expiry date/time → Error: "Expiry date/time must be in the future"
- [ ] Enter quantity 0 or negative → Error: "Quantity must be at least 0.1"

### Test 6: Location Features

#### GPS Location Detection
- [ ] Click "Use My Location" button
- [ ] **Expected**: Browser asks for location permission
- [ ] Grant permission
- [ ] **Expected**: 
  - Button shows "Detecting..." with spinner
  - After 2-5 seconds, location field auto-fills with address
  - Coordinates display below button (e.g., "Lat: 12.971599, Lng: 77.594566")
  - Toast notification: "Current location detected"
- [ ] **Console**: Check for geolocation logs

#### Google Places Autocomplete (if API key configured)
- [ ] Start typing an address in "Pickup Location" field
- [ ] **Expected**: Dropdown suggestions appear (e.g., "Bangalore, Karnataka, India")
- [ ] Select a suggestion
- [ ] **Expected**:
  - Location field fills with full address
  - Coordinates auto-captured
  - Toast: "Location selected successfully"

#### Manual Coordinate Input
- [ ] Click "Advanced: Enter coordinates manually"
- [ ] Enter latitude: `12.9716`
- [ ] Enter longitude: `77.5946`
- [ ] **Expected**: No errors, coordinates saved

### Test 7: Complete Form Submission

Fill out complete form:
```
Food Name: "Vegetable Biryani"
Food Type: 🥗 Vegetarian
Quantity: 50
Quantity Unit: meals
Expiry Date: Tomorrow's date
Expiry Time: 18:00
Pickup Location: [Use GPS or type manually]
Special Notes: "Requires cold storage"
```

- [ ] Click "Submit Donation"
- [ ] **Expected**:
  - Button shows "Submitting..." with spinner
  - After 1-2 seconds:
    - Toast notification: "Donation submitted successfully! 🎉"
    - Form resets (all fields cleared)
  - **Console logs**:
    ```
    [DonationForm] Submitting payload: {...}
    [DonationForm] Submission successful!
    [food_items] added listing id= abc123
    ```

### Test 8: Firebase Data Verification

After successful submission:

1. **Check Firebase Console**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Navigate to Firestore Database
   - Open `food_items` collection
   - **Expected**: New document with:
     ```
     {
       foodName: "Vegetable Biryani",
       foodType: "veg",
       quantity: 50,
       quantityUnit: "meals",
       expiryTime: Timestamp,
       location: "...",
       latitude: 12.9716,
       longitude: 77.5946,
       description: "Requires cold storage",
       donorId: "uid123...",
       donorName: "John Doe",
       status: "available",
       claimed: false,
       createdAt: Timestamp
     }
     ```

2. **Check DonorPage Updates**
   - Stay on `/donor` page
   - Navigate to "My Donations" tab
   - **Expected**: New donation appears in the list
   - **Dashboard Summary** updates:
     - Total Meals Donated increases by 50
     - Active Donations increases by 1

---

## 🎨 UI/UX Testing

### Test 9: Responsive Design

#### Desktop (1920x1080)
- [ ] Header spans full width
- [ ] Navigation is horizontal
- [ ] Form fields are properly sized
- [ ] Everything is readable

#### Tablet (768x1024)
- [ ] Header adjusts
- [ ] Mobile menu (hamburger) appears
- [ ] Form stacks properly

#### Mobile (375x667)
- [ ] Logo and hamburger menu visible
- [ ] Dashboard summary cards stack vertically
- [ ] Form is single column
- [ ] Buttons are touch-friendly
- [ ] Text is readable

### Test 10: Tab Navigation
- [ ] Click "Home" → Shows welcome + form
- [ ] Click "My Donations" → Shows donations list
- [ ] Click "Rewards" (or "CSR") → Shows rewards/certificates
- [ ] Click "Support" → Shows micro-donation options
- [ ] Active tab is highlighted (blue background)

---

## 🐛 Error Handling

### Test 11: Network Errors
- [ ] Disconnect internet
- [ ] Try to submit form
- [ ] **Expected**: Error toast with network message
- [ ] Reconnect internet
- [ ] Try again → Should work

### Test 12: Permission Errors
If Firestore rules are too restrictive:
- [ ] Try to submit form
- [ ] **Expected**: Error toast: "Permission denied while creating listing"
- [ ] **Console**: `permission-denied` error logged

### Test 13: Authentication State
- [ ] Logout while on `/donor`
- [ ] **Expected**: Redirected to `/` (home)
- [ ] Login again → Returns to `/donor`

---

## 📝 Console Log Checklist

When everything is working, you should see:

```
[firebase-config] {...}
[home] auth user change {hasUser: true}
[DonorPage] User: {uid: "...", ...}
[DonorPage] Profile: {uid: "...", name: "...", role: "donor", ...}
[DonorPage] Listings: [{id: "...", foodName: "...", ...}, ...]
[DonorPage] Claims: [{id: "...", ...}, ...]
[DonationForm] Auth state: {user: true, profile: true, userId: "..."}
[DonationForm] Submitting payload: {name: "...", quantity: 50, ...}
[DonationForm] Submission successful!
[food_items] added listing id= abc123xyz
```

---

## ✅ Success Criteria

All tests pass if:

1. ✅ Donor login redirects to `/donor`
2. ✅ Dashboard metrics display real data from Firebase
3. ✅ Form displays all fields correctly
4. ✅ Form validation works
5. ✅ GPS location detection works
6. ✅ Form submission saves to Firebase
7. ✅ New donation appears in dashboard
8. ✅ Mobile/tablet responsive
9. ✅ No console errors (warnings are OK)
10. ✅ Data persists after page refresh

---

## 🔧 Troubleshooting

### Issue: Form doesn't show
**Check**: Are you logged in as a donor? NGOs see old dashboard.

### Issue: "Use My Location" doesn't work
**Solutions**:
- Ensure HTTPS or localhost
- Check browser location permissions
- Try different browser

### Issue: Google autocomplete doesn't work
**Solutions**:
- Check `.env.local` has `VITE_GOOGLE_MAPS_API_KEY`
- Restart dev server after adding env vars
- Check Google Cloud Console API is enabled
- Use manual location input as fallback

### Issue: Form submission fails
**Check**:
- Console logs for specific error
- Firebase rules allow writes
- User is authenticated
- All required fields are filled

### Issue: Dashboard shows 0 for all metrics
**Causes**:
- No donations created yet (normal for new users)
- Firestore read permission issue
- Try creating a test donation

---

**Last Updated**: October 22, 2025  
**Test Coverage**: DonorPage + DonationFormEnhanced


