# 🌱 How to Populate Firebase with Sample Data

## Quick Start (3 Steps)

### Step 1: Get Firebase Service Account Key

1. Go to **Firebase Console**: https://console.firebase.google.com
2. Select your project: `zerowaste-677fd`
3. Click **⚙️ Settings** (gear icon) → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key** button
6. Save the downloaded JSON file as `serviceAccountKey.json` in the `frontend/` folder

### Step 2: Install Firebase Admin SDK

```bash
cd frontend
npm install firebase-admin --save-dev
```

### Step 3: Run the Seeding Script

```bash
node seedData.js
```

---

## What Gets Created

The script will populate your Firebase with:

✅ **20 Donors** (Hotels & Restaurants)
- Taj Hotels, ITC Grand, Oberoi Restaurant, etc.
- Distributed across 10 Indian cities

✅ **10 NGOs** (Partner Organizations)
- Feeding India, Akshaya Patra, Robin Hood Army, etc.
- Verified and ready to receive donations

✅ **100 Food Donations**
- Various Indian dishes (Biryani, Dal, Paneer Curry, etc.)
- Realistic quantities (20-150 meals each)
- 80 claimed, 20 still available

✅ **80 Claims**
- 60 fulfilled (shows on impact dashboard)
- 20 approved (pending delivery)

✅ **30 Micro-donations**
- ₹5 to ₹100 donations
- UPI payment records

---

## Expected Impact Dashboard Numbers

After running the script, your dashboard will show:

- 📦 **4,000-6,000 Meals Saved**
- 🌱 **10,000-15,000 kg CO₂ Prevented**
- 📈 **1,200-1,800 kg Food Waste Diverted**
- 👥 **20 Active Donors**
- 🏆 **10 Partner NGOs**
- 📊 **100 Total Donations**

Plus a beautiful **Top Cities** chart with Mumbai, Delhi, Bangalore, etc.!

---

## Troubleshooting

### Error: Cannot find module 'serviceAccountKey.json'
- Make sure you downloaded the key from Firebase Console
- Place it in the `frontend/` folder
- File name must be exactly `serviceAccountKey.json`

### Error: Permission denied
- Make sure your Firebase project has Firestore enabled
- Check that your service account has proper permissions

### Want to clear the data?
Go to Firebase Console → Firestore Database → Delete collections manually

---

## Security Note

⚠️ **IMPORTANT**: Never commit `serviceAccountKey.json` to Git!

Add to `.gitignore`:
```
serviceAccountKey.json
```

This file contains sensitive credentials for your Firebase project.

---

## Alternative: Use the Button in UI

If you don't want to run a Node script, you can also use the **"🌱 Add Sample Data"** button that appears on the Impact Dashboard when data is low!

Just go to `http://localhost:5173/impact` and click the purple button at the top.

---

**That's it! Enjoy your populated dashboard! 🎉**






