"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutUser = exports.createUserProfile = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
exports.createUserProfile = functions.https.onCall(async (request) => {
    const data = (request?.data || {});
    const { uid, name, email, role } = data;
    const auth = request.auth;
    // ...existing code...
});
exports.logoutUser = functions.https.onCall(async (request) => {
    const auth = request.auth;
    if (!auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be signed in to logout');
    }
    const uid = auth.uid;
    // ...existing code...
});