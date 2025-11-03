# 🚀 ZeroWaste Platform - Setup Guide

## Prerequisites

- Node.js 18+ and npm
- Firebase account
- Google Cloud Platform account (for Maps API)
- Git

---

## 🔧 Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Google Maps API

**Get API Key:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - **Maps JavaScript API**
   - **Places API**
4. Create credentials → API Key
5. (Optional but recommended) Restrict the API key:
   - Application restrictions: HTTP referrers
   - Add your domains: `localhost:*`, `*.web.app/*`, `*.firebaseapp.com/*`
   - API restrictions: Limit to Maps JavaScript API & Places API

**Add to Project:**

Create a `.env.local` file in the `frontend` directory:

```bash
# frontend/.env.local
VITE_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
```

**Important**: Never commit `.env.local` to git!

### 3. Firebase Configuration

Firebase config is already hardcoded in `frontend/src/lib/firebase.ts` for this project.

If you need to use a different Firebase project:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Add a web app
4. Copy the config object
5. Edit `frontend/src/lib/firebase.ts` and replace the `firebaseConfig` object

### 4. Run Development Server

```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173`

---

## 🔥 Backend Setup (Firebase Functions)

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Install Dependencies

```bash
cd backend/functions
npm install
```

### 4. Deploy Functions (Optional)

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:triggerAIMatching
```

---

## 📊 Firestore Setup

### 1. Enable Firestore

1. Go to Firebase Console → Firestore Database
2. Create database (choose production mode or test mode)
3. Set location (e.g., asia-south1 for India)

### 2. Set Security Rules

Deploy Firestore rules:

```bash
firebase deploy --only firestore:rules
```

Or manually copy rules from `frontend/firestore.rules.prod` to Firebase Console.

### 3. Create Indexes

Deploy indexes:

```bash
firebase deploy --only firestore:indexes
```

---

## 🌐 Deployment

### Deploy to Firebase Hosting

**First time:**

```bash
# Build frontend
cd frontend
npm run build

# Deploy from project root
cd ..
firebase deploy --only hosting
```

**Update deployment:**

```bash
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

### Full Deployment (Hosting + Functions + Firestore)

```bash
# Build frontend
cd frontend
npm run build
cd ..

# Deploy everything
firebase deploy --only "hosting,functions,firestore:rules"
```

---

## 📱 Testing

### Local Testing

**Frontend:**
```bash
cd frontend
npm run dev
```

**Firebase Emulators (Optional):**
```bash
firebase emulators:start
```

### Production Testing

After deployment, visit your Firebase Hosting URL:
```
https://your-project-id.web.app
```

---

## 🔑 Environment Variables Summary

### Frontend (`.env.local`)

```bash
# Required for Google Maps features
VITE_GOOGLE_MAPS_API_KEY=your_key_here
```

### Backend

No environment variables needed currently. All config is in code.

---

## 🐛 Troubleshooting

### Issue: Google Maps not loading

**Solution:**
1. Check if `VITE_GOOGLE_MAPS_API_KEY` is set in `.env.local`
2. Verify API key has Maps JavaScript API & Places API enabled
3. Check browser console for API errors
4. Ensure you've restarted the dev server after adding env vars

### Issue: Firebase Auth error

**Solution:**
1. Check `frontend/src/lib/firebase.ts` has correct config
2. Verify Firebase Authentication is enabled in Firebase Console
3. Enable Email/Password sign-in method

### Issue: Build fails

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Try build again
npm run build
```

### Issue: Firestore permission denied

**Solution:**
1. Check Firestore rules in Firebase Console
2. Ensure user is authenticated
3. Verify rules allow the operation

---

## 📂 Project Structure

```
zero_waste/
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities & config
│   │   └── context/        # React Context providers
│   ├── public/             # Static assets
│   ├── dist/               # Build output (generated)
│   └── package.json
├── backend/
│   └── functions/          # Firebase Cloud Functions
│       ├── index.ts        # Function definitions
│       └── package.json
├── firebase.json           # Firebase config
└── README.md
```

---

## 🎯 Quick Start Checklist

- [ ] Install Node.js 18+
- [ ] Clone repository
- [ ] `cd frontend && npm install`
- [ ] Create `.env.local` with Google Maps API key
- [ ] Run `npm run dev`
- [ ] Create Firebase account (if needed)
- [ ] Enable Firestore & Authentication
- [ ] Test locally
- [ ] Build: `npm run build`
- [ ] Deploy: `firebase deploy`

---

## 🔗 Useful Links

- [Firebase Console](https://console.firebase.google.com/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Google Maps Platform](https://developers.google.com/maps)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)

---

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Review Firebase Console logs
3. Check this guide's troubleshooting section
4. Review code comments in source files

---

**Last Updated**: October 21, 2025  
**Version**: 1.0.0



