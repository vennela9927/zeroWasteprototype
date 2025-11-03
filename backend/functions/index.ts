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

/**
 * Callable Function: triggerAIMatching
 * Responsibilities:
 *  - Score and rank NGOs based on proximity, expiry urgency, capacity, reliability
 *  - Notify top-matched NGOs
 *  - Return matched NGO list
 * 
 * Matching Algorithm:
 *  - Location Score: Haversine distance (closer = higher score)
 *  - Expiry Score: Hours to expiry (urgent = higher score)
 *  - Capacity Score: NGO can handle quantity
 *  - Reliability Score: Historical claim fulfillment rate
 */
interface TriggerAIMatchingPayload {
  foodName: string;
  foodType: string;
  quantity: number;
  latitude?: number;
  longitude?: number;
  hoursToExpiry: number;
  listingId?: string;
}

export const triggerAIMatching = functions.https.onCall(async (request) => {
  const data = (request?.data || {}) as Partial<TriggerAIMatchingPayload>;
  const auth = request.auth;

  if (!auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }

  const { foodName, foodType, quantity, latitude, longitude, hoursToExpiry } = data;

  if (!foodName || !quantity) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  try {
    // Fetch all NGOs (recipients)
    const ngosSnapshot = await db.collection('users')
      .where('role', '==', 'recipient')
      .get();

    if (ngosSnapshot.empty) {
      return { success: true, matchedNGOs: [], message: 'No NGOs available' };
    }

    const scores: Array<{ ngoId: string; ngoName: string; score: number; breakdown: any }> = [];

    for (const ngoDoc of ngosSnapshot.docs) {
      const ngo = ngoDoc.data();
      let score = 0;
      const breakdown: any = {};

      // 1. Location Score (0-40 points)
      if (latitude && longitude && ngo.latitude && ngo.longitude) {
        const distance = haversineDistance(
          latitude, longitude,
          ngo.latitude, ngo.longitude
        );
        // Closer = higher score; max 40 points for <1km, 0 points for >20km
        const locationScore = Math.max(0, 40 * (1 - Math.min(distance / 20, 1)));
        score += locationScore;
        breakdown.locationScore = Math.round(locationScore);
        breakdown.distanceKm = Math.round(distance * 10) / 10;
      }

      // 2. Expiry Urgency Score (0-30 points)
      // More urgent = higher score
      if (hoursToExpiry <= 2) {
        score += 30;
        breakdown.expiryScore = 30;
      } else if (hoursToExpiry <= 6) {
        score += 20;
        breakdown.expiryScore = 20;
      } else if (hoursToExpiry <= 24) {
        score += 10;
        breakdown.expiryScore = 10;
      } else {
        breakdown.expiryScore = 0;
      }

      // 3. Capacity Score (0-15 points)
      // NGO can handle the quantity based on pickupRadiusKm or volunteersCount
      const capacity = ngo.pickupRadiusKm || 10;
      const canHandle = capacity >= (quantity / 10); // rough heuristic
      if (canHandle) {
        score += 15;
        breakdown.capacityScore = 15;
      } else {
        breakdown.capacityScore = 0;
      }

      // 4. Reliability Score (0-15 points)
      // Based on historical claim fulfillment rate
      const claimsSnapshot = await db.collection('claims')
        .where('recipientId', '==', ngoDoc.id)
        .limit(20)
        .get();

      if (!claimsSnapshot.empty) {
        const totalClaims = claimsSnapshot.size;
        const fulfilledClaims = claimsSnapshot.docs.filter(
          c => c.data().status === 'fulfilled' || c.data().status === 'approved'
        ).length;
        const fulfillmentRate = fulfilledClaims / totalClaims;
        const reliabilityScore = fulfillmentRate * 15;
        score += reliabilityScore;
        breakdown.reliabilityScore = Math.round(reliabilityScore);
      } else {
        // New NGO: give benefit of doubt (10 points)
        score += 10;
        breakdown.reliabilityScore = 10;
      }

      scores.push({
        ngoId: ngoDoc.id,
        ngoName: ngo.name || 'NGO',
        score: Math.round(score),
        breakdown
      });
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Top 5 matches
    const topMatches = scores.slice(0, 5);

    // TODO: Send notifications to top-matched NGOs (email/push)
    // For now, just log
    console.log('[AI Matching] Top matches:', topMatches);

    return {
      success: true,
      matchedNGOs: topMatches,
      totalNGOs: scores.length
    };
  } catch (error) {
    console.error('[AI Matching] Error:', error);
    throw new functions.https.HttpsError('internal', 'Matching failed');
  }
});

// Haversine distance formula (km)
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}