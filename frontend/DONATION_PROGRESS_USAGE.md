# 🎯 Dynamic Donation Progress System - Usage Guide

## Overview
This system provides a complete donation tracking workflow with:
- ✅ Real-time status updates
- 📸 Proof upload by NGO
- 📄 CSR certificate generation for donors
- 🗺️ Map view during transit
- 🔄 Auto-refresh capability

---

## 📦 Components

### 1. DonationProgress.tsx
Main progress tracker modal showing the donation journey from request to verification.

**Features:**
- 6-stage progress timeline (Requested → Accepted → Picked Up → In Transit → Delivered → Verified)
- Role-based action buttons (Donor vs NGO)
- Auto-refresh every 10 seconds
- Manual refresh button
- Timeline with timestamps
- Map integration during transit

### 2. ProofUpload.tsx
NGO proof upload modal for delivery verification.

**Features:**
- Drag & drop file upload
- Image preview
- File validation (max 5MB, image only)
- Auto-marks as verified after upload

### 3. CSRGenerator.tsx
Generates downloadable PDF certificate for donors.

**Features:**
- Professional PDF layout with gradient design
- QR code for verification
- Proof image thumbnail
- Donor & NGO details
- Donation quantity & date
- Verified stamp

---

## 🚀 Integration Examples

### Example 1: Donor Dashboard - Pending Requests

```typescript
import { useState } from 'react';
import DonationProgress from '../components/DonationProgress';

function DonorDashboard() {
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  return (
    <>
      {/* Your pending requests list */}
      {pendingRequests.map(request => (
        <div key={request.id} className="border rounded-lg p-4">
          <h3>{request.foodName}</h3>
          <p>NGO: {request.recipientName}</p>
          <button
            onClick={() => setSelectedClaimId(request.id)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            View Progress
          </button>
        </div>
      ))}

      {/* Progress Modal */}
      {selectedClaimId && (
        <DonationProgress
          claimId={selectedClaimId}
          userRole="donor"
          onClose={() => setSelectedClaimId(null)}
        />
      )}
    </>
  );
}
```

### Example 2: NGO Dashboard - My Requests

```typescript
import { useState } from 'react';
import DonationProgress from '../components/DonationProgress';

function NGODashboard() {
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  return (
    <>
      {/* Your requested donations */}
      {myRequests.map(request => (
        <div key={request.id} className="border rounded-lg p-4">
          <h3>{request.foodName}</h3>
          <p>Status: {request.status}</p>
          <button
            onClick={() => setSelectedClaimId(request.id)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            Track Donation
          </button>
        </div>
      ))}

      {/* Progress Modal */}
      {selectedClaimId && (
        <DonationProgress
          claimId={selectedClaimId}
          userRole="ngo"
          onClose={() => setSelectedClaimId(null)}
        />
      )}
    </>
  );
}
```

### Example 3: Food Listings Table Integration

Add a "Track" button to existing approved claims:

```typescript
// In FoodListingsTable or similar component
<button
  onClick={() => setShowProgress(true)}
  className="text-blue-600 hover:text-blue-800"
>
  📊 Track Progress
</button>

{showProgress && (
  <DonationProgress
    claimId={claim.id}
    userRole={userType} // 'donor' or 'ngo'
    onClose={() => setShowProgress(false)}
  />
)}
```

---

## 🔄 Workflow

### For Donors:
1. **Requested** - NGO requests food → Donor sees "Accept/Reject" buttons
2. **Accepted** - Donor approves → Status updates to "Accepted"
3. **Picked Up → In Transit → Delivered** - NGO updates progress
4. **Verified** - NGO uploads proof → Donor can download CSR certificate

### For NGOs:
1. **Requested** - NGO submits request → Wait for donor approval
2. **Accepted** - Donor approves → NGO sees "Mark as Picked Up" button
3. **Picked Up** - NGO confirms pickup → "Mark as In Transit" button appears
4. **In Transit** - Show map with route → "Mark as Delivered" button
5. **Delivered** - NGO delivers → "Upload Proof & Verify" button appears
6. **Verified** - Upload proof image → Donation marked as verified

---

## 🗄️ Required Firestore Fields

Ensure your `claims` collection documents have these fields:

```typescript
{
  id: string;
  foodItemId: string;
  foodName: string;
  donorId: string;
  donorName: string;
  recipientId: string;
  recipientName: string;
  quantity: number;
  status: 'requested' | 'approved' | 'picked_up' | 'in_transit' | 'delivered' | 'verified' | 'rejected';
  
  // Timestamps
  requestedAt: Timestamp;
  approvedAt?: Timestamp;
  pickedUpAt?: Timestamp;
  inTransitAt?: Timestamp;
  deliveredAt?: Timestamp;
  verifiedAt?: Timestamp;
  
  // Location data (optional)
  latitude?: number;
  longitude?: number;
  donorLatitude?: number;
  donorLongitude?: number;
  location?: string;
  
  // Proof data
  proofImage?: string; // base64 or Firebase Storage URL
  proofFileName?: string;
}
```

---

## 🎨 Styling

All components use:
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Lucide React** for icons
- **React Toastify** for notifications

The design is fully responsive and matches your existing app theme.

---

## 🔧 Customization

### Change Auto-Refresh Interval

In `DonationProgress.tsx`, line 108:

```typescript
const interval = setInterval(() => {
  fetchDonation();
}, 10000); // Change to 5000 for 5 seconds, 30000 for 30 seconds
```

### Modify Progress Stages

Update the `STAGES` array in `DonationProgress.tsx`:

```typescript
const STAGES = [
  { key: 'requested', label: 'Requested', icon: User },
  { key: 'approved', label: 'Accepted', icon: CheckCircle },
  // Add/remove stages as needed
];
```

### Configure Map Provider

Replace Google Maps iframe in `DonationProgress.tsx` with your preferred provider (Mapbox, OpenStreetMap, etc.).

---

## 📸 Screenshots Flow

1. **Initial State** - Progress tracker shows current stage
2. **NGO Uploads Proof** - ProofUpload modal with drag & drop
3. **Verified** - Green verified stamp appears
4. **Donor Downloads** - CSR certificate with QR code

---

## 🐛 Troubleshooting

### Issue: "Cannot read properties of undefined"
**Solution:** Ensure the claim document exists in Firestore before opening the progress modal.

### Issue: Proof image not displaying
**Solution:** Check if `proofImage` is a valid data URL or accessible URL.

### Issue: PDF not generating
**Solution:** Verify `jspdf` and `qrcode` packages are installed:
```bash
npm install jspdf qrcode @types/qrcode
```

### Issue: Status not updating
**Solution:** Check Firestore security rules allow updates to the `claims` collection.

---

## 📝 Security Rules (Firestore)

Update your `firestore.rules`:

```javascript
match /claims/{claimId} {
  allow read: if request.auth != null && (
    request.auth.uid == resource.data.donorId ||
    request.auth.uid == resource.data.recipientId
  );
  
  allow update: if request.auth != null && (
    request.auth.uid == resource.data.donorId ||
    request.auth.uid == resource.data.recipientId
  );
  
  allow create: if request.auth != null;
}
```

---

## ✅ Testing Checklist

- [ ] Donor can accept/reject requests
- [ ] NGO can update status through all stages
- [ ] Auto-refresh works correctly
- [ ] Proof upload accepts valid images
- [ ] Proof upload rejects invalid files
- [ ] CSR certificate downloads successfully
- [ ] QR code appears in certificate
- [ ] Timeline shows correct timestamps
- [ ] Map displays during transit (if coordinates available)
- [ ] Status updates reflect on both donor and NGO dashboards

---

## 🚀 Next Steps

1. **Add notifications**: Use Firebase Cloud Messaging for real-time push notifications
2. **Email alerts**: Send emails when status changes
3. **Driver tracking**: Add live GPS tracking during transit
4. **Blockchain verification**: Store certificate hash on blockchain
5. **Multi-language support**: Translate UI to regional languages

---

## 📞 Support

For issues or questions, check:
- Firestore console for data structure
- Browser console for error messages
- Network tab for failed API calls

Happy coding! 🎉

