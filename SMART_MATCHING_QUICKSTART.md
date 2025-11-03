# 🚀 Smart Matching Quick Start Guide

Get the intelligent matching system running in **5 minutes**!

---

## 📋 Prerequisites

- Zero Waste platform installed and running
- Firebase project configured
- At least one donor account and one NGO account

---

## 🎯 Setup Steps

### Step 1: Configure NGO Profile

1. **Login as NGO/Recipient**
   - Navigate to your dashboard
   - Click **Profile** in the sidebar

2. **Go to Preferences Tab**
   - Click the **Preferences** button in the section navigation

3. **Fill in Smart Matching Preferences**
   
   ```
   Food Preference: [Veg / Non-Veg / Both]
   └─ Choose what food types your NGO accepts
   
   Capacity (Meals/Day): [Number]
   └─ Example: 100 (how many meals you can serve per day)
   
   Preparation Capability: [Raw / Cooked / Both]
   └─ Choose: "Both" if you can cook raw food
   └─ Choose: "Cooked Only" if you need ready-to-serve food
   
   Latitude: [Number]
   └─ Example: 12.9716 (Bangalore)
   └─ Your NGO's GPS latitude
   
   Longitude: [Number]
   └─ Example: 77.5946 (Bangalore)
   └─ Your NGO's GPS longitude
   ```

4. **Get Your GPS Coordinates**
   
   **Option A: Google Maps (Recommended)**
   - Open [Google Maps](https://maps.google.com)
   - Right-click your NGO location
   - Click "Copy coordinates"
   - Paste into Latitude/Longitude fields
   
   **Option B: Use Your Current Location**
   - Use browser's location API
   - Or use a GPS coordinates app on your phone

5. **Save Settings**
   - Click **Save Matching Prefs**
   - You should see a success toast notification

---

### Step 2: Create Test Donations (Donor Side)

1. **Login as Donor**
   - Navigate to **Food Management**

2. **Add a Test Donation**
   
   Click **Add Donation** and fill in:
   
   ```
   Food Name: Rice and Dal
   Food Type: Veg
   Preparation: Cooked
   Quantity (meals): 50
   Expiry Date: [Today's date]
   Pickup Location: 123 Main St, Bangalore
   ```

3. **Create Multiple Donations for Testing**
   
   **Test Case 1: Perfect Match**
   ```
   Name: Vegetable Curry (Veg)
   Type: Veg
   Preparation: Cooked
   Quantity: 40 meals
   Expiry: Today (4 hours from now)
   Location: Near NGO
   ```
   
   **Test Case 2: Urgency Test**
   ```
   Name: Bread Rolls (Veg)
   Type: Veg
   Preparation: Packaged
   Quantity: 30 meals
   Expiry: Today (1 hour from now) ⚠️ URGENT
   Location: Moderate distance
   ```
   
   **Test Case 3: Mismatch Test**
   ```
   Name: Chicken Biryani (Non-Veg)
   Type: Non-Veg
   Preparation: Cooked
   Quantity: 100 meals
   Expiry: Tomorrow
   Location: Far from NGO
   ```

---

### Step 3: View Smart-Sorted Results (NGO Side)

1. **Login as NGO**
   - Navigate to **Dashboard**

2. **Check the Food Listings**
   
   You should now see:
   
   ✅ **Donations sorted automatically** by match score (highest first)
   
   ✅ **Match Score Badges:**
   - 🎯 **92%** Excellent Match (green)
   - ⭐ **75%** Great Match (blue)
   - ✓ **60%** Good Match (cyan)
   - ○ **45%** Fair Match (amber)
   
   ✅ **Distance Indicators:**
   - "1.2km away"
   - "5.0km away"
   
   ✅ **Urgency Alerts:**
   - ⚡ **Urgent: 1h** (red badge for items expiring soon)

3. **Claim the Best Match**
   - Click **Request** on the top donation
   - Wait for donor approval
   - Once approved, you'll receive pickup details

---

## 🧪 Testing Scenarios

### Scenario 1: Distance Priority

**Setup:**
- NGO location: `12.9716, 77.5946`
- Create 2 identical donations, but different locations:
  - Donation A: `12.9720, 77.5950` (very close)
  - Donation B: `13.0500, 77.7000` (far)

**Expected Result:**
- Donation A should rank higher (better distance score)

---

### Scenario 2: Veg/Non-Veg Filter

**Setup:**
- NGO preference: **Veg Only**
- Create donations:
  - Donation A: Veg
  - Donation B: Non-Veg

**Expected Result:**
- Veg donation ranks first
- Non-Veg donation scores very low (or hidden if strict filter applied)

---

### Scenario 3: Urgency Priority

**Setup:**
- Create 3 donations:
  - Donation A: Expires in 1 hour (critical)
  - Donation B: Expires in 6 hours (high)
  - Donation C: Expires in 2 days (low)

**Expected Result:**
- Donation A (1h) ranks highest
- Donation B (6h) ranks second
- Donation C (2d) ranks lowest

---

### Scenario 4: Capacity Matching

**Setup:**
- NGO capacity: **50 meals/day**
- Create donations:
  - Donation A: 30 meals (well within capacity)
  - Donation B: 50 meals (at capacity)
  - Donation C: 200 meals (way over)

**Expected Result:**
- Donation A scores best on capacity
- Donation C scores poorly (too large)

---

## 📊 Understanding Match Scores

### Example Breakdown

**Donation:** Rice & Dal (Veg, Cooked, 40 meals, expires in 3h, 2km away)

**NGO Profile:** Veg preference, 80 meals capacity, 12.9716/77.5946

**Score Calculation:**

| Factor | Points | Reason |
|--------|--------|--------|
| Veg/Non-Veg | 25/25 | ✓ Perfect match (both Veg) |
| Preparation | 15/15 | ✓ NGO accepts cooked |
| Expiry | 25/30 | ⚠️ 3h = high urgency |
| Capacity | 15/15 | ✓ 40 meals fits well in 80 capacity |
| Distance | 12/15 | ✓ 2km = close |
| **TOTAL** | **92/100** | 🎯 **Excellent Match** |

---

## 🎨 Visual Indicators Guide

### Match Quality Badges

```
🎯 85-100 | Excellent Match | Green background
⭐ 70-84  | Great Match     | Blue background
✓  55-69  | Good Match      | Cyan background
○  40-54  | Fair Match      | Amber background
·  0-39   | Low Match       | Gray background
```

### Row Highlighting

- **Green tint:** Excellent matches (85+)
- **Blue tint:** Great matches (70-84)
- **White:** Normal matches

### Distance Colors

- **Blue text:** Distance shown in km or meters
- **Red badge + ⚡:** Items expiring in < 6 hours

---

## 🔧 Troubleshooting

### Problem: All donations show 50-60 points (neutral scores)

**Cause:** NGO profile is incomplete

**Solution:**
1. Go to Profile → Preferences
2. Ensure all fields are filled:
   - Food Preference ✓
   - Capacity ✓
   - Preparation Capability ✓
   - Latitude & Longitude ✓

---

### Problem: Distance always shows "—"

**Cause:** Missing GPS coordinates

**Solution:**
1. **NGO side:** Add lat/lng in Profile → Preferences
2. **Donor side:** Coordinates are auto-added if you use location picker (coming soon), or manually add them to donations in Firestore

---

### Problem: Match scores not visible

**Cause:** You're logged in as Donor (not NGO)

**Solution:**
- Match scores only show for **NGO/Recipient** accounts
- Donors see standard listing view without scores

---

### Problem: Urgent items not prioritized

**Cause:** Expiry time not set correctly

**Solution:**
1. When creating donations, ensure **Expiry Date** is set
2. For urgent testing, set expiry to current date + a few hours
3. Check Firestore: `expiryTime` field should be a Firebase Timestamp

---

## 🎓 Advanced Tips

### Tip 1: Location Search (NGO)

Use the **Search by Location** input on NGO dashboard to filter by area:
```
Search: "Bangalore" → Shows only Bangalore donations
Search: "MG Road" → Shows only MG Road area
```

### Tip 2: Multiple NGO Profiles for Testing

Create different NGO profiles to see different match results:
- **NGO A:** Veg only, small capacity (30)
- **NGO B:** Both, large capacity (200)
- **NGO C:** Cooked only, moderate capacity (100)

### Tip 3: Monitor Score Changes

Change your NGO preferences and watch scores update in real-time:
1. Set preference to "Veg Only"
2. View dashboard → Note scores
3. Change to "Both"
4. Refresh → Scores increase for non-veg items

---

## ✅ Success Checklist

After setup, you should see:

- [ ] NGO profile has all 5 fields set (food pref, capacity, prep capability, lat, lng)
- [ ] At least 3 test donations created by donor
- [ ] NGO dashboard shows donations with match score badges
- [ ] Top donation has highest match score (85+)
- [ ] Distance indicators show "X.Xkm away"
- [ ] Urgent items (expiring soon) have ⚡ red badges
- [ ] Clicking "Request" on a donation works
- [ ] Sorting is automatic (no manual sort needed)

---

## 🎉 You're Ready!

The smart matching system is now active. NGOs will automatically see the most relevant donations first, helping reduce food waste and improve efficiency.

**Next Steps:**
- Add real donations with accurate GPS coordinates
- Configure NGO profiles for all recipient accounts
- Monitor the analytics to see the impact

**Need Help?**
- Read the full guide: `SMART_MATCHING_GUIDE.md`
- Check console logs for errors
- Verify Firestore security rules allow read/write access

---

**Happy Matching! 🌱**

