/**
 * AI-Powered Smart Matching Algorithm for NGO Dashboard
 * 
 * Automatically sorts donor listings based on:
 * 1. Food Type Match (25 points) - Veg/Non-Veg compatibility
 * 2. Time Freshness (25 points) - Based on prepared_time vs expiry_time
 * 3. Quantity Match (15 points) - Donation quantity vs NGO capacity
 * 4. Distance Proximity (20 points) - GPS-based distance
 * 5. Verified Donor Boost (10 points) - Bonus for verified donors
 * 6. Urgency Score (5 points) - AI learning-based priority for soon-expiring items
 * 
 * Total: 100 points
 * 
 * Pre-filtering: Excludes expired donations and food type mismatches
 */

interface FoodListing {
  id: string;
  foodName?: string;
  name?: string;
  foodType?: string;
  quantity?: number;
  expiryTime?: any;
  expiry?: string;
  preparedTime?: any; // When food was prepared/cooked
  latitude?: number;
  longitude?: number;
  location?: string;
  status?: string;
  claimed?: boolean;
  verified?: boolean; // Donor verification status
  preparationType?: 'raw' | 'cooked' | 'packaged';
}

interface NGOProfile {
  foodPreference?: 'veg' | 'non-veg' | 'both';
  capacity?: number;
  latitude?: number;
  longitude?: number;
  preparationCapability?: 'raw' | 'cooked' | 'both';
}

interface ScoredListing extends FoodListing {
  _matchScore?: number; // Final score (after AI adjustments)
  _baseScore?: number; // Original score (before AI adjustments)
  _scoreBreakdown?: {
    foodTypeScore: number;
    freshnessScore: number;
    quantityScore: number;
    distanceScore: number;
    verifiedScore: number;
    urgencyScore: number;
  };
  _distanceKm?: number;
  _expiryHours?: number;
  _freshnessPercent?: number;
  _aiAdjusted?: boolean; // True if AI learning modified the score
}

/**
 * Haversine distance calculation between two coordinates
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate hours until expiry
 */
function getExpiryHours(listing: FoodListing): number {
  try {
    let expiryDate: Date | null = null;
    
    if (listing.expiryTime?.toDate) {
      expiryDate = listing.expiryTime.toDate();
    } else if (listing.expiry) {
      expiryDate = new Date(listing.expiry);
    }
    
    if (!expiryDate || isNaN(expiryDate.getTime())) {
      return 24; // Default to 24 hours if unknown
    }
    
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60)); // Convert to hours
  } catch {
    return 24;
  }
}

/**
 * Normalize food type string to veg/non-veg/unknown
 */
function normalizeFoodType(foodType?: string): 'veg' | 'non-veg' | 'unknown' {
  if (!foodType) return 'unknown';
  
  const normalized = foodType.toLowerCase().trim();
  
  // Veg indicators
  if (
    normalized.includes('veg') && !normalized.includes('non') ||
    normalized.includes('vegetable') ||
    normalized.includes('fruit') ||
    normalized.includes('rice') ||
    normalized.includes('dal') ||
    normalized.includes('roti') ||
    normalized.includes('bread')
  ) {
    return 'veg';
  }
  
  // Non-veg indicators
  if (
    normalized.includes('non-veg') ||
    normalized.includes('nonveg') ||
    normalized.includes('non_veg') ||
    normalized.includes('non veg') ||
    normalized.includes('chicken') ||
    normalized.includes('meat') ||
    normalized.includes('fish') ||
    normalized.includes('egg')
  ) {
    return 'non-veg';
  }
  
  return 'unknown';
}

/**
 * Normalize preparation type
 */
function normalizePreparationType(
  preparationType?: string,
  foodType?: string
): 'raw' | 'cooked' | 'packaged' {
  if (preparationType) {
    const prep = preparationType.toLowerCase();
    if (prep.includes('raw')) return 'raw';
    if (prep.includes('cooked')) return 'cooked';
    if (prep.includes('packaged') || prep.includes('package')) return 'packaged';
  }
  
  // Infer from food type
  if (foodType) {
    const type = foodType.toLowerCase();
    if (type.includes('raw') || type.includes('fresh')) return 'raw';
    if (type.includes('cooked') || type.includes('prepared')) return 'cooked';
    if (type.includes('packaged') || type.includes('canned')) return 'packaged';
  }
  
  return 'cooked'; // Default assumption
}

/**
 * Calculate match score between listing and NGO profile
 * Using AI-powered weighted algorithm as specified
 */
function calculateMatchScore(
  listing: FoodListing,
  ngoProfile: NGOProfile
): { score: number; breakdown: any; distanceKm?: number; expiryHours: number; freshnessPercent?: number } {
  const breakdown = {
    foodTypeScore: 0,
    freshnessScore: 0,
    quantityScore: 0,
    distanceScore: 0,
    verifiedScore: 0,
    urgencyScore: 0,
  };
  
  // 1. Food Type Match (25% weight)
  const listingFoodType = normalizeFoodType(listing.foodType);
  const ngoPreference = ngoProfile.foodPreference || 'both';
  
  if (ngoPreference === 'both') {
    breakdown.foodTypeScore = 1; // Full match
  } else if (listingFoodType === 'unknown') {
    breakdown.foodTypeScore = 0.6; // Partial match for unknown
  } else if (ngoPreference === listingFoodType) {
    breakdown.foodTypeScore = 1; // Perfect match
  } else {
    breakdown.foodTypeScore = 0; // Mismatch
  }
  
  // 2. Time Freshness (25% weight)
  // Formula: (expiry_time - current_time) / (expiry_time - prepared_time)
  let freshnessPercent: number | undefined;
  const now = new Date();
  
  try {
    const expiryDate = listing.expiryTime?.toDate ? listing.expiryTime.toDate() : 
                       (listing.expiry ? new Date(listing.expiry) : null);
    const preparedDate = listing.preparedTime?.toDate ? listing.preparedTime.toDate() : null;
    
    if (expiryDate && preparedDate && preparedDate < expiryDate) {
      const totalLifespan = expiryDate.getTime() - preparedDate.getTime();
      const remainingLife = expiryDate.getTime() - now.getTime();
      
      if (totalLifespan > 0 && remainingLife > 0) {
        freshnessPercent = remainingLife / totalLifespan;
        breakdown.freshnessScore = Math.max(0, Math.min(1, freshnessPercent));
      } else if (remainingLife <= 0) {
        breakdown.freshnessScore = 0; // Expired
      } else {
        breakdown.freshnessScore = 0.5; // Default if calculation fails
      }
    } else if (expiryDate) {
      // No prepared time, use expiry hours as proxy
      const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilExpiry <= 0) {
        breakdown.freshnessScore = 0;
      } else if (hoursUntilExpiry >= 24) {
        breakdown.freshnessScore = 1; // Very fresh
      } else {
        breakdown.freshnessScore = hoursUntilExpiry / 24; // Linear decay
      }
    } else {
      breakdown.freshnessScore = 0.5; // Unknown, neutral score
    }
  } catch {
    breakdown.freshnessScore = 0.5; // Fallback on error
  }
  
  // 3. Quantity Match (15% weight)
  // Formula: min(1, donation_quantity / ngo_capacity)
  const listingQuantity = listing.quantity || 0;
  const ngoCapacity = ngoProfile.capacity || 100;
  
  if (listingQuantity > 0 && ngoCapacity > 0) {
    breakdown.quantityScore = Math.min(1, listingQuantity / ngoCapacity);
  } else {
    breakdown.quantityScore = 0.5; // Unknown quantity, neutral score
  }
  
  // 4. Distance Proximity (20% weight)
  // Formula: 1 - (distance / max_distance), where max_distance = 50km
  let distanceKm: number | undefined;
  const MAX_DISTANCE = 50; // km
  
  if (
    ngoProfile.latitude &&
    ngoProfile.longitude &&
    listing.latitude &&
    listing.longitude
  ) {
    distanceKm = calculateDistance(
      ngoProfile.latitude,
      ngoProfile.longitude,
      listing.latitude,
      listing.longitude
    );
    
    breakdown.distanceScore = Math.max(0, 1 - (distanceKm / MAX_DISTANCE));
  } else {
    // No coordinates available - neutral score
    breakdown.distanceScore = 0.5;
  }
  
  // 5. Verified Donor Boost (10% weight)
  // +10 bonus if verified = true
  breakdown.verifiedScore = listing.verified ? 1 : 0;
  
  // 6. Urgency Score (5% weight)
  // AI learning-based decay function for soon-expiring items
  const expiryHours = getExpiryHours(listing);
  
  if (expiryHours <= 0) {
    breakdown.urgencyScore = 0; // Expired
  } else if (expiryHours <= 2) {
    breakdown.urgencyScore = 1; // Critical urgency
  } else if (expiryHours <= 6) {
    breakdown.urgencyScore = 0.8; // High urgency
  } else if (expiryHours <= 12) {
    breakdown.urgencyScore = 0.6; // Medium urgency
  } else if (expiryHours <= 24) {
    breakdown.urgencyScore = 0.4; // Low urgency
  } else {
    breakdown.urgencyScore = 0.2; // Very low urgency
  }
  
  // Calculate final composite score (0-100)
  const score = (
    breakdown.foodTypeScore * 0.25 +
    breakdown.freshnessScore * 0.25 +
    breakdown.quantityScore * 0.15 +
    breakdown.distanceScore * 0.20 +
    breakdown.verifiedScore * 0.10 +
    breakdown.urgencyScore * 0.05
  ) * 100;
  
  return { score, breakdown, distanceKm, expiryHours, freshnessPercent };
}

/**
 * Sort food listings by relevance for NGO with AI-powered pre-filtering and learning
 * 
 * Step 1: Pre-filter to remove:
 * - Expired donations (current_time > expiry_time)
 * - Food type mismatches (if NGO = Veg only → ignore Non-Veg)
 * 
 * Step 2: Calculate base match score (0-100) for remaining donations
 * 
 * Step 3: AI Learning (optional) - Adjust scores based on historical patterns
 * 
 * Step 4: Sort by final score descending
 */
export function sortListingsByRelevance(
  listings: FoodListing[],
  ngoProfile: NGOProfile,
  learningProfile?: any // Optional: Pass NGO learning profile for AI adjustments
): ScoredListing[] {
  const now = Date.now();
  const ngoPreference = ngoProfile.foodPreference || 'both';
  
  // STEP 1: Pre-filter donations
  const filteredListings = listings.filter((listing) => {
    // Filter 1: Remove expired donations
    try {
      const expiryDate = listing.expiryTime?.toDate ? listing.expiryTime.toDate() :
                         (listing.expiry ? new Date(listing.expiry) : null);
      if (expiryDate && expiryDate.getTime() < now) {
        return false; // Expired
      }
    } catch {
      // If we can't parse expiry, keep it (benefit of doubt)
    }
    
    // Filter 2: Remove food type mismatches
    if (ngoPreference !== 'both') {
      const listingFoodType = normalizeFoodType(listing.foodType);
      if (listingFoodType !== 'unknown' && listingFoodType !== ngoPreference) {
        return false; // Food type mismatch
      }
    }
    
    return true; // Passes all filters
  });
  
  // STEP 2: Calculate base match scores for filtered listings
  const scoredListings: ScoredListing[] = filteredListings.map((listing) => {
    const { score, breakdown, distanceKm, expiryHours, freshnessPercent } = calculateMatchScore(
      listing,
      ngoProfile
    );
    
    let finalScore = score;
    
    // STEP 3: AI Learning adjustments (if learning profile provided)
    if (learningProfile) {
      const donorId = (listing as any).donorId;
      
      // Apply learned preferences
      if (learningProfile.preferredDonors?.includes(donorId)) {
        finalScore += 5; // Boost preferred donors
      }
      if (learningProfile.avoidedDonors?.includes(donorId)) {
        finalScore -= 10; // Penalize avoided donors
      }
      
      // Apply pattern boosts (learned from historical accepts/rejects)
      const patternAdjustment = (
        (learningProfile.distanceBoost || 0) +
        (learningProfile.quantityBoost || 0) +
        (learningProfile.freshnessBoost || 0) +
        (learningProfile.verifiedBoost || 0)
      ) * 100;
      
      finalScore += patternAdjustment;
      
      // Cap to 0-100 range
      finalScore = Math.max(0, Math.min(100, finalScore));
    }
    
    return {
      ...listing,
      _matchScore: finalScore,
      _baseScore: score, // Store original score for comparison
      _scoreBreakdown: breakdown,
      _distanceKm: distanceKm,
      _expiryHours: expiryHours,
      _freshnessPercent: freshnessPercent,
      _aiAdjusted: learningProfile ? finalScore !== score : false,
    };
  });
  
  // STEP 4: Sort by final match score (descending), tie-breaker by urgency (lower _expiryHours first), then distance (closer first)
  scoredListings.sort((a, b) => {
    const sa = a._matchScore || 0;
    const sb = b._matchScore || 0;
    if (sb !== sa) return sb - sa;
    const ea = a._expiryHours ?? Number.POSITIVE_INFINITY;
    const eb = b._expiryHours ?? Number.POSITIVE_INFINITY;
    if (ea !== eb) return ea - eb;
    const da = a._distanceKm ?? Number.POSITIVE_INFINITY;
    const db = b._distanceKm ?? Number.POSITIVE_INFINITY;
    return da - db;
  });
  
  return scoredListings;
}

/**
 * Get match quality label based on score
 */
export function getMatchQuality(score: number): {
  label: string;
  color: string;
  emoji: string;
} {
  if (score >= 85) {
    return { label: 'Excellent Match', color: 'green', emoji: '🎯' };
  } else if (score >= 70) {
    return { label: 'Great Match', color: 'blue', emoji: '⭐' };
  } else if (score >= 55) {
    return { label: 'Good Match', color: 'cyan', emoji: '✓' };
  } else if (score >= 40) {
    return { label: 'Fair Match', color: 'amber', emoji: '○' };
  } else {
    return { label: 'Low Match', color: 'slate', emoji: '·' };
  }
}

/**
 * Format distance for display
 */
export function formatDistance(km?: number): string {
  if (km === undefined) return '—';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

/**
 * Format expiry time for display
 */
export function formatExpiryTime(hours: number): string {
  if (hours < 0) return 'Expired';
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

