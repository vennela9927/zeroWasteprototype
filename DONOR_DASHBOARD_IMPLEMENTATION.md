# 🏠 ZeroWaste Donor Dashboard - Complete Implementation Guide

## **Status: Foundation Complete, Enhancements In Progress**

---

## **✅ What's Already Built**

### **1. Core Platform Features**
- ✅ Firebase Authentication (email/password)
- ✅ Role-based access (donor/recipient)
- ✅ Food listings with expiry tracking
- ✅ Claims/request workflow
- ✅ Google Maps integration (GPS + directions)
- ✅ AI matching engine (location + expiry + capacity + reliability scoring)
- ✅ Blockchain metadata structure
- ✅ Enhanced donation form with GPS, food types, image upload
- ✅ Logout confirmation in sidebar

### **2. Donor Dashboard Foundation** (`frontend/src/pages/DonorDashboard.tsx`)
- ✅ Header with navigation (Home | Donations | Rewards/CSR | Support)
- ✅ Quick stats bar (Total Meals, Points/Active Donations)
- ✅ Account type detection (individual vs company)
- ✅ Conditional UI (Rewards for individuals, CSR for companies)
- ✅ Mobile-responsive bottom navigation
- ✅ Tab-based content switching

---

## **🚧 Implementation Roadmap (Next Steps)**

### **Phase 1: Donation Form Refinement** ⏳

**File**: `frontend/src/components/RefinedDonationForm.tsx`

**Features**:
```typescript
- Food Type: Radio buttons (Veg | Non-Veg | Cooked | Raw | Packaged)
- Quantity: Number + Unit dropdown (kg, meals, portions)
- Expiry: DateTime picker
- Location: Auto-detect GPS + manual edit
- Special Notes: Textarea (e.g., "Requires cold storage")
- Remove: Photo upload (not needed per requirements)
```

**Validation**:
- All fields required except Special Notes
- Expiry must be future date/time
- Quantity > 0

---

### **Phase 2: AI Matching UI** 🤖

**File**: `frontend/src/components/AIMatchingResults.tsx`

**Display**:
```
After donation submit:
1. Loading state: "AI matching nearby NGOs..."
2. Results panel:
   - Top 5 NGOs with scores
   - Distance, capacity, reliability breakdown
   - Map showing donor + NGO locations (Leaflet/Mapbox)
3. Actions:
   - "Confirm NGO" button for each
   - "Auto-Assign to Top Match" button
```

**Backend Integration**:
- Call `triggerAIMatching` Cloud Function
- Display `matchedNGOs` array
- On confirm/auto-assign: create claim with status='pending_pickup'

---

### **Phase 3: Real-Time Tracking Timeline** 📍

**File**: `frontend/src/components/DonationTrackingTimeline.tsx`

**Status Flow**:
```
Submitted → Matched → Pickup Scheduled → In Transit → Delivered
```

**UI**:
- Vertical timeline with checkmarks
- Current status highlighted
- ETA display for in-transit
- No QR scanning (removed per requirements)

**Data Source**:
- Update claim status in Firestore
- Real-time listener for status changes

---

### **Phase 4: Rewards System** (Individuals Only) 🏆

**File**: `frontend/src/components/RewardsDashboard.tsx`

**Metrics**:
- **Points**: 10 per completed donation
- **Meals Saved**: Sum of fulfilled donations
- **CO₂ Reduced**: meals × 0.5kg
- **NGOs Served**: Unique NGO count

**Components**:
- Impact cards (animated counters)
- Leaderboard (top donors in region)
- Badges system:
  - 🥉 Bronze: 5 donations
  - 🥈 Silver: 20 donations
  - 🥇 Gold: 50 donations
  - 💎 Platinum: 100 donations

**Backend**:
```typescript
// Cloud Function: calculateRewards
export const calculateRewards = functions.https.onCall(async (request) => {
  const uid = request.auth.uid;
  const claims = await db.collection('claims')
    .where('donorId', '==', uid)
    .where('status', '==', 'fulfilled')
    .get();
  
  const points = claims.size * 10;
  const meals = claims.docs.reduce((sum, doc) => sum + (doc.data().quantity || 0), 0);
  const co2 = meals * 0.5;
  
  return { points, meals, co2 };
});
```

---

### **Phase 5: CSR Certificates** (Companies Only) 📜

**File**: `frontend/src/components/CSRCertificateGenerator.tsx`

**Features**:
- List of completed donations
- "Download Certificate" button for each
- PDF generation using `jsPDF` or `PDFMake`

**Certificate Content**:
```
───────────────────────────────
    CORPORATE SOCIAL RESPONSIBILITY
         DONATION CERTIFICATE
───────────────────────────────

This certifies that

    [Company Name]

has successfully donated

    [Quantity] [Unit] of [Food Type]

to

    [NGO Name]
    [NGO Address]

on [Date]

Verified through Zero Waste Platform

Donation ID: [ID]
───────────────────────────────
```

**Backend**:
```typescript
// Cloud Function: generateCSRCertificate
export const generateCSRCertificate = functions.https.onCall(async (request) => {
  const { donationId } = request.data;
  const claim = await db.collection('claims').doc(donationId).get();
  const donation = await db.collection('food_items').doc(claim.data().foodItemId).get();
  const ngo = await db.collection('users').doc(claim.data().recipientId).get();
  
  return {
    companyName: request.auth.token.name,
    ngoName: ngo.data().name,
    ngoAddress: ngo.data().address,
    quantity: donation.data().quantity,
    foodType: donation.data().foodType,
    date: claim.data().fulfilledAt.toDate().toISOString(),
    donationId
  };
});
```

**Frontend Integration**:
```typescript
import jsPDF from 'jspdf';

const downloadCertificate = async (donationId: string) => {
  const data = await generateCSRCertificate({ donationId });
  const pdf = new jsPDF();
  
  pdf.setFontSize(20);
  pdf.text('CSR Donation Certificate', 105, 20, { align: 'center' });
  pdf.setFontSize(12);
  pdf.text(`Company: ${data.companyName}`, 20, 40);
  pdf.text(`NGO: ${data.ngoName}`, 20, 50);
  pdf.text(`Quantity: ${data.quantity}`, 20, 60);
  pdf.text(`Date: ${new Date(data.date).toLocaleDateString()}`, 20, 70);
  
  pdf.save(`csr-certificate-${donationId}.pdf`);
};
```

---

### **Phase 6: Micro-Donation Widget** 💰

**File**: `frontend/src/components/MicroDonationWidget.tsx`

**UI**:
```
┌─────────────────────────────┐
│ Support Logistics           │
│                             │
│ Help fund delivery costs    │
│                             │
│  ₹5   ₹10   ₹15   ₹20      │
│                             │
│ [Donate via UPI]            │
│                             │
│ Progress: ₹45,000 / ₹50,000 │
│ █████████░ 90%              │
└─────────────────────────────┘
```

**Razorpay Integration**:
```typescript
import { useRazorpay } from 'react-razorpay';

const handleMicroDonation = async (amount: number) => {
  const options = {
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount: amount * 100, // paise
    currency: 'INR',
    name: 'ZeroWaste Logistics Fund',
    description: 'Support delivery operations',
    handler: async (response: any) => {
      // Verify payment on backend
      await verifyPayment({
        razorpay_payment_id: response.razorpay_payment_id,
        amount
      });
      toast.success('Thank you for supporting logistics!');
    }
  };
  
  const razorpay = new window.Razorpay(options);
  razorpay.open();
};
```

**Backend**:
```typescript
// Cloud Function: verifyPayment
export const verifyPayment = functions.https.onCall(async (request) => {
  const { razorpay_payment_id, amount } = request.data;
  
  // Verify with Razorpay API
  const payment = await razorpay.payments.fetch(razorpay_payment_id);
  
  if (payment.status === 'captured' && payment.amount === amount * 100) {
    // Store in logistics_fund collection
    await db.collection('logistics_fund').add({
      donorId: request.auth.uid,
      amount,
      paymentId: razorpay_payment_id,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true };
  }
  
  throw new functions.https.HttpsError('invalid-argument', 'Payment verification failed');
});
```

---

### **Phase 7: Past Donations List** 📋

**File**: `frontend/src/components/PastDonationsList.tsx`

**Features**:
- Table/card view with:
  - Donation ID
  - NGO Name
  - Date/Time
  - Quantity/Type
  - Status
  - Rewards Points (individuals)
  - CSR Certificate Download (companies)
- Filters: Status, Date range, NGO
- "Re-donate Similar" quick button

**UI**:
```
┌────────────────────────────────────────────────────────┐
│ Past Donations                            [Filter ▼]   │
├────────────────────────────────────────────────────────┤
│ #D12345 | Food Bank ABC | 2025-01-20 | 50 meals       │
│ Status: Delivered ✓ | Points: +10 | [Re-donate]       │
├────────────────────────────────────────────────────────┤
│ #D12344 | NGO XYZ | 2025-01-18 | 30kg rice            │
│ Status: Delivered ✓ | [Download CSR Certificate]      │
└────────────────────────────────────────────────────────┘
```

---

### **Phase 8: Account Type Detection** 👤

**Update**: `frontend/src/context/AuthContext.tsx`

**Add accountType to profile**:
```typescript
interface ZeroUserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'donor' | 'recipient';
  accountType?: 'individual' | 'company'; // NEW
  companyName?: string; // For companies
  gstNumber?: string; // For companies
  // ... existing fields
}
```

**Signup flow update**:
```typescript
// In AuthModal.tsx
const [accountType, setAccountType] = useState<'individual' | 'company'>('individual');

// Add to signup form
<select value={accountType} onChange={(e) => setAccountType(e.target.value)}>
  <option value="individual">Individual</option>
  <option value="company">Company/Organization</option>
</select>

// Pass to signup function
await signup(email, password, name, role, accountType);
```

---

## **📦 Required Dependencies**

```bash
cd frontend
npm install jspdf
npm install razorpay  # For micro-donations
npm install recharts   # For charts/leaderboard
npm install date-fns   # Already installed
```

---

## **🔧 Configuration**

### **Environment Variables**
```bash
# frontend/.env.local
VITE_GOOGLE_MAPS_API_KEY=...
VITE_RAZORPAY_KEY_ID=...
VITE_FIREBASE_API_KEY=...
# ... existing Firebase vars
```

### **Firestore Collections Schema**

**logistics_fund** (new):
```json
{
  "donorId": "uid",
  "amount": 10,
  "paymentId": "pay_xyz",
  "timestamp": Timestamp
}
```

**users** (updated):
```json
{
  "accountType": "individual" | "company",
  "companyName": "XYZ Corp",  // if company
  "gstNumber": "...",         // if company
  // ... existing fields
}
```

---

## **🚀 Deployment Steps**

1. **Install dependencies**:
```bash
cd frontend && npm install
cd ../backend/functions && npm install
```

2. **Build**:
```bash
cd frontend && npm run build
cd ../backend/functions && npm run build
```

3. **Deploy**:
```bash
firebase use zerowaste-677fd
firebase deploy --only "hosting,functions,firestore:rules"
```

---

## **📊 Summary**

| Feature | Status | Priority |
|---------|--------|----------|
| Header + Navigation | ✅ Complete | High |
| Quick Stats | ✅ Complete | High |
| Account Type Detection | 🚧 Partial | High |
| Refined Donation Form | 📝 Pending | High |
| AI Matching UI | 📝 Pending | High |
| Tracking Timeline | 📝 Pending | Medium |
| Rewards System | 🚧 Partial | Medium |
| CSR Certificates | 📝 Pending | Medium |
| Micro-Donations | 📝 Pending | Low |
| Past Donations | 📝 Pending | Low |

---

## **Next Actions**

1. **Immediate**: Complete account type detection in signup flow
2. **High Priority**: Implement refined donation form + AI matching UI
3. **Medium Priority**: Build tracking timeline + rewards dashboard
4. **Low Priority**: CSR certificates + micro-donation widget

Total estimated implementation time: **12-16 hours**

---

**Built by**: Meku.dev  
**Last Updated**: 2025-01-21

