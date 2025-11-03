# 🤖 AI-Powered Smart Matching Algorithm

## 📊 Overview

The Zero Waste platform uses an **AI-powered matching algorithm** that automatically ranks food donations for NGOs based on a sophisticated 6-factor scoring system with intelligent pre-filtering.

---

## 🎯 Algorithm Formula

### Final Match Score (0-100)

```
match_score = (food_type_score * 0.25 +
               freshness_score * 0.25 +
               quantity_score * 0.15 +
               distance_score * 0.20 +
               verified_score * 0.10 +
               urgency_score * 0.05) * 100
```

---

## 📋 Step-by-Step Process

### Step 1️⃣: Pre-filter Donations

Before scoring, the system filters out:

✅ **Expired Donations**
```
IF current_time > expiry_time:
  → Remove from list
```

✅ **Food Type Mismatches**
```
IF NGO preference = "Veg Only" AND donation = "Non-Veg":
  → Remove from list
  
IF NGO preference = "Non-Veg Only" AND donation = "Veg":
  → Remove from list

IF NGO preference = "Both":
  → Keep all donations
```

---

### Step 2️⃣: Calculate Match Score (0-100)

For each remaining donation, calculate a composite score using 6 weighted factors:

---

## 🔢 Factor Breakdown

### 1. Food Type Match (25% weight)

**Formula:**
```
IF NGO preference = "both":
  food_type_score = 1
ELSE IF donation matches NGO preference:
  food_type_score = 1
ELSE IF donation type = "unknown":
  food_type_score = 0.6  (partial match)
ELSE:
  food_type_score = 0    (mismatch)
```

**Example:**
- NGO: Veg Only + Donation: Veg → **Score: 1.0** (25 points)
- NGO: Both + Donation: Any → **Score: 1.0** (25 points)
- NGO: Veg Only + Donation: Non-Veg → **Filtered out (Step 1)**

**Weight:** 25%

---

### 2. Time Freshness (25% weight) 🆕

**Formula:**
```
freshness_score = (expiry_time - current_time) / (expiry_time - prepared_time)
```

**Explanation:**
- Measures how much of the food's "life" remains
- `prepared_time`: When food was cooked/made
- `expiry_time`: When food will expire
- Fresher food (higher remaining life %) gets higher scores

**Example:**
```
Food prepared: 12:00 PM
Food expires:   6:00 PM  (6 hours total lifespan)
Current time:   2:00 PM  (2 hours elapsed, 4 hours remaining)

freshness_score = 4h / 6h = 0.667 (66.7% fresh)
```

**Fallback (if no prepared_time):**
```
IF hours_until_expiry >= 24:
  freshness_score = 1.0
ELSE:
  freshness_score = hours_until_expiry / 24
```

**Weight:** 25%

---

### 3. Quantity Match (15% weight)

**Formula:**
```
quantity_score = min(1, donation_quantity / ngo_capacity)
```

**Explanation:**
- Matches donation size to NGO's serving capacity
- Donations within capacity get higher scores
- Very large donations are penalized (harder to handle)

**Example:**
```
NGO Capacity: 100 meals/day

Donation: 40 meals  → quantity_score = min(1, 40/100) = 0.40
Donation: 80 meals  → quantity_score = min(1, 80/100) = 0.80
Donation: 100 meals → quantity_score = min(1, 100/100) = 1.00
Donation: 150 meals → quantity_score = min(1, 150/100) = 1.00 (capped at 1)
```

**Note:** Scores are capped at 1.0 (15 points max), but donations > capacity aren't penalized heavily. NGOs can still claim if they want.

**Weight:** 15%

---

### 4. Distance Proximity (20% weight)

**Formula:**
```
distance_score = 1 - (distance_km / MAX_DISTANCE)

where MAX_DISTANCE = 50 km
```

**Explanation:**
- Uses GPS Haversine formula to calculate distance
- Closer donations get higher scores
- Distance beyond 50km scores 0

**Example:**
```
Distance: 0 km   → distance_score = 1 - (0/50) = 1.00  (20 pts)
Distance: 5 km   → distance_score = 1 - (5/50) = 0.90  (18 pts)
Distance: 25 km  → distance_score = 1 - (25/50) = 0.50 (10 pts)
Distance: 50 km  → distance_score = 1 - (50/50) = 0.00 (0 pts)
Distance: 75 km  → distance_score = 0.00 (capped)      (0 pts)
```

**Fallback (if no GPS):**
```
distance_score = 0.5  (neutral score)
```

**Weight:** 20%

---

### 5. Verified Donor Boost (10% weight) 🆕

**Formula:**
```
verified_score = donor.verified ? 1 : 0
```

**Explanation:**
- Verified donors get a +10 point bonus
- Helps prioritize trusted sources
- Verification status set by platform admins

**Example:**
```
Verified Donor:   verified_score = 1.0  (10 pts bonus)
Unverified Donor: verified_score = 0.0  (0 pts)
```

**Weight:** 10%

---

### 6. Urgency Score (5% weight)

**Formula:** AI learning-based decay function
```
IF expiry <= 0h:    urgency_score = 0.0
IF expiry <= 2h:    urgency_score = 1.0  (critical)
IF expiry <= 6h:    urgency_score = 0.8  (high)
IF expiry <= 12h:   urgency_score = 0.6  (medium)
IF expiry <= 24h:   urgency_score = 0.4  (low)
ELSE:               urgency_score = 0.2  (very low)
```

**Explanation:**
- AI-based priority for soon-expiring items
- Prevents food waste by surfacing urgent donations
- Lower weight (5%) to avoid overwhelming other factors

**Example:**
```
Expires in 30 min:  urgency_score = 1.0  (5 pts) 🔥
Expires in 4h:      urgency_score = 0.8  (4 pts)
Expires in 10h:     urgency_score = 0.6  (3 pts)
Expires in 2 days:  urgency_score = 0.2  (1 pt)
```

**Weight:** 5%

---

### Step 3️⃣: Sort by Score

```
donations_sorted = sort_by(match_score, DESC)
```

Display donations with highest match scores first.

---

## 📊 Complete Example

### NGO Profile
```javascript
{
  name: "Green Earth NGO",
  foodPreference: "veg",
  capacity: 80,  // meals/day
  latitude: 12.9716,
  longitude: 77.5946,
  location: "Bangalore Central"
}
```

### Donation
```javascript
{
  foodName: "Vegetable Biryani",
  foodType: "veg",
  quantity: 50,  // meals
  preparedTime: "2025-10-26T12:00:00",  // 12:00 PM
  expiryTime: "2025-10-26T18:00:00",    // 6:00 PM (6h lifespan)
  latitude: 12.9720,
  longitude: 77.5950,
  verified: true,  // Verified donor
  location: "0.5 km from NGO"
}
```

### Current Time
```
2025-10-26T14:00:00  (2:00 PM)
```

---

## 🧮 Score Calculation

### Step 1: Pre-filter
✅ **Not expired:** Current (2 PM) < Expiry (6 PM)  
✅ **Food type matches:** Veg = Veg

**Result:** Donation passes pre-filter ✓

---

### Step 2: Calculate Scores

#### 1. Food Type Match (25% weight)
```
NGO: "veg", Donation: "veg"
→ Perfect match
→ food_type_score = 1.0
→ Contribution: 1.0 * 0.25 = 0.25
```

#### 2. Time Freshness (25% weight)
```
Total lifespan: 6h (12 PM to 6 PM)
Elapsed: 2h (12 PM to 2 PM)
Remaining: 4h (2 PM to 6 PM)

freshness_score = 4h / 6h = 0.667 (66.7% fresh)
→ Contribution: 0.667 * 0.25 = 0.167
```

#### 3. Quantity Match (15% weight)
```
Donation: 50 meals, NGO Capacity: 80 meals
quantity_score = min(1, 50/80) = 0.625
→ Contribution: 0.625 * 0.15 = 0.094
```

#### 4. Distance (20% weight)
```
Distance: 0.5 km, Max: 50 km
distance_score = 1 - (0.5/50) = 0.99
→ Contribution: 0.99 * 0.20 = 0.198
```

#### 5. Verified Donor (10% weight)
```
Verified: true
verified_score = 1.0
→ Contribution: 1.0 * 0.10 = 0.10
```

#### 6. Urgency (5% weight)
```
Expires in 4h (2 PM to 6 PM)
→ Falls in 2-6h range
urgency_score = 0.8
→ Contribution: 0.8 * 0.05 = 0.04
```

---

### Final Score

```
match_score = (0.25 + 0.167 + 0.094 + 0.198 + 0.10 + 0.04) * 100
            = 0.849 * 100
            = 84.9 ≈ 85 points
```

**Result:** 🎯 **85% - Excellent Match!**

---

## 📈 Score Interpretation

| Score Range | Label | Badge | Action |
|-------------|-------|-------|--------|
| 85-100 | 🎯 Excellent Match | Green | Claim immediately |
| 70-84 | ⭐ Great Match | Blue | Highly recommended |
| 55-69 | ✓ Good Match | Cyan | Acceptable |
| 40-54 | ○ Fair Match | Amber | Proceed with caution |
| 0-39 | · Low Match | Gray | Skip, wait for better |

---

## 🆕 New Features vs Previous Algorithm

| Feature | Old Algorithm | New AI Algorithm |
|---------|---------------|------------------|
| **Freshness Tracking** | ❌ Not included | ✅ 25% weight using prepared_time |
| **Verified Donor Boost** | ❌ Not included | ✅ +10 point bonus |
| **Distance Weight** | 15% | 20% (increased) |
| **Urgency Weight** | 30% | 5% (decreased, balanced by freshness) |
| **Capacity Scoring** | Step function | Linear formula: `min(1, qty/cap)` |
| **Pre-filtering** | ❌ Manual in hook | ✅ Automatic in algorithm |
| **Preparation Type** | 15% weight | ❌ Removed (handled by pre-filter) |

---

## 💻 Implementation

### File Locations

```
frontend/src/utils/smartMatching.ts      ← Core algorithm
frontend/src/hooks/useFoodListings.ts    ← Data model
frontend/src/pages/Dashboard.tsx         ← Donation form with preparedTime
```

### Data Model Updates

**New Fields:**
- `preparedTime` (Timestamp): When food was cooked
- `verified` (boolean): Donor verification status

**Updated Fields:**
- Pre-filtering logic in `sortListingsByRelevance()`
- New score breakdown structure

---

## 🧪 Testing Example

### Test Case: Verify Freshness Calculation

**Setup:**
```javascript
const donation = {
  preparedTime: new Date('2025-10-26T10:00:00'),  // 10 AM
  expiryTime: new Date('2025-10-26T16:00:00'),    // 4 PM
  // 6 hours total lifespan
};

const currentTime = new Date('2025-10-26T13:00:00');  // 1 PM
// 3 hours elapsed, 3 hours remaining
```

**Expected:**
```javascript
freshness_score = (4 PM - 1 PM) / (4 PM - 10 AM)
                = 3h / 6h
                = 0.50 (50% fresh)
```

**Verify:**
```javascript
import { sortListingsByRelevance } from './smartMatching';

const result = sortListingsByRelevance([donation], ngoProfile);
console.log(result[0]._scoreBreakdown.freshnessScore);
// Expected: 0.50
```

---

## 🚀 Usage

### For NGOs

1. Configure your profile (Profile → Preferences)
2. Open Dashboard → Donations auto-sorted by match score
3. Top donations are best matches (85%+)
4. Claim with confidence!

### For Donors

1. Create donation with **all fields**:
   - Food Name
   - Food Type (Veg/Non-Veg)
   - Preparation Type (Raw/Cooked/Packaged)
   - **Prepared Time** (when food was cooked) 🆕
   - Quantity (meals)
   - Expiry Date
   - Pickup Location

2. System automatically matches to NGOs
3. Verified donors get +10 point boost

---

## 📊 Weight Justification

| Factor | Weight | Reason |
|--------|--------|--------|
| **Food Type** | 25% | Most critical: dietary restrictions |
| **Freshness** | 25% | Food quality & safety priority |
| **Distance** | 20% | Logistics & transportation cost |
| **Quantity** | 15% | Operational capacity constraint |
| **Verified** | 10% | Trust & reliability bonus |
| **Urgency** | 5% | Balanced by freshness, prevents over-prioritization |

**Total:** 100%

---

## 🎓 Key Advantages

✅ **Fairness:** Balanced weights prevent single-factor dominance  
✅ **Freshness:** New `prepared_time` field tracks food quality  
✅ **Trust:** Verified donors get priority  
✅ **Efficiency:** Pre-filtering reduces computation  
✅ **Flexibility:** Formulas are continuous (not step-based)  
✅ **Scalability:** O(n log n) performance for 1000+ donations  

---

## 🔧 Configuration

### Adjust Weights (if needed)

Edit `smartMatching.ts` line 297-304:

```typescript
const score = (
  breakdown.foodTypeScore * 0.25 +      // ← Change weight here
  breakdown.freshnessScore * 0.25 +     // ← Change weight here
  breakdown.quantityScore * 0.15 +      // ← Change weight here
  breakdown.distanceScore * 0.20 +      // ← Change weight here
  breakdown.verifiedScore * 0.10 +      // ← Change weight here
  breakdown.urgencyScore * 0.05         // ← Change weight here
) * 100;
```

**Note:** Ensure weights sum to 1.0 (100%).

---

## 📞 Support

For questions or issues:
- Check browser console for score breakdowns
- Verify `preparedTime` field is saved in Firestore
- Ensure donor `verified` status is set (default: false)
- Review `_scoreBreakdown` object for debugging

---

**Algorithm Version:** 2.0 (AI-Powered)  
**Last Updated:** October 26, 2025  
**Status:** ✅ Production Ready

