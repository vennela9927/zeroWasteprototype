# 🏗️ Complete Zero Waste Platform - System Architecture

## 📋 Executive Summary

This document outlines the comprehensive architecture for an end-to-end food donation platform connecting verified donors with NGOs through AI-powered matching, real-time tracking, and blockchain-verified transparency.

---

## 🎯 System Components Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     ZERO WASTE PLATFORM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   DONORS     │    │     NGOs     │    │   DRIVERS    │      │
│  │ (Verified)   │    │ (Verified)   │    │ (Volunteers) │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                    │              │
│         └───────────────────┴────────────────────┘              │
│                             │                                    │
│                   ┌─────────▼─────────┐                         │
│                   │   CORE BACKEND    │                         │
│                   │  (Node.js/Python) │                         │
│                   └─────────┬─────────┘                         │
│                             │                                    │
│         ┌───────────────────┼───────────────────┐               │
│         │                   │                   │               │
│  ┌──────▼──────┐   ┌────────▼────────┐  ┌──────▼──────┐       │
│  │ AI Matching │   │ Verification    │  │  Blockchain │       │
│  │   Engine    │   │     System      │  │   Ledger    │       │
│  └─────────────┘   └─────────────────┘  └─────────────┘       │
│                                                                   │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│  │   GPS       │   │  QR Code    │   │   Reward    │          │
│  │  Tracking   │   │  Generator  │   │   System    │          │
│  └─────────────┘   └─────────────────┘  └─────────────┘          │
│                                                                   │
│  ┌─────────────────────────────────────────────────────┐        │
│  │           PUBLIC IMPACT DASHBOARD                   │        │
│  │   (Meals Saved • CO₂ Reduced • Active Users)       │        │
│  └─────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 1. Registration & Verification System

### 1.1 Donor Verification Flow

```
User Sign Up → Upload Aadhaar → AI OCR Extraction → Admin Review → ✅ Verified Badge
```

**Implementation:**
- **Frontend**: Document upload UI with drag-drop
- **Backend**: OCR service (Tesseract.js or Cloud Vision API)
- **Database**: Store verification status in `users` collection
- **Security**: Encrypt Aadhaar data, GDPR compliant

**Data Model:**
```typescript
interface UserVerification {
  userId: string;
  verificationType: 'aadhaar' | 'ngo_certificate' | 'trust_deed';
  documentUrl: string; // Firebase Storage URL
  documentNumber: string; // Masked for privacy
  verificationStatus: 'pending' | 'approved' | 'rejected';
  verifiedAt?: Timestamp;
  verifiedBy?: string; // Admin ID
  rejectionReason?: string;
}
```

### 1.2 NGO Verification Flow

```
NGO Registration → Upload Certificate → Document Validation → Capacity Setup → ✅ Trusted NGO
```

**Additional Fields:**
- Registration number
- Trust deed
- 80G certificate (tax exemption)
- Bank account details (for micro-donations)

---

## 🍱 2. Food Entry & QR Code Generation

### 2.1 Donation Creation Workflow

```
Donor Form → Auto-fill Location → Upload Photo → Generate QR → Status: "Available"
```

**QR Code Contents:**
```json
{
  "food_id": "F123456",
  "donor_id": "D789",
  "donor_name": "Leela Palace",
  "food_name": "Veg Biryani",
  "quantity": 50,
  "created_at": "2025-10-26T15:30:00Z",
  "expiry_time": "2025-10-26T21:00:00Z",
  "verification_hash": "abc123..." // For blockchain
}
```

**Tech Stack:**
- **QR Generation**: `qrcode.react` or `qrcode` npm package
- **Storage**: QR code saved as PNG in Firebase Storage
- **Display**: Embedded in donation card, downloadable PDF

### 2.2 Freshness Prediction (Optional - Phase 2)

**IoT Integration:**
- Temperature sensors via MQTT
- Humidity tracking
- AI image analysis for visual freshness

**Fallback:**
- Time-based decay model (already implemented in AI matching)

---

## 🧠 3. AI Matching Engine (✅ Already Implemented - Enhanced)

**Current Implementation:**
- Pre-filtering (expired, food type mismatch)
- Weighted scoring algorithm (0-100)
- AI learning system for adaptive recommendations

**Enhancements Needed:**
- Realtime capacity tracking (update NGO capacity as claims are accepted)
- Batch matching (multiple NGOs for large donations)
- Priority queuing for critical expiry

---

## 📍 4. NGO Dashboard (✅ Enhanced - Needs GPS Filters)

**Current Features:**
- AI-sorted donor listings
- Match score badges
- Smart tags & urgency indicators

**Additions:**
- **Distance Slider Filter**: 0-50km range
- **Capacity Filter**: Only show donations within NGO capacity
- **Expiring Soon Toggle**: Show only items expiring in <6 hours

---

## 🚚 5. Pickup Assignment & Tracking System

### 5.1 Driver Management

**New Collections:**
```typescript
interface Driver {
  driverId: string;
  name: string;
  phone: string;
  vehicleType: 'bike' | 'car' | 'van';
  currentLocation: { lat: number; lng: number };
  availability: 'available' | 'on_delivery' | 'offline';
  assignedNGO?: string; // If driver is NGO staff
  rating: number;
  completedDeliveries: number;
}

interface DeliveryTask {
  taskId: string;
  foodItemId: string;
  donorId: string;
  ngoId: string;
  driverId: string;
  pickupLocation: { lat: number; lng: number; address: string };
  dropoffLocation: { lat: number; lng: number; address: string };
  status: 'assigned' | 'en_route_pickup' | 'picked_up' | 'en_route_delivery' | 'delivered';
  assignedAt: Timestamp;
  pickedAt?: Timestamp;
  deliveredAt?: Timestamp;
  qrScans: QRScanLog[];
  distanceKm: number;
  estimatedTime: number; // minutes
}

interface QRScanLog {
  scannedBy: string; // driver ID
  scannedAt: Timestamp;
  location: { lat: number; lng: number };
  scanType: 'pickup' | 'delivery';
  verificationHash: string;
}
```

### 5.2 Assignment Algorithm

**Simple MVP:**
1. Find nearest available driver to donor location
2. Calculate route: Donor → NGO
3. Assign task + send push notification

**Advanced (Phase 2):**
- Multi-stop optimization (one driver, multiple pickups)
- Load balancing based on vehicle capacity

### 5.3 Live Tracking Implementation

**Tech Stack:**
- **Frontend**: Google Maps JavaScript API or Mapbox
- **Backend**: Firebase Realtime Database for live GPS updates
- **Mobile**: Geolocation API with 10-second intervals

**Data Flow:**
```
Driver App → Update GPS every 10s → Realtime DB → Donor/NGO Dashboard (Live Map)
```

**Realtime DB Structure:**
```json
{
  "live_tracking": {
    "task_T123": {
      "driver_location": { "lat": 12.9716, "lng": 77.5946 },
      "last_updated": 1698345678000,
      "status": "en_route_delivery",
      "eta_minutes": 12
    }
  }
}
```

---

## 🔒 6. QR Scanning & Blockchain Logging

### 6.1 QR Scan Flow

**Pickup:**
```
Driver arrives → Opens app → Scans QR at donor location → Status: "Picked Up" → GPS logged
```

**Delivery:**
```
Driver arrives → NGO staff scans QR → Status: "Delivered" → GPS logged → Blockchain entry
```

### 6.2 Blockchain Integration (Simplified MVP)

**Option 1: Hash-based Audit Trail (No actual blockchain)**
- Generate SHA-256 hash of each transaction
- Store in Firestore with timestamp
- Create immutable audit log

**Option 2: Real Blockchain (Phase 2)**
- Use Ethereum testnet or Polygon
- Smart contract for donation logging
- IPFS for document storage

**MVP Implementation:**
```typescript
interface AuditLog {
  logId: string;
  foodItemId: string;
  eventType: 'created' | 'claimed' | 'picked_up' | 'delivered';
  timestamp: Timestamp;
  actorId: string; // User who triggered
  location: { lat: number; lng: number };
  previousHash: string;
  currentHash: string; // SHA-256(prev_hash + current_data)
  verified: boolean;
}

// Hash calculation
function calculateHash(data: any, previousHash: string): string {
  const dataString = JSON.stringify(data) + previousHash;
  return CryptoJS.SHA256(dataString).toString();
}
```

---

## 🛡️ 7. Food Safety & Anomaly Detection

### 7.1 Automatic Expiry Removal

**Cron Job (Firebase Cloud Functions):**
```typescript
// Run every 10 minutes
export const removeExpiredFood = functions.pubsub
  .schedule('every 10 minutes')
  .onRun(async () => {
    const now = Timestamp.now();
    const expiredItems = await db.collection('food_items')
      .where('expiryTime', '<=', now)
      .where('status', '==', 'available')
      .get();
    
    const batch = db.batch();
    expiredItems.forEach(doc => {
      batch.update(doc.ref, { status: 'expired' });
    });
    await batch.commit();
  });
```

### 7.2 AI Anomaly Detection

**Fraud Patterns:**
- Donor creates many donations but cancels frequently
- NGO accepts but never picks up
- Suspicious timing patterns (all donations at 3am)

**Implementation:**
```typescript
interface AnomalyScore {
  userId: string;
  riskScore: number; // 0-100
  flags: {
    highCancellationRate: boolean;
    suspiciousTiming: boolean;
    multipleRejections: boolean;
    locationInconsistency: boolean;
  };
  lastUpdated: Timestamp;
}

// Calculate risk score based on history
function calculateRiskScore(user: any, history: any[]): number {
  let score = 0;
  const cancellationRate = history.filter(h => h.status === 'cancelled').length / history.length;
  if (cancellationRate > 0.3) score += 30;
  
  // More checks...
  return score;
}
```

**Actions:**
- Score 30-50: Warning email
- Score 50-70: Manual review required
- Score 70+: Auto-suspend account

---

## 🪙 8. Reward & Transparency System

### 8.1 Reward Points Calculation

**Formula:**
```typescript
points = (quantity * 2) + (verified_donor ? 10 : 0) + (distance_traveled / 5)
```

**Example:**
- 50 meals donated = 100 points
- Verified donor bonus = +10 points
- Traveled 10km = +2 points
- **Total: 112 points**

**Data Model:**
```typescript
interface RewardAccount {
  userId: string;
  totalPoints: number;
  pointsHistory: PointTransaction[];
  redeemedPoints: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  badges: string[]; // ['100_meals', 'verified_donor', 'monthly_star']
}

interface PointTransaction {
  transactionId: string;
  points: number;
  reason: string;
  timestamp: Timestamp;
  relatedDonation?: string;
}
```

**Redemption Options:**
- Platform fee waivers
- Partner discounts (restaurants, grocery stores)
- Charity donations (donate points to NGO)

### 8.2 CSR Certificate Generation

**Auto-generate PDF after delivery:**
```typescript
import PDFDocument from 'pdfkit';

async function generateCSRCertificate(donation: any, donor: any) {
  const doc = new PDFDocument();
  doc.fontSize(20).text('Certificate of Social Contribution', { align: 'center' });
  doc.fontSize(12).text(`This certifies that ${donor.name}`);
  doc.text(`donated ${donation.quantity} meals on ${donation.date}`);
  doc.text(`to ${donation.ngoName}`);
  doc.text(`Certificate ID: ${donation.id}`);
  doc.text(`Verified Hash: ${donation.blockchainHash}`);
  
  // Upload to Firebase Storage
  const buffer = await doc.getBuffer();
  const storageRef = storage.ref(`certificates/${donation.id}.pdf`);
  await storageRef.put(buffer);
  
  // Email to donor
  await sendEmail(donor.email, 'Your CSR Certificate', { pdfUrl });
}
```

---

## 💳 9. Micro-Donation System

### 9.1 Payment Integration

**Tech Stack:**
- **UPI**: Razorpay or PhonePe SDK
- **International**: Stripe (for future)

**Flow:**
```
User clicks "Donate ₹5" → Razorpay modal → Payment → Update fuel pool → Show thank you
```

**Data Model:**
```typescript
interface MicroDonation {
  donationId: string;
  donorUserId?: string; // Optional, can be anonymous
  amount: number;
  currency: 'INR';
  purpose: 'logistics' | 'general';
  paymentId: string; // Razorpay payment ID
  status: 'pending' | 'completed' | 'failed';
  timestamp: Timestamp;
  allocatedTo?: string; // Specific delivery task
}
```

**Transparency:**
- Show real-time "Fuel Pool Balance" on homepage
- Display: "Your ₹5 powered 1 meal delivery 🚚"

---

## 🌐 10. Public Impact Dashboard

### 10.1 Metrics Displayed

**Real-time Stats:**
- Total Meals Saved (count from `food_items` where status = 'delivered')
- CO₂ Emissions Prevented (meals * 2.5 kg CO₂ per meal wasted)
- Active Donors & NGOs
- Food Waste Diverted (kg)

**Visualizations:**
- Line chart: Meals saved over time
- Bar chart: Top donor cities
- Pie chart: Food types distributed
- Map: Heatmap of donation activity

**Tech Stack:**
- **Charts**: Recharts or Chart.js
- **Maps**: Google Maps Heatmap Layer

### 10.2 Traceable Journey Viewer

**Public Page: `/track/:foodId`**

Shows:
1. Donation created (timestamp, location)
2. NGO accepted (timestamp)
3. Driver assigned (name, vehicle)
4. Picked up (QR scan log, GPS)
5. Delivered (QR scan log, GPS)
6. Blockchain verification hash

---

## 🏗️ Implementation Phases

### **Phase 1: Foundation (Weeks 1-2)** ✅ CURRENT
- [x] AI matching algorithm
- [x] Basic dashboards
- [ ] QR code generation
- [ ] Document verification UI

### **Phase 2: Core Features (Weeks 3-4)**
- [ ] QR scanning functionality
- [ ] Driver management system
- [ ] Live GPS tracking
- [ ] Reward points system

### **Phase 3: Advanced (Weeks 5-6)**
- [ ] Blockchain audit logging
- [ ] CSR certificate generation
- [ ] Anomaly detection AI
- [ ] Micro-donation payments

### **Phase 4: Scale & Polish (Weeks 7-8)**
- [ ] Public impact dashboard
- [ ] IoT freshness integration
- [ ] Mobile apps (React Native)
- [ ] Admin dashboard for monitoring

---

## 🛠️ Technology Stack Summary

| Layer | Technology |
|-------|-----------|
| **Frontend** | React + TypeScript + Tailwind CSS |
| **Backend** | Firebase (Firestore, Auth, Storage, Functions) |
| **Real-time** | Firebase Realtime Database |
| **Maps** | Google Maps API / Mapbox |
| **QR Codes** | qrcode.react |
| **Payments** | Razorpay (UPI) |
| **AI/ML** | TensorFlow.js (anomaly detection) |
| **PDF** | PDFKit or jsPDF |
| **Blockchain** | Hash-based audit (MVP) → Polygon (Phase 2) |
| **Mobile** | React Native (Phase 4) |

---

## 📊 Database Schema Overview

**Collections:**
1. `users` - All user profiles (donors, NGOs, drivers)
2. `food_items` - Donation listings
3. `claims` - NGO claim requests
4. `delivery_tasks` - Pickup assignments
5. `drivers` - Driver profiles
6. `qr_scans` - QR scan logs
7. `audit_logs` - Blockchain-style immutable logs
8. `reward_accounts` - Points and badges
9. `micro_donations` - Payment transactions
10. `ai_learning_profiles` - ML learning data
11. `verification_requests` - KYC documents

---

## 🔐 Security Considerations

1. **Data Encryption**: Aadhaar numbers encrypted at rest
2. **Role-Based Access**: Firestore rules for donor/NGO/admin
3. **Rate Limiting**: Prevent spam donations
4. **GPS Spoofing Detection**: Validate location consistency
5. **Payment Security**: PCI-DSS compliant via Razorpay
6. **GDPR Compliance**: Data deletion on user request

---

## 📈 Scalability Plan

1. **Database**: Firestore auto-scales, consider sharding for 100k+ users
2. **Storage**: Firebase Storage with CDN for images/QR codes
3. **Functions**: Cloud Functions for heavy operations
4. **Caching**: Redis for frequently accessed data (top donors, stats)

---

## 🎯 Success Metrics

- **Operational**: 90%+ successful delivery rate
- **Engagement**: 70%+ donor return rate
- **Impact**: 10,000 meals saved in first 3 months
- **Speed**: Average claim-to-delivery time < 2 hours
- **Transparency**: 100% of donations traceable via QR

---

## 📞 Next Steps

1. ✅ Review and approve architecture
2. 🚀 Start Phase 1 implementation (QR codes, verification UI)
3. 🧪 Set up testing environment
4. 📱 Design mobile-first UI components
5. 🤝 Integrate payment gateway sandbox

---

**Document Version**: 1.0  
**Last Updated**: October 26, 2025  
**Prepared by**: AI Development Team

