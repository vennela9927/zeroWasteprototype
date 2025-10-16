# Zero Waste Food Sharing & Redistribution Portal

A modern React + TypeScript + TailwindCSS dashboard application for facilitating food donation and NGO claim workflows, with Firebase (Auth + Firestore) as the backend. Includes role-based UI (Donor vs NGO), real-time listings, claim tracking, and an AI heuristic widget for predicted freshness windows.

## Problem Statement
In many urban areas, large amounts of edible food are wasted daily by restaurants, events, hostels, and households, while many still suffer from hunger. Although NGOs and food banks exist, there is no unified platform that effectively connects food donors with nearby NGOs in real time — especially considering food expiry timelines and location-based accessibility. Due to the lack of coordination, perishable food often expires before redistribution, resulting in both resource wastage and increased environmental impact.

Zero Waste aims to minimize food wastage by creating a smart, AI-powered system that links food donors with NGOs based on location proximity, expiry time, and food safety status, ensuring timely and efficient food redistribution.

## Tech Stack
- **Frontend:** React 19, TypeScript, Vite
- **Styling:** TailwindCSS (custom fintech-inspired theme), Radix Themes (selective), Lucide icons
- **State / Forms:** React Hook Form + Zod (validation)
- **Charts & UI Motion:** Recharts, Framer Motion
- **Routing:** React Router v6
- **Backend (BaaS):** Firebase (Auth, Firestore, optional Analytics & Messaging)
- **Tooling:** ESLint (flat config), TypeScript project refs, PostCSS, Vite plugins

## Project Structure
```
zero_waste/
  frontend/
    .env                 # Local (not committed) – copy from .env.example and fill Firebase keys
    .env.example         # Firebase config template (VITE_ prefixed)
    firestore.rules      # (May be legacy / base rules)
    firestore.rules.dev  # Relaxed dev rules (for rapid iteration)
    firestore.rules.prod # Hardened production rules
    index.html
    package.json
    tsconfig.json
    tsconfig.app.json
    tsconfig.node.json
    tailwind.config.js
    postcss.config.mjs
    vite.config.ts
    styles.css
    public/
      robots.txt
    src/
      App.tsx            # Root app shell (routes mounted here)
      index.tsx          # React root, wraps in AuthProvider
      components/
        Sidebar.tsx
        TopBar.tsx
        HeroCard.tsx
        StatCard.tsx
        FoodForm.tsx
        FoodListingsTable.tsx
        ClaimHistoryTimeline.tsx
        AIPredictionWidget.tsx
        AuthModal.tsx
        ProtectedRoute.tsx
        AiinsightsChart.tsx      # (May be deprecated; consider removal if unused)
      context/
        AuthContext.tsx          # Auth + profile provider (signup/login/logout/reset)
      hooks/
        useFoodListings.ts       # Real-time listings query & claim action
        useClaims.ts             # Role-based claim history
        useAIPrediction.ts       # Heuristic estimation logic
      lib/
        firebase.ts              # Firebase initialization + lazy analytics/messaging + dev ping
      pages/
        Home.tsx                 # Landing + auth modal trigger + redirect if logged in
        Dashboard.tsx            # Main role-based dashboard UI
        Notfound.tsx             # 404 fallback
```

## Environment Variables
Create `frontend/.env` from `.env.example` and fill in the Firebase Web App config (Project Settings → General → Your Apps → Web). All must be prefixed with `VITE_` to be exposed by Vite:
```
VITE_FIREBASE_API_KEY=... 
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
# Optional (only if using Analytics):
VITE_FIREBASE_MEASUREMENT_ID=...
```
After editing `.env`, stop and restart the dev server (`npm run dev`).

## Installation & Development
From `frontend/` directory:
```powershell
npm install
npm run dev
```
Then open the printed local URL (e.g., http://localhost:5173).

## Build & Preview
```powershell
npm run build
npm run preview
```
The `dist/` folder will contain the production build.

## Firebase Setup Checklist
1. Create Firebase project & add a Web App (no hosting needed yet).
2. Copy config into `.env` (VITE_ keys).
3. Enable **Authentication → Sign-in Method → Email/Password**.
4. (Optional) Add other providers (Google, etc.).
5. Create **Cloud Firestore** in native mode (NOT Datastore mode).
6. Deploy dev rules first while iterating:
   ```bash
   firebase deploy --only firestore:rules
   ```
   (Ensure your CLI is logged in and you have a matching `firebase.json` if you add one; otherwise paste rules manually in console.)
7. Once flows tested, switch to production rules (`firestore.rules.prod`).

## Firestore Collections (Current Usage)
| Collection        | Purpose | Key Fields |
|-------------------|---------|-----------|
| `users`           | Profile & role (donor | recipient) | role, displayName, createdAt |
| `food_items`      | Active donation listings | title, quantity, expiryTime, claimed (boolean), donorId |
| `claims`          | Claim records (donor ↔ recipient) | listingId, donorId, recipientId, status |
| `food_predictions` (planned) | AI prediction persistence | listingId, predictedWindow, confidence |

Notes:
- Some legacy fields like `status` may map to new booleans (`claimed`); hooks bridge them for compatibility.
- Claim lifecycle states (e.g., picked_up, completed) can be added later.

## Auth Flow
- AuthContext wraps app and listens to Firebase Auth state.
- Sign up: creates auth user + profile doc.
- Login: sets context state → Protected routes render Dashboard.
- Logout: Sidebar includes a Logout action which calls a Firebase Callable Function (`logoutUser`) to revoke refresh tokens, then signs out client-side and redirects to `/login`.

## Components Overview
- `Sidebar` & `TopBar`: Layout + navigation shell.
- `HeroCard` / `StatCard`: KPI & hero section visuals.
- `FoodForm`: Submit new donation listing.
- `FoodListingsTable`: Real-time donor or available listings (role-aware).
- `ClaimHistoryTimeline`: Historical claims sequence.
- `AIPredictionWidget`: Suggests predicted freshness window (heuristic placeholder for future ML).
- `AuthModal`: Handles login/sign-up/reset with role selection.
- `ProtectedRoute`: Prevents access to dashboard while unauthenticated.

## Hooks Responsibilities
- `useFoodListings`: Subscribes to listings (filters by role), includes claim creation logic.
- `useClaims`: Fetches claims for either donor (outbound) or recipient (inbound).
- `useAIPrediction`: Provides simple computed prediction; will later persist to Firestore.

## Firebase Initialization (`firebase.ts`)
Features:
- Env resolution for both prefixed/unprefixed (prefixed required in runtime build).
- Firestore initialized with `experimentalAutoDetectLongPolling` to mitigate network proxy issues.
- Lazy-loaded Analytics & Messaging (won't block auth).
- Dev ping after auth to surface Firestore permission problems early.

## Linting & Type Checking
```powershell
npm run lint
npm run build   # includes TypeScript project references build
```

## Potential Improvements / Roadmap
- Persist AI predictions in `food_predictions` collection
- Claim status lifecycle (requested → picked_up → completed)
- Image upload (Firebase Storage) for listings
- Geolocation & distance-based sorting
- Google / OAuth provider sign-in
- Dashboard analytics (aggregations & charts) with caching layer
- Offline support / optimistic UI for claims
- More granular Firestore security rules (least privilege by role)

## Troubleshooting
| Issue | Likely Fix |
|-------|------------|
| Auth spinner forever | Check provider enabled; inspect console for auth errors |
| permission-denied on first Firestore read | Deploy dev rules or verify `/users/{uid}` rule allows owner read |
| Missing env values warning | Ensure VITE_ prefixes and restart dev server |
| Network request failed | Disable ad blockers / allow third-party cookies |
| Analytics never initializes | measurementId not set (optional) |

## Scripts
| Script | Purpose |
|--------|---------|
| `dev` | Start Vite dev server |
| `build` | Type check + production build |
| `preview` | Serve production bundle locally |
| `lint` | Run ESLint over codebase |

## License
(Choose a license – e.g., MIT – and add a LICENSE file if this will be public.)

---
Feel free to request automation (deploy configs, CI workflow, or rule promotion scripts) and they can be added here.
