import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function fetchUserProfile(uid?: string) {
  if (!uid) return null;
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) return { uid, ...(snap.data() as any) };
    return null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[fetchUserProfile] failed', e);
    return null;
  }
}
