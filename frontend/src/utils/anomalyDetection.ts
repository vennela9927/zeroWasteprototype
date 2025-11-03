import { db, ts } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, setDoc, orderBy, limit as firestoreLimit } from 'firebase/firestore';

/**
 * AI Anomaly Detection System
 * 
 * Detects suspicious patterns and potential fraud:
 * - High cancellation rates
 * - Suspicious timing patterns
 * - Multiple rejections
 * - Location inconsistencies
 * - Account churning
 * 
 * Risk Score: 0-100 (higher = more suspicious)
 */

export interface AnomalyScore {
  userId: string;
  userRole: 'donor' | 'recipient';
  riskScore: number; // 0-100
  flags: {
    highCancellationRate: boolean;
    suspiciousTiming: boolean;
    multipleRejections: boolean;
    locationInconsistency: boolean;
    accountChurning: boolean;
    rapidCreationDeletion: boolean;
  };
  violations: {
    type: string;
    severity: 'low' | 'medium' | 'high';
    detectedAt: any;
    description: string;
  }[];
  status: 'safe' | 'warning' | 'suspicious' | 'blocked';
  lastUpdated: any;
  lastAnalyzed: any;
}

const ANOMALY_COLLECTION = 'anomaly_scores';
const ANALYSIS_WINDOW_DAYS = 30; // Analyze last 30 days

/**
 * Calculate risk score for a user
 */
export async function calculateRiskScore(userId: string, userRole: 'donor' | 'recipient'): Promise<AnomalyScore> {
  let riskScore = 0;
  const flags = {
    highCancellationRate: false,
    suspiciousTiming: false,
    multipleRejections: false,
    locationInconsistency: false,
    accountChurning: false,
    rapidCreationDeletion: false,
  };
  const violations: AnomalyScore['violations'] = [];

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - ANALYSIS_WINDOW_DAYS);

  try {
    if (userRole === 'donor') {
      // Analyze donor patterns
      const donorAnalysis = await analyzeDonorPatterns(userId, windowStart);
      riskScore += donorAnalysis.score;
      Object.assign(flags, donorAnalysis.flags);
      violations.push(...donorAnalysis.violations);
    } else {
      // Analyze NGO patterns
      const ngoAnalysis = await analyzeNGOPatterns(userId, windowStart);
      riskScore += ngoAnalysis.score;
      Object.assign(flags, ngoAnalysis.flags);
      violations.push(...ngoAnalysis.violations);
    }

    // Common patterns (both roles)
    const commonAnalysis = await analyzeCommonPatterns(userId, windowStart);
    riskScore += commonAnalysis.score;
    Object.assign(flags, commonAnalysis.flags);
    violations.push(...commonAnalysis.violations);

    // Cap risk score at 100
    riskScore = Math.min(100, riskScore);

    // Determine status
    let status: AnomalyScore['status'] = 'safe';
    if (riskScore >= 70) status = 'blocked';
    else if (riskScore >= 50) status = 'suspicious';
    else if (riskScore >= 30) status = 'warning';

    const anomalyScore: AnomalyScore = {
      userId,
      userRole,
      riskScore,
      flags,
      violations,
      status,
      lastUpdated: ts(),
      lastAnalyzed: ts(),
    };

    // Save to Firestore
    await setDoc(doc(db, ANOMALY_COLLECTION, userId), anomalyScore);

    return anomalyScore;
  } catch (error) {
    console.error('Failed to calculate risk score:', error);
    throw error;
  }
}

/**
 * Analyze donor-specific patterns
 */
async function analyzeDonorPatterns(donorId: string, windowStart: Date) {
  let score = 0;
  const flags: any = {};
  const violations: any[] = [];

  // Get donor's food items
  const foodItemsQuery = query(
    collection(db, 'food_items'),
    where('donorId', '==', donorId),
    where('createdAt', '>=', windowStart),
    orderBy('createdAt', 'desc')
  );
  const foodItems = await getDocs(foodItemsQuery);
  const items = foodItems.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (items.length === 0) return { score, flags, violations };

  // 1. High cancellation rate
  const cancelledCount = items.filter(item => item.status === 'cancelled').length;
  const cancellationRate = cancelledCount / items.length;
  
  if (cancellationRate > 0.5) {
    flags.highCancellationRate = true;
    score += 25;
    violations.push({
      type: 'high_cancellation_rate',
      severity: 'high' as const,
      detectedAt: ts(),
      description: `${(cancellationRate * 100).toFixed(0)}% cancellation rate (${cancelledCount}/${items.length})`,
    });
  } else if (cancellationRate > 0.3) {
    flags.highCancellationRate = true;
    score += 15;
    violations.push({
      type: 'elevated_cancellation_rate',
      severity: 'medium' as const,
      detectedAt: ts(),
      description: `${(cancellationRate * 100).toFixed(0)}% cancellation rate`,
    });
  }

  // 2. Rapid creation-deletion pattern
  const createdThenCancelled = items.filter(item => {
    if (item.status !== 'cancelled') return false;
    const created = item.createdAt?.toDate?.();
    const cancelled = item.cancelledAt?.toDate?.();
    if (!created || !cancelled) return false;
    const diffMinutes = (cancelled.getTime() - created.getTime()) / (1000 * 60);
    return diffMinutes < 30; // Created and cancelled within 30 minutes
  });

  if (createdThenCancelled.length >= 3) {
    flags.rapidCreationDeletion = true;
    score += 20;
    violations.push({
      type: 'rapid_creation_deletion',
      severity: 'high' as const,
      detectedAt: ts(),
      description: `${createdThenCancelled.length} items created and cancelled within 30 minutes`,
    });
  }

  // 3. Suspicious timing (all donations at odd hours)
  const oddHourDonations = items.filter(item => {
    const created = item.createdAt?.toDate?.();
    if (!created) return false;
    const hour = created.getHours();
    return hour < 6 || hour > 23; // Between midnight and 6am
  });

  if (oddHourDonations.length > items.length * 0.7) {
    flags.suspiciousTiming = true;
    score += 10;
    violations.push({
      type: 'suspicious_timing',
      severity: 'low' as const,
      detectedAt: ts(),
      description: `${oddHourDonations.length} donations created during odd hours (midnight-6am)`,
    });
  }

  return { score, flags, violations };
}

/**
 * Analyze NGO-specific patterns
 */
async function analyzeNGOPatterns(ngoId: string, windowStart: Date) {
  let score = 0;
  const flags: any = {};
  const violations: any[] = [];

  // Get NGO's claims
  const claimsQuery = query(
    collection(db, 'claims'),
    where('recipientId', '==', ngoId),
    where('createdAt', '>=', windowStart),
    orderBy('createdAt', 'desc')
  );
  const claimsSnapshot = await getDocs(claimsQuery);
  const claims = claimsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (claims.length === 0) return { score, flags, violations };

  // 1. High rejection rate (by donors)
  const rejectedCount = claims.filter(claim => claim.status === 'rejected').length;
  const rejectionRate = rejectedCount / claims.length;

  if (rejectionRate > 0.4) {
    flags.multipleRejections = true;
    score += 20;
    violations.push({
      type: 'high_rejection_rate',
      severity: 'high' as const,
      detectedAt: ts(),
      description: `${(rejectionRate * 100).toFixed(0)}% of claims rejected by donors`,
    });
  } else if (rejectionRate > 0.25) {
    flags.multipleRejections = true;
    score += 10;
    violations.push({
      type: 'elevated_rejection_rate',
      severity: 'medium' as const,
      detectedAt: ts(),
      description: `${(rejectionRate * 100).toFixed(0)}% of claims rejected`,
    });
  }

  // 2. Multiple claims for same donation
  const foodItemIds = claims.map(c => c.foodItemId);
  const duplicateClaims = foodItemIds.filter((id, index) => foodItemIds.indexOf(id) !== index);
  
  if (duplicateClaims.length > 0) {
    flags.accountChurning = true;
    score += 15;
    violations.push({
      type: 'duplicate_claims',
      severity: 'medium' as const,
      detectedAt: ts(),
      description: `Attempted to claim same donation multiple times (${duplicateClaims.length} instances)`,
    });
  }

  return { score, flags, violations };
}

/**
 * Analyze common patterns (both roles)
 */
async function analyzeCommonPatterns(userId: string, windowStart: Date) {
  let score = 0;
  const flags: any = {};
  const violations: any[] = [];

  // Get user profile
  const userDoc = await getDoc(doc(db, 'users', userId));
  const userData = userDoc.data();

  if (!userData) return { score, flags, violations };

  // 1. Location inconsistency (if user has multiple addresses)
  // This is a placeholder - would need historical location data
  
  // 2. Account churning (newly created account with high activity)
  const accountAge = userData.createdAt?.toDate?.();
  if (accountAge) {
    const daysSinceCreation = (Date.now() - accountAge.getTime()) / (1000 * 60 * 60 * 24);
    
    // Get activity count
    let activityCount = 0;
    if (userData.role === 'donor') {
      const itemsQuery = query(
        collection(db, 'food_items'),
        where('donorId', '==', userId)
      );
      const itemsSnapshot = await getDocs(itemsQuery);
      activityCount = itemsSnapshot.size;
    } else {
      const claimsQuery = query(
        collection(db, 'claims'),
        where('recipientId', '==', userId)
      );
      const claimsSnapshot = await getDocs(claimsQuery);
      activityCount = claimsSnapshot.size;
    }

    // New account (< 7 days) with high activity (> 20 actions)
    if (daysSinceCreation < 7 && activityCount > 20) {
      flags.accountChurning = true;
      score += 15;
      violations.push({
        type: 'new_account_high_activity',
        severity: 'medium' as const,
        detectedAt: ts(),
        description: `Account ${daysSinceCreation.toFixed(0)} days old with ${activityCount} actions`,
      });
    }
  }

  return { score, flags, violations };
}

/**
 * Get anomaly score for a user
 */
export async function getAnomalyScore(userId: string): Promise<AnomalyScore | null> {
  try {
    const anomalyDoc = await getDoc(doc(db, ANOMALY_COLLECTION, userId));
    if (anomalyDoc.exists()) {
      return anomalyDoc.data() as AnomalyScore;
    }
    return null;
  } catch (error) {
    console.error('Failed to get anomaly score:', error);
    return null;
  }
}

/**
 * Auto-analyze all users (run periodically via Cloud Function)
 */
export async function analyzeAllUsers(): Promise<{
  analyzed: number;
  blocked: number;
  suspicious: number;
  warnings: number;
}> {
  const stats = {
    analyzed: 0,
    blocked: 0,
    suspicious: 0,
    warnings: 0,
  };

  try {
    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const userRole = userData.role === 'recipient' ? 'recipient' : 'donor';

      const anomalyScore = await calculateRiskScore(userId, userRole);
      stats.analyzed++;

      if (anomalyScore.status === 'blocked') {
        stats.blocked++;
        // Auto-block user (update user document)
        await updateDoc(doc(db, 'users', userId), {
          accountStatus: 'blocked',
          blockedReason: 'Automatic fraud detection',
          blockedAt: ts(),
        });
      } else if (anomalyScore.status === 'suspicious') {
        stats.suspicious++;
      } else if (anomalyScore.status === 'warning') {
        stats.warnings++;
      }
    }

    return stats;
  } catch (error) {
    console.error('Failed to analyze all users:', error);
    return stats;
  }
}

/**
 * Check if user is blocked
 */
export async function isUserBlocked(userId: string): Promise<boolean> {
  try {
    const anomalyScore = await getAnomalyScore(userId);
    if (!anomalyScore) return false;
    return anomalyScore.status === 'blocked';
  } catch (error) {
    console.error('Failed to check if user is blocked:', error);
    return false;
  }
}

/**
 * Manually review and update anomaly status (admin function)
 */
export async function updateAnomalyStatus(
  userId: string,
  status: AnomalyScore['status'],
  adminNotes?: string
): Promise<void> {
  try {
    await updateDoc(doc(db, ANOMALY_COLLECTION, userId), {
      status,
      manualReview: true,
      reviewedAt: ts(),
      adminNotes,
    });

    // Update user account status
    if (status === 'blocked') {
      await updateDoc(doc(db, 'users', userId), {
        accountStatus: 'blocked',
        blockedReason: adminNotes || 'Manual review',
        blockedAt: ts(),
      });
    } else {
      await updateDoc(doc(db, 'users', userId), {
        accountStatus: 'active',
        unblockedAt: ts(),
      });
    }
  } catch (error) {
    console.error('Failed to update anomaly status:', error);
    throw error;
  }
}

