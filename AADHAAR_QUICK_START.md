# 🚀 Aadhaar eKYC - Quick Start Guide

## 30-Second Testing

### Method 1: Lightning Fast ⚡
```
1. Login to your account
2. Go to Profile → "Aadhaar eKYC Verification"
3. Click "Verify with Aadhaar eKYC"
4. Click "🎲 Random Aadhaar" button
5. Click "Send OTP"
6. Click "✅ Auto-fill OTP"
7. Click "Verify OTP"
8. ✓ DONE! You're verified!
```

### Method 2: Direct URL
```
1. Navigate to: http://localhost:5173/verify-aadhaar
2. Follow steps 4-8 above
```

## Testing Credentials

**Any 12-digit number works!**

Examples:
- `123456789012`
- `999988887777`
- `111122223333`

## Console Logs

**Open DevTools (F12)** to see:
```
🔐 TESTING MODE - Generated OTP: 456789
📝 Mock Aadhaar Name: Rajesh Kumar
```

## Quick Test Buttons

| Button | What it does |
|--------|--------------|
| 🎲 Random Aadhaar | Auto-fills a random 12-digit number |
| ✅ Auto-fill OTP | Instantly fills the correct OTP |
| 🔄 Resend OTP | Generates a new OTP |

## After Verification

Your profile will show:
```
✓ Aadhaar Verified
Aadhaar: ****-****-9012
[VERIFIED] badge
```

## Files Created

1. `frontend/src/components/AadhaarVerification.tsx`
2. `frontend/src/pages/AadhaarVerificationPage.tsx`
3. Updated: `frontend/src/components/ProfileSettings.tsx`
4. Updated: `frontend/App.tsx`

## Routes

- `/verify-aadhaar` - Aadhaar verification page (protected)

## Testing Mode Features

✅ Accept any 12-digit Aadhaar
✅ Random OTP generation
✅ Console logging of OTP
✅ Quick-fill buttons
✅ Mock name assignment
✅ Full verification flow
✅ Profile persistence

## Ready to Test! 🎉

Just run your dev server and follow the "Lightning Fast" method above!

```bash
npm run dev
# Navigate to http://localhost:5173
# Login → Profile → Aadhaar eKYC
```

---

**See `AADHAAR_EKYC_TESTING.md` for complete documentation**


