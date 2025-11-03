/**
 * AI Learning System for Smart Matching
 * 
 * Implements feedback-based learning to improve match recommendations over time.
 * 
 * Features:
 * 1. Tracks NGO acceptance/rejection patterns
 * 2. Adjusts match scores based on historical feedback
 * 3. Learns donor preferences for each NGO
 * 4. Rule-based recommender for MVP (upgradeable to gradient boosting)
 * 
 * Learning Process:
 * - ✅ Accept/Claim → Increases weight for similar patterns
 * - ❌ Reject/Ignore → Decreases weight for similar patterns
 */

import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FeedbackEvent {
  ngoId: string;
  donationId: string;
  donorId: string;
  action: 'accepted' | 'rejected' | 'ignored';
  matchScore: number;
  timestamp: any;
  
  // Pattern features (for learning)
  foodType: string;
  quantity: number;
  distanceKm?: number;
  expiryHours: number;
  verified: boolean;
  freshnessPercent?: number;
}

export interface NGOLearningProfile {
  ngoId: string;
  totalAccepts: number;
  totalRejects: number;
  acceptanceRate: number;
  
  // Learned preferences
  preferredDonors: string[]; // Donor IDs with high acceptance
  avoidedDonors: string[]; // Donor IDs with high rejection
  avgAcceptedDistance: number;
  avgAcceptedQuantity: number;
  avgAcceptedFreshness: number;
  
  // Pattern weights (learned adjustments)
  distanceBoost: number; // -0.1 to +0.1
  quantityBoost: number; // -0.1 to +0.1
  freshnessBoost: number; // -0.1 to +0.1
  verifiedBoost: number; // -0.1 to +0.1
  
  lastUpdated: any;
}

export interface DonorReputation {
  donorId: string;
  totalClaims: number;
  acceptanceRate: number; // % of donations that get claimed
  avgMatchScore: number;
  preferredByNGOs: string[]; // NGO IDs that frequently claim from this donor
  reputation: 'excellent' | 'good' | 'average' | 'new';
}

// ============================================================================
// FEEDBACK TRACKING
// ============================================================================

/**
 * Log NGO feedback when they accept/reject a donation
 */
export async function logFeedback(event: FeedbackEvent): Promise<void> {
  try {
    await addDoc(collection(db, 'ai_feedback'), {
      ...event,
      timestamp: new Date(),
      createdAt: new Date(),
    });
    
    console.log('[AI Learning] Feedback logged:', event.action, event.donationId);
  } catch (error) {
    console.error('[AI Learning] Failed to log feedback:', error);
  }
}

/**
 * Log when NGO accepts/claims a donation
 */
export async function logAccept(
  ngoId: string,
  donationId: string,
  donorId: string,
  matchScore: number,
  features: {
    foodType: string;
    quantity: number;
    distanceKm?: number;
    expiryHours: number;
    verified: boolean;
    freshnessPercent?: number;
  }
): Promise<void> {
  return logFeedback({
    ngoId,
    donationId,
    donorId,
    action: 'accepted',
    matchScore,
    timestamp: new Date(),
    ...features,
  });
}

/**
 * Log when NGO rejects a donation (clicks "Not Interested" or similar)
 */
export async function logReject(
  ngoId: string,
  donationId: string,
  donorId: string,
  matchScore: number,
  features: {
    foodType: string;
    quantity: number;
    distanceKm?: number;
    expiryHours: number;
    verified: boolean;
    freshnessPercent?: number;
  }
): Promise<void> {
  return logFeedback({
    ngoId,
    donationId,
    donorId,
    action: 'rejected',
    matchScore,
    timestamp: new Date(),
    ...features,
  });
}

// ============================================================================
// PATTERN LEARNING
// ============================================================================

/**
 * Build NGO learning profile from historical feedback
 * Analyzes past accepts/rejects to learn preferences
 */
export async function buildNGOLearningProfile(ngoId: string): Promise<NGOLearningProfile> {
  try {
    // Fetch recent feedback (last 100 events)
    const q = query(
      collection(db, 'ai_feedback'),
      where('ngoId', '==', ngoId),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    
    const snapshot = await getDocs(q);
    const feedback = snapshot.docs.map(doc => doc.data() as FeedbackEvent);
    
    if (feedback.length === 0) {
      // New NGO, return default profile
      return {
        ngoId,
        totalAccepts: 0,
        totalRejects: 0,
        acceptanceRate: 0.5,
        preferredDonors: [],
        avoidedDonors: [],
        avgAcceptedDistance: 10,
        avgAcceptedQuantity: 50,
        avgAcceptedFreshness: 0.7,
        distanceBoost: 0,
        quantityBoost: 0,
        freshnessBoost: 0,
        verifiedBoost: 0,
        lastUpdated: new Date(),
      };
    }
    
    // Separate accepts and rejects
    const accepts = feedback.filter(f => f.action === 'accepted');
    const rejects = feedback.filter(f => f.action === 'rejected');
    
    const totalAccepts = accepts.length;
    const totalRejects = rejects.length;
    const acceptanceRate = totalAccepts / (totalAccepts + totalRejects);
    
    // Learn preferred donors (high acceptance rate)
    const donorAccepts: Record<string, number> = {};
    const donorRejects: Record<string, number> = {};
    
    accepts.forEach(f => {
      donorAccepts[f.donorId] = (donorAccepts[f.donorId] || 0) + 1;
    });
    
    rejects.forEach(f => {
      donorRejects[f.donorId] = (donorRejects[f.donorId] || 0) + 1;
    });
    
    const preferredDonors = Object.entries(donorAccepts)
      .filter(([donorId, count]) => {
        const rejectCount = donorRejects[donorId] || 0;
        const rate = count / (count + rejectCount);
        return rate >= 0.7 && count >= 2; // At least 70% acceptance, 2+ donations
      })
      .map(([donorId]) => donorId);
    
    const avoidedDonors = Object.entries(donorRejects)
      .filter(([donorId, count]) => {
        const acceptCount = donorAccepts[donorId] || 0;
        const rate = count / (count + acceptCount);
        return rate >= 0.7 && count >= 2; // At least 70% rejection, 2+ donations
      })
      .map(([donorId]) => donorId);
    
    // Calculate average accepted features
    const avgAcceptedDistance = accepts
      .filter(f => f.distanceKm !== undefined)
      .reduce((sum, f) => sum + (f.distanceKm || 0), 0) / accepts.length || 10;
    
    const avgAcceptedQuantity = accepts
      .reduce((sum, f) => sum + f.quantity, 0) / accepts.length || 50;
    
    const avgAcceptedFreshness = accepts
      .filter(f => f.freshnessPercent !== undefined)
      .reduce((sum, f) => sum + (f.freshnessPercent || 0), 0) / accepts.length || 0.7;
    
    // Calculate pattern boosts (compare accepts vs rejects)
    const avgRejectedDistance = rejects
      .filter(f => f.distanceKm !== undefined)
      .reduce((sum, f) => sum + (f.distanceKm || 0), 0) / rejects.length || 20;
    
    const avgRejectedQuantity = rejects
      .reduce((sum, f) => sum + f.quantity, 0) / rejects.length || 100;
    
    const avgRejectedFreshness = rejects
      .filter(f => f.freshnessPercent !== undefined)
      .reduce((sum, f) => sum + (f.freshnessPercent || 0), 0) / rejects.length || 0.5;
    
    // Calculate boosts (-0.1 to +0.1 range)
    // If accepted donations are closer, boost distance importance
    const distanceBoost = Math.max(-0.1, Math.min(0.1, 
      (avgRejectedDistance - avgAcceptedDistance) / 50 * 0.1
    ));
    
    // If accepted donations are smaller, prefer smaller quantities
    const quantityBoost = Math.max(-0.1, Math.min(0.1,
      (avgRejectedQuantity - avgAcceptedQuantity) / 100 * 0.1
    ));
    
    // If accepted donations are fresher, boost freshness importance
    const freshnessBoost = Math.max(-0.1, Math.min(0.1,
      (avgAcceptedFreshness - avgRejectedFreshness) * 0.2
    ));
    
    // If accepted donations have higher verified rate, boost verified importance
    const acceptedVerifiedRate = accepts.filter(f => f.verified).length / accepts.length;
    const rejectedVerifiedRate = rejects.filter(f => f.verified).length / rejects.length || 0.5;
    const verifiedBoost = Math.max(-0.1, Math.min(0.1,
      (acceptedVerifiedRate - rejectedVerifiedRate) * 0.2
    ));
    
    return {
      ngoId,
      totalAccepts,
      totalRejects,
      acceptanceRate,
      preferredDonors,
      avoidedDonors,
      avgAcceptedDistance,
      avgAcceptedQuantity,
      avgAcceptedFreshness,
      distanceBoost,
      quantityBoost,
      freshnessBoost,
      verifiedBoost,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error('[AI Learning] Failed to build profile:', error);
    // Return default profile on error
    return {
      ngoId,
      totalAccepts: 0,
      totalRejects: 0,
      acceptanceRate: 0.5,
      preferredDonors: [],
      avoidedDonors: [],
      avgAcceptedDistance: 10,
      avgAcceptedQuantity: 50,
      avgAcceptedFreshness: 0.7,
      distanceBoost: 0,
      quantityBoost: 0,
      freshnessBoost: 0,
      verifiedBoost: 0,
      lastUpdated: new Date(),
    };
  }
}

/**
 * Build donor reputation from historical feedback across all NGOs
 */
export async function buildDonorReputation(donorId: string): Promise<DonorReputation> {
  try {
    const q = query(
      collection(db, 'ai_feedback'),
      where('donorId', '==', donorId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    const snapshot = await getDocs(q);
    const feedback = snapshot.docs.map(doc => doc.data() as FeedbackEvent);
    
    if (feedback.length === 0) {
      return {
        donorId,
        totalClaims: 0,
        acceptanceRate: 0.5,
        avgMatchScore: 50,
        preferredByNGOs: [],
        reputation: 'new',
      };
    }
    
    const accepts = feedback.filter(f => f.action === 'accepted');
    const totalClaims = accepts.length;
    const acceptanceRate = accepts.length / feedback.length;
    const avgMatchScore = feedback.reduce((sum, f) => sum + f.matchScore, 0) / feedback.length;
    
    // Find NGOs that frequently accept from this donor
    const ngoAccepts: Record<string, number> = {};
    accepts.forEach(f => {
      ngoAccepts[f.ngoId] = (ngoAccepts[f.ngoId] || 0) + 1;
    });
    
    const preferredByNGOs = Object.entries(ngoAccepts)
      .filter(([, count]) => count >= 2)
      .map(([ngoId]) => ngoId);
    
    // Calculate reputation
    let reputation: 'excellent' | 'good' | 'average' | 'new' = 'new';
    if (totalClaims >= 10 && acceptanceRate >= 0.7) {
      reputation = 'excellent';
    } else if (totalClaims >= 5 && acceptanceRate >= 0.5) {
      reputation = 'good';
    } else if (totalClaims >= 2) {
      reputation = 'average';
    }
    
    return {
      donorId,
      totalClaims,
      acceptanceRate,
      avgMatchScore,
      preferredByNGOs,
      reputation,
    };
  } catch (error) {
    console.error('[AI Learning] Failed to build donor reputation:', error);
    return {
      donorId,
      totalClaims: 0,
      acceptanceRate: 0.5,
      avgMatchScore: 50,
      preferredByNGOs: [],
      reputation: 'new',
    };
  }
}

// ============================================================================
// SCORE ADJUSTMENT (Rule-Based Recommender)
// ============================================================================

/**
 * Adjust match score based on learned patterns
 * This is the MVP implementation of AI learning
 */
export function adjustScoreWithLearning(
  baseScore: number,
  donorId: string,
  ngoProfile: NGOLearningProfile,
  donorReputation: DonorReputation
): number {
  let adjustedScore = baseScore;
  
  // 1. Preferred Donor Boost (+5 points)
  if (ngoProfile.preferredDonors.includes(donorId)) {
    adjustedScore += 5;
  }
  
  // 2. Avoided Donor Penalty (-10 points)
  if (ngoProfile.avoidedDonors.includes(donorId)) {
    adjustedScore -= 10;
  }
  
  // 3. Donor Reputation Boost
  switch (donorReputation.reputation) {
    case 'excellent':
      adjustedScore += 3;
      break;
    case 'good':
      adjustedScore += 1;
      break;
    case 'average':
      adjustedScore += 0;
      break;
    case 'new':
      adjustedScore -= 1; // Slight penalty for new/unknown donors
      break;
  }
  
  // 4. Pattern-based weight adjustments (from learned boosts)
  // These are subtle adjustments to the base score based on NGO's historical preferences
  // Range: -10 to +10 points total from all pattern boosts
  const patternAdjustment = (
    ngoProfile.distanceBoost +
    ngoProfile.quantityBoost +
    ngoProfile.freshnessBoost +
    ngoProfile.verifiedBoost
  ) * 100; // Convert 0.1 scale to 10 point scale
  
  adjustedScore += patternAdjustment;
  
  // Cap final score to 0-100 range
  return Math.max(0, Math.min(100, adjustedScore));
}

// ============================================================================
// RECOMMENDATIONS
// ============================================================================

/**
 * Get personalized recommendations for an NGO
 * Combines base matching with learned preferences
 */
export async function getPersonalizedRecommendations(
  ngoId: string,
  baseMatches: Array<{ donorId: string; baseScore: number; donationId: string }>
): Promise<Array<{ donationId: string; finalScore: number; reasoning: string[] }>> {
  // Build learning profiles
  const ngoProfile = await buildNGOLearningProfile(ngoId);
  
  // Get donor reputations (cached for performance)
  const donorReputations = new Map<string, DonorReputation>();
  for (const match of baseMatches) {
    if (!donorReputations.has(match.donorId)) {
      const reputation = await buildDonorReputation(match.donorId);
      donorReputations.set(match.donorId, reputation);
    }
  }
  
  // Adjust scores with learning
  const recommendations = baseMatches.map(match => {
    const donorReputation = donorReputations.get(match.donorId)!;
    const finalScore = adjustScoreWithLearning(
      match.baseScore,
      match.donorId,
      ngoProfile,
      donorReputation
    );
    
    // Generate reasoning
    const reasoning: string[] = [];
    if (ngoProfile.preferredDonors.includes(match.donorId)) {
      reasoning.push('✅ Preferred donor (you frequently accept from them)');
    }
    if (ngoProfile.avoidedDonors.includes(match.donorId)) {
      reasoning.push('⚠️ Previously avoided');
    }
    if (donorReputation.reputation === 'excellent') {
      reasoning.push('⭐ Excellent donor reputation');
    }
    if (Math.abs(finalScore - match.baseScore) > 5) {
      reasoning.push(`🧠 AI adjusted score: ${match.baseScore.toFixed(0)} → ${finalScore.toFixed(0)}`);
    }
    
    return {
      donationId: match.donationId,
      finalScore,
      reasoning,
    };
  });
  
  // Sort by final score
  recommendations.sort((a, b) => b.finalScore - a.finalScore);
  
  return recommendations;
}

// ============================================================================
// FUTURE: GRADIENT BOOSTING INTEGRATION
// ============================================================================

/**
 * Placeholder for future gradient boosting model
 * 
 * When ready to upgrade from rule-based to ML:
 * 1. Collect feedback data into training dataset
 * 2. Train LightGBM or XGBoost model
 * 3. Deploy model to backend API
 * 4. Replace adjustScoreWithLearning() with model predictions
 * 
 * Features for model:
 * - Base match score
 * - NGO historical acceptance rate
 * - Donor reputation score
 * - Distance, quantity, freshness
 * - Time of day, day of week
 * - NGO capacity utilization
 * 
 * Target variable:
 * - Binary: accepted (1) or rejected (0)
 * - Or continuous: match quality score
 */
export async function predictWithGradientBoosting(
  features: Record<string, any>
): Promise<number> {
  // TODO: Implement when backend ML service is ready
  // For now, return null to indicate model not available
  console.log('[AI Learning] Gradient boosting not yet implemented');
  return 0;
}

export default {
  logAccept,
  logReject,
  buildNGOLearningProfile,
  buildDonorReputation,
  adjustScoreWithLearning,
  getPersonalizedRecommendations,
};

