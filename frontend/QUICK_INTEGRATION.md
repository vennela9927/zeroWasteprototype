# 🚀 Quick Integration Guide - 5 Minutes Setup

## Step 1: Import Components

Add to your dashboard file (e.g., `DonorDashboard.tsx` or `Dashboard.tsx`):

```typescript
import DonationProgress from '../components/DonationProgress';
import { useState } from 'react';
```

## Step 2: Add State for Modal

```typescript
const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
const [showProgressModal, setShowProgressModal] = useState(false);
```

## Step 3: Add "Track Progress" Button

In your pending requests or claims list, add this button:

```typescript
<button
  onClick={() => {
    setSelectedClaimId(claim.id);
    setShowProgressModal(true);
  }}
  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all"
>
  📊 Track Progress
</button>
```

## Step 4: Render Modal

At the end of your component, before the closing tag:

```typescript
{showProgressModal && selectedClaimId && (
  <DonationProgress
    claimId={selectedClaimId}
    userRole={userRole} // 'donor' or 'ngo'
    onClose={() => {
      setShowProgressModal(false);
      setSelectedClaimId(null);
    }}
  />
)}
```

## Step 5: Set User Role

Make sure you have the user role:

```typescript
// Get from auth context or profile
const userRole = profile?.role === 'donor' ? 'donor' : 'ngo';
```

---

## 🎯 Complete Example

```typescript
import React, { useState } from 'react';
import DonationProgress from '../components/DonationProgress';
import { useAuth } from '../context/AuthContext';

function DonorDashboard() {
  const { profile } = useAuth();
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  
  const userRole = profile?.role === 'donor' ? 'donor' : 'ngo';

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Donations</h1>
      
      {/* Your existing donations list */}
      <div className="space-y-4">
        {donations.map(donation => (
          <div key={donation.id} className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold">{donation.foodName}</h3>
            <p className="text-sm text-gray-600">Status: {donation.status}</p>
            
            {/* Add this button */}
            <button
              onClick={() => {
                setSelectedClaimId(donation.id);
                setShowProgressModal(true);
              }}
              className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              📊 Track Progress
            </button>
          </div>
        ))}
      </div>

      {/* Add this modal */}
      {showProgressModal && selectedClaimId && (
        <DonationProgress
          claimId={selectedClaimId}
          userRole={userRole}
          onClose={() => {
            setShowProgressModal(false);
            setSelectedClaimId(null);
          }}
        />
      )}
    </div>
  );
}

export default DonorDashboard;
```

---

## ✅ That's it!

Your donation progress tracking is now live! 🎉

**What happens next:**
- Donors see Accept/Reject buttons for new requests
- NGOs can update progress through all stages
- Status auto-refreshes every 10 seconds
- NGOs can upload proof after delivery
- Donors can download CSR certificates after verification

---

## 🎨 Visual Flow

```
NGO → Request Food
  ↓
Donor → Accept/Reject (sees progress modal)
  ↓
NGO → Mark Picked Up
  ↓
NGO → Mark In Transit (map shows route)
  ↓
NGO → Mark Delivered
  ↓
NGO → Upload Proof & Verify
  ↓
Donor → Download CSR Certificate 📄
```

---

## 🔧 Common User Roles

| User Type | userRole Value | Can Do |
|-----------|---------------|--------|
| Donor | `'donor'` | Accept/Reject requests, Download certificates |
| NGO | `'ngo'` | Update status, Upload proof |

---

## 📦 Required Packages

Already installed in your project:
- ✅ `jspdf` - PDF generation
- ✅ `qrcode` - QR code for certificates
- ✅ `framer-motion` - Animations
- ✅ `lucide-react` - Icons
- ✅ `react-toastify` - Notifications

No additional setup needed! 🚀

