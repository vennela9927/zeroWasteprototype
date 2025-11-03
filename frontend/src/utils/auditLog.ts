import { db, ts } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import CryptoJS from 'crypto-js';

/**
 * Blockchain-Style Immutable Audit Logging System
 * 
 * Features:
 * - SHA-256 hash chaining (each log references previous hash)
 * - Immutable record of all food donation transactions
 * - GPS coordinates logged for each event
 * - Verification mechanism for audit trail integrity
 * 
 * Event Types:
 * - created: Food donation created
 * - claimed: NGO requests donation
 * - approved: Donor approves NGO request
 * - picked_up: Driver scans QR at pickup
 * - delivered: NGO scans QR at delivery
 * - cancelled: Donation cancelled
 * - discarded: Food discarded
 */

export interface AuditLogEntry {
  logId: string;
  foodItemId: string;
  eventType: 'created' | 'claimed' | 'approved' | 'picked_up' | 'delivered' | 'cancelled' | 'discarded';
  timestamp: any;
  actorId: string; // User who triggered the event
  actorName?: string;
  actorRole?: 'donor' | 'recipient' | 'driver';
  location?: {
    lat: number;
    lng: number;
  };
  metadata?: Record<string, any>; // Additional event-specific data
  previousHash: string;
  currentHash: string;
  verified: boolean;
}

const AUDIT_COLLECTION = 'audit_logs';
const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Calculate SHA-256 hash for audit log entry
 */
export function calculateHash(data: Omit<AuditLogEntry, 'currentHash'>): string {
  const dataString = JSON.stringify({
    logId: data.logId,
    foodItemId: data.foodItemId,
    eventType: data.eventType,
    timestamp: data.timestamp,
    actorId: data.actorId,
    previousHash: data.previousHash,
  });
  
  return CryptoJS.SHA256(dataString).toString();
}

/**
 * Get the latest audit log entry for chaining
 */
async function getLatestAuditLog(foodItemId: string): Promise<AuditLogEntry | null> {
  try {
    const q = query(
      collection(db, AUDIT_COLLECTION),
      where('foodItemId', '==', foodItemId),
      orderBy('timestamp', 'desc'),
      firestoreLimit(1)
    );
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as AuditLogEntry;
    }
    return null;
  } catch (error) {
    console.error('Failed to get latest audit log:', error);
    return null;
  }
}

/**
 * Create an immutable audit log entry
 */
export async function createAuditLog(params: {
  foodItemId: string;
  eventType: AuditLogEntry['eventType'];
  actorId: string;
  actorName?: string;
  actorRole?: 'donor' | 'recipient' | 'driver';
  location?: { lat: number; lng: number };
  metadata?: Record<string, any>;
}): Promise<AuditLogEntry> {
  try {
    // Get previous log for hash chaining
    const previousLog = await getLatestAuditLog(params.foodItemId);
    const previousHash = previousLog?.currentHash || GENESIS_HASH;

    // Generate unique log ID
    const logId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create log entry
    const logEntry: Omit<AuditLogEntry, 'currentHash'> = {
      logId,
      foodItemId: params.foodItemId,
      eventType: params.eventType,
      timestamp: ts(),
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      location: params.location,
      metadata: params.metadata,
      previousHash,
      verified: true,
    };

    // Calculate current hash
    const currentHash = calculateHash(logEntry);

    // Complete log entry with hash
    const completeLogEntry: AuditLogEntry = {
      ...logEntry,
      currentHash,
    };

    // Save to Firestore
    await setDoc(doc(db, AUDIT_COLLECTION, logId), completeLogEntry);

    console.log(`✅ Audit log created: ${eventType} for ${params.foodItemId}`);
    return completeLogEntry;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    throw error;
  }
}

/**
 * Verify the integrity of an audit trail
 * 
 * Checks that:
 * 1. Each log's currentHash matches calculated hash
 * 2. Each log's previousHash matches previous log's currentHash
 */
export async function verifyAuditTrail(foodItemId: string): Promise<{
  valid: boolean;
  errors: string[];
}> {
  try {
    const q = query(
      collection(db, AUDIT_COLLECTION),
      where('foodItemId', '==', foodItemId),
      orderBy('timestamp', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(doc => doc.data() as AuditLogEntry);

    if (logs.length === 0) {
      return { valid: true, errors: [] };
    }

    const errors: string[] = [];

    // Verify first log starts with genesis hash
    if (logs[0].previousHash !== GENESIS_HASH) {
      errors.push('First log does not reference genesis hash');
    }

    // Verify each log's hash and chain
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];

      // Verify hash calculation
      const calculatedHash = calculateHash({
        logId: log.logId,
        foodItemId: log.foodItemId,
        eventType: log.eventType,
        timestamp: log.timestamp,
        actorId: log.actorId,
        actorName: log.actorName,
        actorRole: log.actorRole,
        location: log.location,
        metadata: log.metadata,
        previousHash: log.previousHash,
        verified: log.verified,
      });

      if (calculatedHash !== log.currentHash) {
        errors.push(`Log ${log.logId}: Hash mismatch`);
      }

      // Verify chain (except for first log)
      if (i > 0) {
        const previousLog = logs[i - 1];
        if (log.previousHash !== previousLog.currentHash) {
          errors.push(`Log ${log.logId}: Chain broken`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  } catch (error) {
    console.error('Failed to verify audit trail:', error);
    return {
      valid: false,
      errors: ['Verification failed: ' + (error as Error).message],
    };
  }
}

/**
 * Get complete audit trail for a food item
 */
export async function getAuditTrail(foodItemId: string): Promise<AuditLogEntry[]> {
  try {
    const q = query(
      collection(db, AUDIT_COLLECTION),
      where('foodItemId', '==', foodItemId),
      orderBy('timestamp', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as AuditLogEntry);
  } catch (error) {
    console.error('Failed to get audit trail:', error);
    return [];
  }
}

/**
 * Get user's current GPS coordinates (for logging)
 */
export async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('Failed to get location:', error);
        resolve(null);
      },
      {
        timeout: 5000,
        enableHighAccuracy: false,
      }
    );
  });
}

/**
 * Convenience wrapper to log food creation
 */
export async function logFoodCreated(
  foodItemId: string,
  donorId: string,
  donorName: string,
  metadata?: Record<string, any>
) {
  const location = await getCurrentLocation();
  return createAuditLog({
    foodItemId,
    eventType: 'created',
    actorId: donorId,
    actorName: donorName,
    actorRole: 'donor',
    location: location || undefined,
    metadata,
  });
}

/**
 * Convenience wrapper to log food claimed by NGO
 */
export async function logFoodClaimed(
  foodItemId: string,
  ngoId: string,
  ngoName: string,
  metadata?: Record<string, any>
) {
  const location = await getCurrentLocation();
  return createAuditLog({
    foodItemId,
    eventType: 'claimed',
    actorId: ngoId,
    actorName: ngoName,
    actorRole: 'recipient',
    location: location || undefined,
    metadata,
  });
}

/**
 * Convenience wrapper to log food pickup (QR scan)
 */
export async function logFoodPickedUp(
  foodItemId: string,
  driverId: string,
  driverName: string,
  metadata?: Record<string, any>
) {
  const location = await getCurrentLocation();
  return createAuditLog({
    foodItemId,
    eventType: 'picked_up',
    actorId: driverId,
    actorName: driverName,
    actorRole: 'driver',
    location: location || undefined,
    metadata,
  });
}

/**
 * Convenience wrapper to log food delivery (QR scan)
 */
export async function logFoodDelivered(
  foodItemId: string,
  ngoId: string,
  ngoName: string,
  metadata?: Record<string, any>
) {
  const location = await getCurrentLocation();
  return createAuditLog({
    foodItemId,
    eventType: 'delivered',
    actorId: ngoId,
    actorName: ngoName,
    actorRole: 'recipient',
    location: location || undefined,
    metadata,
  });
}

