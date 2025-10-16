# Backend (Firebase Functions + Firestore)

This folder contains the Firebase Cloud Functions used by the app.

## Layout
```
backend/
  functions/
    index.ts          # Cloud Functions source (compiled via tsc to lib/ when built)
    package.json      # Functions dependencies
    tsconfig.json     # TypeScript config (rootDir ".", outDir "lib")
```
Root project contains `firebase.json` and `.firebaserc`.

## Prerequisites
- Node.js 18+
- Firebase CLI installed: `npm install -g firebase-tools`
- Logged in: `firebase login`
- `.firebaserc` has your real project id in place of `YOUR_FIREBASE_PROJECT_ID`.

## Install & Build
```powershell
cd backend/functions
npm install
npm run build   # emits lib/index.js
```

## Deploy Functions
```powershell
# From repo root (has firebase.json)
firebase deploy --only functions:createUserProfile
```

## Emulators (Optional)
```powershell
firebase emulators:start --only functions,firestore
```
Point the frontend to emulators by adding (optional) in a custom init file:
```ts
// Example (not yet wired):
// import { connectFirestoreEmulator } from 'firebase/firestore';
// connectFirestoreEmulator(db, 'localhost', 8080);
// import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
// connectFunctionsEmulator(getFunctions(app), 'localhost', 5001);
```

## Current Functions
| Name | Type | Purpose |
|------|------|---------|
| `createUserProfile` | Callable | Creates user profile doc & seeds sample food item for donors |

## Adding New Functions
1. Add implementation to `index.ts`.
2. Rebuild: `npm run build` (or let deploy compile automatically).
3. Deploy: `firebase deploy --only functions:newFunctionName`.

## Firestore Rules
Configured in root `firebase.json` to deploy from `frontend/firestore.rules.prod`. Use dev rules manually only during iteration.

## Troubleshooting
| Issue | Fix |
|-------|-----|
| Permission denied in function | Ensure caller is authenticated and passing correct uid in data |
| Deploy uses wrong project | Update `.firebaserc` or run `firebase use <project>` |
| Changes not reflected | Re-run build or rely on automatic transpile during deploy |
| Emulator not responding | Check ports (default 5001 for functions, 8080 for Firestore) |

---
Update project id and you are ready to deploy.
