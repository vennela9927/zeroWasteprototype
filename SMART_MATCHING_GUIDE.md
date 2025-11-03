# 🎯 Smart Matching System - Complete Guide

## Overview

The Zero Waste platform features an **Intelligent Matching Algorithm** that automatically ranks donor food listings for NGOs based on compatibility, urgency, capacity, and proximity. When an NGO opens their dashboard, they see the most relevant donations first.

---

## 🧩 How It Works

### Scoring System

Each donation is scored **0-100 points** based on 5 key factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Veg/Non-Veg Compatibility** | 25 points | Matches NGO food preference with donation type |
| **Food Preparation Type** | 15 points | Matches preparation capability (raw/cooked/packaged) |
| **Expiry Urgency** | 30 points | Prioritizes food that will expire soon |
| **Capacity Match** | 15 points | Matches quantity with NGO's serving capacity |
| **Distance Proximity** | 15 points | Prioritizes donations closer to NGO location |

**Total: 100 points**

---

## 📊 Data Models

### Donation Entry (food_items collection)

```typescript
{
  donation_id: string;           // Unique ID (auto-generated)
  foodName: string;              // e.g., "Rice and Curry"
  foodType: string;              // "veg" | "non-veg" | "rice" | "bread" etc.
  quantity: number;              // Approx meals (e.g., 50)
  expiryTime: Timestamp;         // Firebase Timestamp
  preparedTime?: Timestamp;      // When food was made (optional)
  preparationType?: string;      // "raw" | "cooked" | "packaged"
  location: string;              // Pickup address
  latitude: number;              // GPS coordinate (donor location)
  longitude: number;             // GPS coordinate (donor location)
  status: string;                // "available" | "claimed" | "expired" etc.
  verified: boolean;             // Donor verification status
  donorId: string;               // User ID of donor
  donorName: string;             // Display name
  createdAt: Timestamp;          // Creation timestamp
}
```

### NGO Profile (users collection)

```typescript
{
  ngo_id: string;                    // User ID
  foodPreference: string;            // "veg" | "non-veg" | "both"
  capacity: number;                  // Meals NGO can handle per day (e.g., 100)
  preparationCapability: string;     // "raw" | "cooked" | "both"
  latitude: number;                  // GPS coordinate (NGO location)
  longitude: number;                 // GPS coordinate (NGO location)
  role: "recipient";                 // User role (must be recipient/NGO)
}
```

---

## 🎲 Scoring Algorithm Details

### 1. Veg/Non-Veg Compatibility (25 points)

```
IF NGO preference = "both":
  → 25 points (accepts everything)
ELSE IF donation foodType = "unknown":
  → 15 points (partial match for uncertainty)
ELSE IF NGO preference matches donation foodType:
  → 25 points (perfect match)
ELSE:
  → 0 points (mismatch, e.g., veg NGO + non-veg food)
```

**Example:**
- NGO prefers "veg" + Donation is "veg" → **25 points** ✓
- NGO prefers "veg" + Donation is "non-veg" → **0 points** ✗
- NGO prefers "both" → **25 points** always ✓

---

### 2. Food Preparation Compatibility (15 points)

```
IF NGO capability = "both" OR donation = "packaged":
  → 15 points (can handle anything / packaged is universal)
ELSE IF NGO capability matches donation preparation:
  → 15 points (perfect match)
ELSE:
  → 5 points (partial mismatch)
```

**Example:**
- NGO can handle "both" → **15 points** always ✓
- NGO only handles "cooked" + Donation is "cooked" → **15 points** ✓
- NGO only handles "cooked" + Donation is "raw" → **5 points** (partial)

---

### 3. Expiry Urgency (30 points)

The algorithm prioritizes donations that will expire soon to minimize food waste.

```
IF expiry ≤ 2 hours:
  → 30 points (critical urgency) 🔥
ELSE IF expiry ≤ 6 hours:
  → 25 points (high urgency) ⚠️
ELSE IF expiry ≤ 12 hours:
  → 20 points (medium urgency)
ELSE IF expiry ≤ 24 hours:
  → 15 points (low urgency)
ELSE:
  → 10 points (very low urgency)
```

**Example:**
- Food expires in 1 hour → **30 points** ✓ (top priority)
- Food expires in 5 hours → **25 points** ✓
- Food expires in 2 days → **10 points**

---

### 4. NGO Capacity Match (15 points)

Matches donation quantity with NGO's daily serving capacity.

```
IF quantity = unknown/0:
  → 10 points (neutral for missing data)
ELSE IF quantity ≤ 50% of NGO capacity:
  → 15 points (well within capacity) ✓
ELSE IF quantity ≤ 100% of NGO capacity:
  → 12 points (at capacity)
ELSE IF quantity ≤ 150% of NGO capacity:
  → 8 points (slightly over)
ELSE:
  → 5 points (way over capacity)
```

**Example:**
- NGO capacity: 100 meals
- Donation: 40 meals → **15 points** ✓ (ideal size)
- Donation: 90 meals → **12 points** ✓
- Donation: 200 meals → **5 points** (too large)

---

### 5. Distance Proximity (15 points)

Uses Haversine formula to calculate distance between donor and NGO GPS coordinates.

```
IF distance ≤ 1 km:
  → 15 points (very close) 🎯
ELSE IF distance ≤ 5 km:
  → 12 points (close)
ELSE IF distance ≤ 10 km:
  → 9 points (moderate)
ELSE IF distance ≤ 20 km:
  → 6 points (far)
ELSE:
  → 3 points (very far)
```

**If coordinates are missing:**
  → 10 points (neutral score)

**Example:**
- Donor is 0.8 km away → **15 points** ✓
- Donor is 4 km away → **12 points** ✓
- Donor is 25 km away → **3 points**

---

## 🎨 Visual Indicators

### Match Quality Badges

Based on total score, donations are labeled:

| Score Range | Label | Color | Emoji |
|-------------|-------|-------|-------|
| 85-100 | Excellent Match | Green | 🎯 |
| 70-84 | Great Match | Blue | ⭐ |
| 55-69 | Good Match | Cyan | ✓ |
| 40-54 | Fair Match | Amber | ○ |
| 0-39 | Low Match | Slate | · |

### Dashboard Features

- **🎯 Match Score Badge**: Shows percentage and quality emoji
- **📍 Distance Indicator**: "1.2km away"
- **⚡ Urgency Alert**: Red badge for items expiring in <6 hours
- **📊 Score Breakdown**: Tooltip showing point breakdown (optional)

---

## 🔧 Configuration (NGO Profile Settings)

### Step 1: Login as NGO
Navigate to **Profile → Preferences**

### Step 2: Configure Smart Matching Preferences

Fill in the following fields:

1. **Food Preference**
   - Options: `Veg Only`, `Non-Veg Only`, `Both (All Food Types)`
   - Default: `Both`

2. **Capacity (Meals/Day)**
   - Number input
   - Example: `100` (how many meals your NGO can handle per day)

3. **Preparation Capability**
   - Options: `Raw Food (Can Cook)`, `Cooked Food Only`, `Both Raw & Cooked`
   - Default: `Both`

4. **Latitude & Longitude**
   - Your NGO's GPS coordinates
   - Example: Latitude: `12.9716`, Longitude: `77.5946` (Bangalore)
   - **Tip**: Use Google Maps → Right-click location → Copy coordinates

### Step 3: Save Settings

Click **Save Matching Prefs**. The system will immediately re-sort your dashboard.

---

## 💡 Usage Examples

### Example 1: Veg NGO in Urban Area

**NGO Profile:**
- Food Preference: `Veg`
- Capacity: `80 meals/day`
- Preparation: `Both`
- Location: `12.9716, 77.5946` (Bangalore)

**Donation A:**
- Food: `Rice and Dal` (Veg)
- Quantity: `50 meals`
- Expiry: `3 hours`
- Preparation: `Cooked`
- Distance: `2 km`

**Score Breakdown:**
- Veg match: **25** (perfect)
- Preparation: **15** (NGO accepts both)
- Expiry: **25** (3h = high urgency)
- Capacity: **15** (50 meals fits well within 80)
- Distance: **12** (2km = close)
- **Total: 92/100** → **🎯 Excellent Match**

---

### Example 2: Small NGO with Limited Capacity

**NGO Profile:**
- Food Preference: `Both`
- Capacity: `30 meals/day`
- Preparation: `Cooked Only`
- Location: `12.9500, 77.6000`

**Donation B:**
- Food: `Chicken Biryani` (Non-Veg)
- Quantity: `100 meals`
- Expiry: `8 hours`
- Preparation: `Cooked`
- Distance: `15 km`

**Score Breakdown:**
- Veg match: **25** (NGO accepts both)
- Preparation: **15** (cooked matches)
- Expiry: **20** (8h = medium urgency)
- Capacity: **5** (100 meals >> 30 capacity, way over)
- Distance: **6** (15km = far)
- **Total: 71/100** → **⭐ Great Match** (but capacity concern)

---

## 📱 Frontend Implementation

### Key Files

1. **`frontend/src/utils/smartMatching.ts`**
   - Core algorithm implementation
   - `sortListingsByRelevance()` function
   - Distance calculation (Haversine)
   - Score breakdown utilities

2. **`frontend/src/pages/Dashboard.tsx`**
   - Lines 49-63: Auto-sorting for NGO view
   - Uses `useMemo` to recalculate when listings or profile change

3. **`frontend/src/components/FoodListingsTable.tsx`**
   - Displays match scores and badges
   - Shows distance and urgency indicators
   - Color-coded rows for high matches

4. **`frontend/src/components/ProfileSettings.tsx`**
   - NGO matching preference configuration UI
   - "Smart Matching Preferences (NGO)" section

---

## 🚀 Testing the System

### Test Scenario 1: High Match

1. Create NGO account with:
   - Food Preference: `Veg`
   - Capacity: `100`
   - Location: `12.9716, 77.5946`

2. Create donor account and add donation:
   - Food: `Vegetable Curry` (Veg)
   - Quantity: `60 meals`
   - Expiry: `4 hours from now`
   - Location near NGO: `12.9720, 77.5950`

3. Login as NGO → Dashboard
   - Should see donation at the top
   - Match score: **~90+**
   - Green "Excellent Match" badge

### Test Scenario 2: Low Match

1. Use same NGO (Veg preference)

2. Create donation:
   - Food: `Chicken Curry` (Non-Veg)
   - Quantity: `30 meals`
   - Expiry: `48 hours`
   - Location far: `13.0500, 77.7000`

3. Login as NGO → Dashboard
   - Should appear lower in list
   - Match score: **~20-30**
   - Gray "Low Match" badge

---

## 🔍 Troubleshooting

### Problem: All donations show same score

**Solution:**
- Check NGO profile has all fields set (food preference, capacity, lat/lng)
- Verify donations have `foodType`, `expiryTime`, `latitude`, `longitude` fields

### Problem: Match scores not showing

**Solution:**
- Ensure you're logged in as **NGO/Recipient** (donors don't see match scores)
- Check browser console for errors
- Verify `profile.role === 'recipient'`

### Problem: Distance shows as "—"

**Solution:**
- Both NGO and donation must have valid `latitude` and `longitude` fields
- Coordinates must be numbers (not strings)
- Check values are realistic (e.g., -90 to 90 for lat, -180 to 180 for lng)

---

## 🎓 Advanced Features

### 1. Add Prepared Time Field (Optional)

If you want to track when food was prepared (not just expiry), add to donation form:

```typescript
// In DonorFoodManagement component (Dashboard.tsx)
<input name="preparedTime" type="datetime-local" />

// In addListing payload
preparedTime: fd.get('preparedTime') ? Timestamp.fromDate(new Date(fd.get('preparedTime'))) : undefined
```

Then update matching algorithm to consider food age:
```typescript
const ageHours = (Date.now() - preparedTime.toMillis()) / 3600000;
// Prefer fresher food: deduct points if >6h old
```

### 2. Multi-Criteria Filtering

Add filters in NGO dashboard:
```typescript
// Filter by match score threshold
const topMatches = listings.filter(l => l._matchScore >= 70);

// Filter by max distance
const nearbyListings = listings.filter(l => (l._distanceKm || 999) <= 10);
```

### 3. Real-Time Match Notifications

When new high-match donation is posted:
```typescript
// In Cloud Function trigger
if (matchScore >= 85) {
  sendNotificationToNGO(ngoId, donationId);
}
```

---

## 📈 Performance Considerations

- **Sorting Complexity**: O(n log n) for n donations
- **Memoization**: Results cached with `useMemo` (re-calculates only on data/profile change)
- **Index Requirements**: Firestore indexes on `status` and `expiryTime` for efficient queries
- **Scale**: System handles 1000+ donations efficiently

---

## 🎉 Summary

The Smart Matching System provides:

✅ **Automatic prioritization** of donations for NGOs  
✅ **Multi-factor scoring** (veg/non-veg, urgency, distance, capacity, preparation)  
✅ **Visual indicators** (badges, distances, urgency alerts)  
✅ **Configurable preferences** (NGO profile settings)  
✅ **Real-time updates** (Firebase real-time listeners)  
✅ **Zero manual sorting** required

**Result:** NGOs always see the most relevant donations first, reducing food waste and improving efficiency! 🌱

---

## 📞 Support

For questions or issues:
- Check browser console for errors
- Verify Firestore security rules allow read/write
- Ensure all profile fields are set correctly
- Contact development team with specific error messages

---

**Version:** 1.0  
**Last Updated:** October 2025

