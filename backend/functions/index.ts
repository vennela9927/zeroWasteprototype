import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * Callable Function: createUserProfile
 * Responsibilities:
 *  - Create a user profile document if it does not exist
 *  - Seed role specific starter structures
 *  - (NEW) If role is donor, create an initial sample food listing in root `food_items` collection
 *    so the frontend immediately sees an example entry.
 *
 * Security:
 *  - Requires the caller to be authenticated
 *  - Caller uid must match provided uid to prevent forging profiles for others
 */
interface CreateUserPayload {
  uid: string;
  name: string;
  email: string;
  role: 'donor' | 'recipient';
}

export const createUserProfile = functions.https.onCall(async (request) => {
  const data = (request?.data || {}) as Partial<CreateUserPayload>;
  const { uid, name, email, role } = data;

  const auth = (request as any).auth || request.auth; // compat safeguard

  // Auth verification
  if (!auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in to create profile');
  }
  if (!uid || !name || !email || !role) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields (uid, name, email, role)');
  }
  if (auth.uid !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'Cannot create profile for a different user');
  }

  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  let createdProfile = false;
  let createdSampleFood = false;
  let sampleFoodId: string | undefined;

  if (!snap.exists) {
    await userRef.set({
      uid,
      name,
      email,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    createdProfile = true;

    // Seed subcollections (kept for possible legacy logic)
    if (role === 'donor') {
      await userRef.collection('food_items').doc('init').set({ initialized: true });
    } else if (role === 'recipient') {
      await userRef.collection('claims').doc('init').set({ initialized: true });
    }
  }

  // NEW: create a starter food listing for donors (only once per donor)
  if (role === 'donor') {
    // Check if this donor already has at least one real food listing
    const existing = await db.collection('food_items')
      .where('donorId', '==', uid)
      .limit(1)
      .get();
    if (existing.empty) {
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h
      const docRef = await db.collection('food_items').add({
        foodName: 'Sample Donation Item',
        name: 'Sample Donation Item', // legacy display fallback
        description: 'Replace or edit this listing with real donation details.',
        quantity: 1,
        unit: 'item',
        donorId: uid,
        donorName: name,
        claimed: false,
        status: 'available',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiryTime: admin.firestore.Timestamp.fromDate(expiry),
        expiry: admin.firestore.Timestamp.fromDate(expiry)
      });
      createdSampleFood = true;
      sampleFoodId = docRef.id;
    }
  }

  return { success: true, createdProfile, createdSampleFood, sampleFoodId };
});
