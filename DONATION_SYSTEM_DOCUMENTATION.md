# 🍱 ZeroWaste Enhanced Donation System

## **Overview**
Complete donation form with AI matching, GPS location, and blockchain metadata for transparency.

---

## **✅ Implemented Features**

### **1. Enhanced Donation Form** (`frontend/src/components/EnhancedDonationForm.tsx`)

#### **Food Details**
- **Food Name**: Text input for item name (e.g., "Vegetable Biryani")
- **Food Type**: Dropdown with 13 categories (Rice, Bread, Vegetables, Fruits, Curry, Dal, Roti/Chapati, Biryani, Cooked Meals, Snacks, Dairy, Desserts, Other)
- **Quantity**: Number input with units dropdown (servings, kg, pieces, boxes, plates)
- **AI Surplus Warning**: Real-time analysis based on quantity + expiry time
  - **High Risk** (red): qty >50 & <12h expiry OR qty >100
  - **Medium** (yellow): qty >25 & <24h expiry
  - **Optimal** (green): Normal levels

#### **Expiry Time**
- **Date Picker**: Minimum today's date
- **Time Picker**: Hours:minutes
- **Hours to Expiry Calculation**: Auto-calculated for AI matching

#### **Location (GPS + Manual)**
- **Auto-Detect GPS Button**: 
  - Uses browser Geolocation API
  - High accuracy mode
  - Displays ±accuracy in meters
  - Reverse geocodes to address (if Google Maps API key present)
- **Manual Address Input**: Text field with Google Places Autocomplete (if API key set)
- **Latitude/Longitude**: Auto-filled (read-only display)

#### **Image Upload (AI Freshness Detection)**
- Upload food image (max 5MB)
- Preview displayed
- Ready for Python YOLOv8 microservice integration
- Placeholder for freshness analysis

#### **Blockchain Metadata**
Automatically attached to each donation:
```json
{
  "timestamp": "2025-01-21T12:00:00.000Z",
  "foodType": "Biryani",
  "quantity": 50,
  "unit": "servings",
  "expiryTimestamp": "2025-01-22T18:00:00.000Z"
  // Post-submission: donorId, listingId, matchedNGOs
}
```

---

### **2. AI Matching Engine** (`backend/functions/index.ts`)

#### **triggerAIMatching Cloud Function**

**Purpose**: Score and rank NGOs based on multiple factors when donation is submitted.

**Scoring Algorithm** (Total: 100 points)

| Factor | Max Points | Logic |
|--------|-----------|-------|
| **Location Proximity** | 40 | Haversine distance; <1km = 40pts, >20km = 0pts |
| **Expiry Urgency** | 30 | ≤2h = 30pts, ≤6h = 20pts, ≤24h = 10pts |
| **NGO Capacity** | 15 | Can handle quantity based on pickupRadiusKm |
| **Reliability** | 15 | Historical fulfillment rate (approved/fulfilled claims) |

**Process**:
1. Fetch all NGOs (role='recipient')
2. For each NGO:
   - Calculate location score (if coords available)
   - Assign expiry urgency score
   - Check capacity heuristic
   - Query claim history for reliability rate
3. Sort by total score (descending)
4. Return top 5 matches

**Response**:
```json
{
  "success": true,
  "matchedNGOs": [
    {
      "ngoId": "abc123",
      "ngoName": "Food Bank XYZ",
      "score": 87,
      "breakdown": {
        "locationScore": 38,
        "distanceKm": 1.2,
        "expiryScore": 30,
        "capacityScore": 15,
        "reliabilityScore": 14
      }
    }
  ],
  "totalNGOs": 12
}
```

**Future Enhancements** (TODO):
- Send push notifications/emails to top-matched NGOs
- Store match results in Firestore for analytics
- Integrate donor reliability score

---

### **3. Blockchain Metadata Structure**

Every donation and claim includes blockchain-ready metadata:

**Donation Metadata**:
```typescript
{
  blockchainMetadata: {
    timestamp: ISO8601_timestamp,
    donorId: string,
    foodType: string,
    quantity: number,
    unit: string,
    expiryTimestamp: ISO8601_timestamp,
    location: {
      address: string,
      latitude?: number,
      longitude?: number
    },
    listingId: string,  // After Firestore creation
    matchedNGOs?: Array<{ ngoId: string, score: number }>
  }
}
```

**Claim Metadata**:
```typescript
{
  blockchainMetadata: {
    claimTimestamp: ISO8601_timestamp,
    ngoId: string,
    donorId: string,
    listingId: string,
    foodType: string,
    quantity: number,
    status: 'requested' | 'approved' | 'fulfilled',
    approvedTimestamp?: ISO8601_timestamp,
    fulfilledTimestamp?: ISO8601_timestamp
  }
}
```

**Integration with Blockchain** (Next Phase):
- Store metadata hash on-chain (Ethereum/Polygon/Hyperledger)
- Generate QR codes for NGO verification
- Public transparency dashboard

---

## **Tech Stack**

### **Frontend**
- React + TypeScript
- React Hook Form + Zod validation
- Google Maps API (Places Autocomplete + Geocoding)
- Browser Geolocation API
- Framer Motion (animations)
- React Toastify (notifications)

### **Backend**
- Firebase Cloud Functions (Node.js 20)
- Firestore (database)
- Firebase Auth (JWT tokens)

### **AI/ML** (Planned Integration)
- **Python FastAPI Microservice** for:
  - YOLOv8 image freshness detection
  - TensorFlow demand forecasting
  - Advanced matching algorithms

---

## **Usage**

### **For Donors**

1. Navigate to Dashboard → Food Management → "Add Donation"
2. Fill form:
   - Enter food name, type, quantity
   - Set expiry date + time
   - Click "Auto-Detect GPS Location" OR enter address manually
   - (Optional) Upload food image
3. Submit → AI matching runs automatically
4. See toast notification with matched NGOs count
5. Wait for NGO requests → approve/reject in "Pending Requests"

### **For NGOs**

1. Dashboard shows available donations
2. Filter by location (text search)
3. Click "Maps" to see pickup location
4. Click "Claim" to request
5. Wait for donor approval
6. After approval: access pickup address + directions

---

## **API Endpoints**

### **triggerAIMatching**
```typescript
// Callable HTTPS Function
const functions = getFunctions();
const trigger = httpsCallable(functions, 'triggerAIMatching');

const result = await trigger({
  foodName: 'Biryani',
  foodType: 'Cooked Meals',
  quantity: 50,
  latitude: 28.6139,
  longitude: 77.2090,
  hoursToExpiry: 6
});

// Returns: { matchedNGOs: [...], totalNGOs: 12 }
```

---

## **Environment Variables**

```bash
# frontend/.env.local
VITE_GOOGLE_MAPS_API_KEY=YOUR_KEY  # For autocomplete + geocoding
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=zerowaste-677fd
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## **Next Steps (Future Enhancements)**

### **Map Picker** (Leaflet/Mapbox)
- Interactive map to drag pin for precise location
- Radius visualization for NGO coverage area

### **Python Microservice** (YOLOv8 Freshness)
```python
# fastapi_service/main.py
from fastapi import FastAPI, File
from yolov8 import detect_freshness

app = FastAPI()

@app.post("/analyze-freshness")
async def analyze(image: bytes = File(...)):
    result = detect_freshness(image)
    return {
        "freshness_score": result.score,
        "confidence": result.confidence,
        "recommendation": "Safe to donate" if result.score > 0.7 else "Discard"
    }
```

### **Blockchain Integration**
- Smart contract on Polygon for metadata storage
- IPFS for image storage
- Public transparency page at `/transparency/:donationId`

### **Notifications**
- Firebase Cloud Messaging (push notifications)
- Email via SendGrid/AWS SES
- SMS via Twilio for urgent matches

---

## **Deployment**

```bash
# Build frontend
cd frontend
npm run build

# Build backend functions
cd ../backend/functions
npm run build

# Deploy
cd ../..
firebase use zerowaste-677fd
firebase deploy --only "hosting,functions,firestore:rules"
```

---

## **Testing**

### **Test GPS Location**
1. Open app in HTTPS context (localhost or deployed)
2. Allow browser location permission
3. Click "Auto-Detect GPS Location"
4. Verify accuracy and address populated

### **Test AI Matching**
1. Create donor account
2. Add donation with lat/lng
3. Create NGO account with lat/lng in profile
4. Submit donation
5. Check console for matching results
6. (Future) NGO should see notification

### **Test Blockchain Metadata**
1. Submit donation
2. Check Firestore `food_items/{id}` for `blockchainMetadata` field
3. Verify all required fields present
4. Check timestamp formats (ISO 8601)

---

## **Known Limitations**

1. **Google Maps API Key Required**: Autocomplete + reverse geocoding won't work without it (GPS still works)
2. **YOLOv8 Image Analysis**: Frontend ready, Python microservice not yet deployed
3. **NGO Notifications**: Matching runs but doesn't send notifications yet
4. **Blockchain**: Metadata structure ready but on-chain storage not implemented
5. **Map Picker**: Manual lat/lng entry only; interactive map pending

---

## **Support**

For issues or questions:
- Check Firebase Console logs for backend errors
- Browser DevTools Console for frontend errors
- Firestore Security Rules may block some operations

**Contact**: Built by Meku.dev

