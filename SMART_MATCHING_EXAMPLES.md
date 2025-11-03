# 📊 Smart Matching Examples - Visual Walkthrough

Real-world examples showing how the intelligent matching algorithm scores donations.

---

## 🎯 Example 1: Perfect Match (Score: 95/100)

### NGO Profile
```
Name: Green Earth NGO
Food Preference: Veg Only
Capacity: 80 meals/day
Preparation Capability: Both (raw & cooked)
Location: 12.9716, 77.5946 (Bangalore Central)
```

### Donation
```
Food Name: Vegetable Biryani & Raita
Food Type: Veg
Preparation: Cooked
Quantity: 50 meals
Expiry: Today, 6:00 PM (2 hours from now)
Donor Location: 12.9720, 77.5950 (0.5 km away)
```

### Score Breakdown

| Criterion | Points | Max | Calculation |
|-----------|--------|-----|-------------|
| **Veg/Non-Veg Match** | 25 | 25 | ✅ Veg donation + Veg NGO = Perfect |
| **Preparation Match** | 15 | 15 | ✅ NGO accepts "both", donation is "cooked" |
| **Expiry Urgency** | 30 | 30 | 🔥 2 hours = Critical urgency |
| **Capacity Fit** | 15 | 15 | ✅ 50 meals fits well within 80 capacity |
| **Distance** | 10 | 15 | ✅ 0.5km = Very close (deducted 5 pts, would be 15 if <0.3km) |
| **TOTAL** | **95** | **100** | 🎯 **Excellent Match** |

### Why This Scores High
- ✅ Perfect dietary match (Veg)
- 🔥 High urgency (expires soon)
- 📍 Very close distance
- ⚖️ Ideal quantity for NGO capacity
- 🍴 NGO can handle cooked food

### Expected UI Display
```
┌─────────────────────────────────────────────────────┐
│ 🎯 95% EXCELLENT MATCH                              │
│                                                      │
│ Vegetable Biryani & Raita                          │
│ by Donor: Ananya's Kitchen                         │
│                                                      │
│ 📍 0.5km away  ⚡ Expires in 2h  🍽️ 50 meals       │
│                                                      │
│ [Request] ←──────────────────────────────────────  │
└─────────────────────────────────────────────────────┘
```

---

## ⚠️ Example 2: Good Match with Urgency (Score: 78/100)

### NGO Profile
```
Name: Community Kitchen
Food Preference: Both (Veg & Non-Veg)
Capacity: 150 meals/day
Preparation Capability: Cooked Only
Location: 12.9500, 77.6000 (Bangalore South)
```

### Donation
```
Food Name: Chicken Curry & Rice
Food Type: Non-Veg
Preparation: Cooked
Quantity: 100 meals
Expiry: Today, 8:00 PM (5 hours from now)
Donor Location: 12.9600, 77.6100 (3 km away)
```

### Score Breakdown

| Criterion | Points | Max | Calculation |
|-----------|--------|-----|-------------|
| **Veg/Non-Veg Match** | 25 | 25 | ✅ NGO accepts "both" |
| **Preparation Match** | 15 | 15 | ✅ Cooked donation + Cooked-only NGO = Perfect |
| **Expiry Urgency** | 25 | 30 | ⚠️ 5 hours = High urgency (not critical) |
| **Capacity Fit** | 12 | 15 | ⚠️ 100 meals within 150 capacity, but close to max |
| **Distance** | 1 | 15 | ⚠️ 3km = Close but not very close (9 pts on scale) |
| **TOTAL** | **78** | **100** | ⭐ **Great Match** |

### Why This Scores Lower Than Example 1
- ⚠️ Longer until expiry (5h vs 2h)
- ⚠️ Larger quantity (100 vs 50) closer to capacity limit
- ⚠️ Further distance (3km vs 0.5km)

But still a **Great Match** because:
- ✅ NGO accepts all food types
- ✅ Preparation type matches perfectly
- ⏰ Still reasonably urgent

### Expected UI Display
```
┌─────────────────────────────────────────────────────┐
│ ⭐ 78% GREAT MATCH                                  │
│                                                      │
│ Chicken Curry & Rice                               │
│ by Donor: Ravi's Restaurant                        │
│                                                      │
│ 📍 3.0km away  ⚡ Expires in 5h  🍽️ 100 meals      │
│                                                      │
│ [Request]                                           │
└─────────────────────────────────────────────────────┘
```

---

## 🟡 Example 3: Fair Match with Constraints (Score: 52/100)

### NGO Profile
```
Name: Small Hope Foundation
Food Preference: Veg Only
Capacity: 40 meals/day
Preparation Capability: Cooked Only
Location: 12.9200, 77.5800 (Bangalore West)
```

### Donation
```
Food Name: Raw Vegetables & Dal (Uncooked)
Food Type: Veg
Preparation: Raw
Quantity: 80 meals worth of ingredients
Expiry: Tomorrow (30 hours from now)
Donor Location: 12.9800, 77.6500 (15 km away)
```

### Score Breakdown

| Criterion | Points | Max | Calculation |
|-----------|--------|-----|-------------|
| **Veg/Non-Veg Match** | 25 | 25 | ✅ Veg donation + Veg NGO = Perfect |
| **Preparation Match** | 5 | 15 | ❌ Raw food + Cooked-only NGO = Mismatch! |
| **Expiry Urgency** | 10 | 30 | ⏳ 30 hours = Very low urgency |
| **Capacity Fit** | 6 | 15 | ❌ 80 meals >> 40 capacity = Way over |
| **Distance** | 6 | 15 | ❌ 15km = Far |
| **TOTAL** | **52** | **100** | ○ **Fair Match** |

### Why This Scores Low
- ❌ **Preparation mismatch** (Raw food, but NGO can't cook)
- ❌ **Quantity too large** (80 meals for 40 capacity NGO)
- ❌ **Far distance** (15km away)
- ❌ **Low urgency** (expires tomorrow)

But NOT Zero Because:
- ✅ Dietary preference matches (Veg)
- ✅ Food is still usable (not expired)

### Expected UI Display
```
┌─────────────────────────────────────────────────────┐
│ ○ 52% FAIR MATCH                                    │
│                                                      │
│ Raw Vegetables & Dal (Uncooked)                    │
│ by Donor: Wholesale Market                         │
│                                                      │
│ 📍 15.0km away  ⏳ Expires in 30h  🍽️ 80 meals     │
│                                                      │
│ [Request]                                           │
└─────────────────────────────────────────────────────┘
```

**Recommendation:** This NGO should probably skip this donation and wait for better matches.

---

## 🔴 Example 4: Poor Match (Score: 23/100)

### NGO Profile
```
Name: Pure Veg Shelter
Food Preference: Veg Only
Capacity: 60 meals/day
Preparation Capability: Cooked Only
Location: 12.9000, 77.5500 (Bangalore North)
```

### Donation
```
Food Name: Chicken Biryani
Food Type: Non-Veg
Preparation: Cooked
Quantity: 200 meals
Expiry: In 3 days
Donor Location: 13.0500, 77.7000 (25 km away)
```

### Score Breakdown

| Criterion | Points | Max | Calculation |
|-----------|--------|-----|-------------|
| **Veg/Non-Veg Match** | 0 | 25 | ❌❌ Non-Veg food + Veg-only NGO = **CRITICAL MISMATCH** |
| **Preparation Match** | 15 | 15 | ✅ Cooked donation + Cooked-only NGO |
| **Expiry Urgency** | 5 | 30 | ⏳ 72 hours = Very low urgency |
| **Capacity Fit** | 0 | 15 | ❌ 200 meals >>> 60 capacity = Extremely over |
| **Distance** | 3 | 15 | ❌ 25km = Very far |
| **TOTAL** | **23** | **100** | · **Low Match** |

### Why This Scores Very Low
- ❌❌ **DIETARY MISMATCH** (Non-Veg for Veg-only NGO) → 0 points!
- ❌ **Massive quantity** (3x over capacity)
- ❌ **Very far** (25km)
- ❌ **No urgency** (3 days until expiry)

Only Positive:
- ✅ Preparation type matches

### Expected UI Display
```
┌─────────────────────────────────────────────────────┐
│ · 23% LOW MATCH                                     │
│                                                      │
│ Chicken Biryani                                     │
│ by Donor: Large Catering Co.                       │
│                                                      │
│ ⚠️ NON-VEG (Your NGO prefers Veg)                  │
│ 📍 25.0km away  ⏳ Expires in 3d  🍽️ 200 meals     │
│                                                      │
│ [Request] ←─────── (Not Recommended)               │
└─────────────────────────────────────────────────────┘
```

**Recommendation:** This NGO should **skip** this donation entirely.

---

## 🔥 Example 5: Critical Urgency Override (Score: 88/100)

### NGO Profile
```
Name: City Rescue Mission
Food Preference: Both
Capacity: 100 meals/day
Preparation Capability: Both
Location: 12.9750, 77.5980 (Bangalore East)
```

### Donation
```
Food Name: Mixed Veg Curry
Food Type: Veg
Preparation: Cooked
Quantity: 70 meals
Expiry: Today, 4:30 PM (30 MINUTES from now) 🔥
Donor Location: 12.9800, 77.6000 (1.8 km away)
```

### Score Breakdown

| Criterion | Points | Max | Calculation |
|-----------|--------|-----|-------------|
| **Veg/Non-Veg Match** | 25 | 25 | ✅ NGO accepts both |
| **Preparation Match** | 15 | 15 | ✅ NGO accepts both |
| **Expiry Urgency** | 30 | 30 | 🔥🔥 **30 MINUTES = CRITICAL URGENCY!** |
| **Capacity Fit** | 15 | 15 | ✅ 70 meals fits well in 100 capacity |
| **Distance** | 3 | 15 | ✅ 1.8km = Close (12 pts on scale) |
| **TOTAL** | **88** | **100** | 🎯 **Excellent Match** |

### Why This Scores High Despite Being "Last Minute"
- 🔥🔥 **CRITICAL EXPIRY** = Maximum urgency points (30/30)
- ✅ All other factors align well
- ⏰ **Food will be wasted in 30 minutes if not claimed!**

### Expected UI Display
```
┌─────────────────────────────────────────────────────┐
│ 🎯 88% EXCELLENT MATCH                              │
│ 🚨🚨 URGENT: EXPIRES IN 30 MINUTES! 🚨🚨            │
│                                                      │
│ Mixed Veg Curry                                     │
│ by Donor: Office Cafeteria                         │
│                                                      │
│ 📍 1.8km away  ⚡⚡ 30min  🍽️ 70 meals             │
│                                                      │
│ [🚨 CLAIM NOW!] ←──────────── Flashing button      │
└─────────────────────────────────────────────────────┘
```

**Special Alert:** System may send push notification to NGO for urgent matches like this!

---

## 📈 Score Distribution Guide

### What Each Range Means

```
┌────────────────────────────────────────────────────┐
│ 85-100 │ 🎯 EXCELLENT | Claim immediately          │
│        │   Perfect or near-perfect match           │
│        │   All factors align well                  │
├────────────────────────────────────────────────────┤
│ 70-84  │ ⭐ GREAT     | Highly recommended         │
│        │   Very good match, minor trade-offs      │
│        │   Consider claiming                       │
├────────────────────────────────────────────────────┤
│ 55-69  │ ✓ GOOD      | Acceptable                 │
│        │   Decent match with some constraints     │
│        │   Claim if capacity allows                │
├────────────────────────────────────────────────────┤
│ 40-54  │ ○ FAIR      | Proceed with caution       │
│        │   Multiple constraints                    │
│        │   Only claim if desperate                 │
├────────────────────────────────────────────────────┤
│ 0-39   │ · LOW       | Not recommended            │
│        │   Poor match, skip this donation         │
│        │   Wait for better options                 │
└────────────────────────────────────────────────────┘
```

---

## 🎓 Key Insights from Examples

### Insight 1: Urgency Can Override Other Factors
Example 5 shows that even with moderate distance (1.8km), **critical expiry** (30 min) can push the score to "Excellent" range.

### Insight 2: Dietary Mismatch is Deal-Breaker
Example 4 shows Non-Veg food for Veg-only NGO scores **0 points** on the most important criterion (25% weight).

### Insight 3: Capacity Matters
Small NGOs (40 meals/day) get penalized for large donations (80+ meals) because they can't realistically handle them.

### Insight 4: Distance Has Diminishing Returns
- 0.5km vs 1.8km: Small difference in score
- 1.8km vs 15km: Large difference in score
- 15km vs 25km: Moderate difference in score

---

## 🛠️ Testing Your Configuration

Use these examples to test your setup:

### Test 1: Verify Veg/Non-Veg Matching
1. Create NGO with "Veg Only" preference
2. Create 1 Veg donation and 1 Non-Veg donation
3. Expected: Veg donation should score 25 pts higher

### Test 2: Verify Distance Calculation
1. Set NGO location: `12.9716, 77.5946`
2. Create donation at: `12.9720, 77.5950` (should be ~0.5km)
3. Expected: Distance shows "0.5km away" and scores 15/15

### Test 3: Verify Urgency Priority
1. Create 3 donations expiring in 1h, 6h, and 24h
2. Expected: 1h donation ranks first, 6h second, 24h last

### Test 4: Verify Capacity Matching
1. Set NGO capacity: 50 meals/day
2. Create donations: 20, 50, and 150 meals
3. Expected: 20-meal donation scores best on capacity

---

## 📞 Need More Help?

- Full Guide: `SMART_MATCHING_GUIDE.md`
- Quick Start: `SMART_MATCHING_QUICKSTART.md`
- Troubleshooting: Check browser console for errors

---

**Happy Testing! 🚀**

