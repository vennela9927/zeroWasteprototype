// firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, serverTimestamp, doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';

// Firebase config (hardcoded to ensure production build has correct values)
const firebaseConfig = {
  apiKey: "AIzaSyDu5fj7ch0LInzSfgplN53M_nwswwtZHGQ",
  authDomain: "zerowaste-677fd.firebaseapp.com",
  projectId: "zerowaste-677fd",
  storageBucket: "zerowaste-677fd.appspot.com",
  messagingSenderId: "36277658933",
  appId: "1:36277658933:web:93f78c646c80c54683d87c",
  measurementId: "G-66VDT5R89R"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Diagnostics: log minimal config details (safe)
try {
  // eslint-disable-next-line no-console
  console.log('[firebase-config]', {
    projectId: (firebaseConfig as any).projectId,
    authDomain: (firebaseConfig as any).authDomain,
    apiKeyPrefix: ((firebaseConfig as any).apiKey || '').slice(0, 8)
  });
  (window as any).__FIREBASE_APP__ = app;
} catch {}
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
