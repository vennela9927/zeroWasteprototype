// firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, serverTimestamp, doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';

// Helper to read Vite environment variables
function pick(key: string): string | undefined {
  return (import.meta as any).env[key];
}

// Firebase config
const firebaseConfig = {
  apiKey: pick('VITE_FIREBASE_API_KEY')!,
  authDomain: pick('VITE_FIREBASE_AUTH_DOMAIN')!,
  projectId: pick('VITE_FIREBASE_PROJECT_ID')!,
  storageBucket: pick('VITE_FIREBASE_STORAGE_BUCKET')!,
  messagingSenderId: pick('VITE_FIREBASE_MESSAGING_SENDER_ID')!,
  appId: pick('VITE_FIREBASE_APP_ID')!,
  measurementId: pick('VITE_FIREBASE_MEASUREMENT_ID'), // optional
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Dev-time diagnostics: expose app/db & projectId for quick console inspection
if ((import.meta as any).env?.DEV) {
  // eslint-disable-next-line no-console
  console.log('[debug][firebase] projectId:', firebaseConfig.projectId);
  (window as any).__FIREBASE_APP__ = app;
}
export const auth = getAuth(app);
export const db = getFirestore(app);

// Server timestamp helper
export const ts = () => serverTimestamp();

// Auth state listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('User signed in:', user.uid, user.email);
    try {
      const ref = doc(db, 'users', user.uid);
      const snapshot = await getDoc(ref);
      console.log('User doc exists:', snapshot.exists());
    } catch (e) {
      console.warn('Firestore ping failed:', e);
    }
  } else {
    console.log('No user signed in');
  }
});

// Development helper: list claims for a donor (or current user if donorId omitted)
if ((import.meta as any).env?.DEV) {
  (window as any).listClaimsForDonor = async (donorId?: string) => {
    try {
      const current = auth.currentUser;
      const effectiveDonor = donorId || current?.uid;
      if (!effectiveDonor) {
        console.warn('[debug] No donorId provided and no current user.');
        return [];
      }
      const q = query(
        collection(db, 'claims'),
        where('donorId', '==', effectiveDonor),
        orderBy('requestedAt', 'desc')
      );
      const snap = await getDocs(q);
  const rows: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.table(rows.map(r => ({ id: r.id, status: r.status, foodName: r.foodName, recipientId: r.recipientId, requestedAt: r.requestedAt })));
      return rows;
    } catch (e: any) {
      console.error('[debug] listClaimsForDonor failed', e);
      return [];
    }
  };
  console.log('[debug] window.listClaimsForDonor(donorId?) helper attached');
}
