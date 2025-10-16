"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserProfile = void 0;
exports.logoutUser = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
exports.createUserProfile = functions.https.onCall(async (request) => {
    const data = (request?.data || {});
    const { uid, name, email, role } = data;
    const auth = request.auth; // removed redundant fallback
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
    let sampleFoodId;
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
        }
        else if (role === 'recipient') {
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
// New: logout callable to revoke refresh tokens for the current user
exports.logoutUser = functions.https.onCall(async (request) => {
    const auth = request.auth; // removed redundant fallback
    if (!auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be signed in to logout');
    }
    const uid = auth.uid;

    // Revoke all refresh tokens for the user (forces re-auth on next refresh)
    await admin.auth().revokeRefreshTokens(uid);

    // Optional: return when tokens became invalid
    const userRecord = await admin.auth().getUser(uid);
    const revokedAt = userRecord.tokensValidAfterTime; // ISO string

    return { success: true, revokedAt };
});
