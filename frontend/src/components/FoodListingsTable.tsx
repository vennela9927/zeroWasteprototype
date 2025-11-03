import React from 'react';
import { Calendar, MapPin, Star, Target, Zap, CheckCircle, TrendingUp, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { getMatchQuality, formatDistance, formatExpiryTime } from '../utils/smartMatching';

/**
 * Get urgency color and badge based on expiry hours
 */
function getUrgencyBadge(expiryHours: number | undefined): {
  color: string;
  bgColor: string;
  label: string;
  emoji: string;
} {
  if (expiryHours === undefined || expiryHours < 0) {
    return { color: 'text-red-700', bgColor: 'bg-red-100 border-red-300', label: 'Expired', emoji: '🚫' };
  }
  
  if (expiryHours <= 2) {
    return { color: 'text-red-700', bgColor: 'bg-red-100 border-red-300', label: 'Critical', emoji: '🔥' };
  } else if (expiryHours <= 6) {
    return { color: 'text-orange-700', bgColor: 'bg-orange-100 border-orange-300', label: 'Urgent', emoji: '⚠️' };
  } else if (expiryHours <= 12) {
    return { color: 'text-amber-700', bgColor: 'bg-amber-100 border-amber-300', label: 'Soon', emoji: '⏰' };
  } else if (expiryHours <= 24) {
    return { color: 'text-yellow-700', bgColor: 'bg-yellow-100 border-yellow-300', label: 'Today', emoji: '📅' };
  } else {
    return { color: 'text-green-700', bgColor: 'bg-green-100 border-green-300', label: 'Fresh', emoji: '🟩' };
  }
}

/**
 * Generate AI Smart Tag based on listing features
 */
function getSmartTag(listing: FoodListing, userType: string): {
  text: string;
  icon: any;
  color: string;
} | null {
  if (userType !== 'ngo') return null;
  
  const matchScore = listing._matchScore || 0;
  const distanceKm = listing._distanceKm;
  const expiryHours = listing._expiryHours || 24;
  const quantity = listing.quantity || 0;
  const freshnessPercent = listing._freshnessPercent;
  const verified = listing.verified;
  const aiAdjusted = listing._aiAdjusted;
  
  // Priority 1: AI-adjusted match
  if (aiAdjusted && matchScore >= 85) {
    return {
      text: 'AI Recommended for You 🧠',
      icon: Sparkles,
      color: 'text-purple-700 bg-purple-100 border-purple-300'
    };
  }
  
  // Priority 2: Critical urgency
  if (expiryHours <= 2 && matchScore >= 70) {
    return {
      text: 'Expiring Soon ⏰',
      icon: Zap,
      color: 'text-red-700 bg-red-100 border-red-300'
    };
  }
  
  // Priority 3: Perfect distance + freshness
  if (distanceKm !== undefined && distanceKm <= 2 && freshnessPercent && freshnessPercent >= 0.8) {
    return {
      text: 'Nearby & Fresh 🚚',
      icon: CheckCircle,
      color: 'text-green-700 bg-green-100 border-green-300'
    };
  }
  
  // Priority 4: Perfect capacity match
  if (quantity >= 30 && quantity <= 70) {
    return {
      text: 'Perfect Match for Your Capacity 🍱',
      icon: Target,
      color: 'text-blue-700 bg-blue-100 border-blue-300'
    };
  }
  
  // Priority 5: Verified donor
  if (verified && matchScore >= 75) {
    return {
      text: 'Verified Donor ✓',
      icon: Star,
      color: 'text-cyan-700 bg-cyan-100 border-cyan-300'
    };
  }
  
  // Priority 6: High match (general)
  if (matchScore >= 85) {
    return {
      text: 'Excellent Match 🎯',
      icon: TrendingUp,
      color: 'text-emerald-700 bg-emerald-100 border-emerald-300'
    };
  }
  
  return null;
}

interface FoodListing {
  id: string;
  name?: string; // legacy
  foodName?: string; // new canonical
  quantity: number;
  expiry?: string; // legacy string
  expiryTime?: any; // Firestore Timestamp
  location: string;
  donor?: string; // legacy donorName mapping
  donorName?: string;
  donorId?: string;
  status?: 'available' | 'claimed' | 'expired' | 'requested' | 'picked_up'; // extended
  claimed?: boolean; // new boolean
  verified?: boolean; // Donor verification status
  isRecommended?: boolean;
  // Smart matching fields
  _matchScore?: number;
  _baseScore?: number; // Original score before AI adjustments
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
  _freshnessPercent?: number; // 0-1 range (percentage fresh)
  _aiAdjusted?: boolean; // True if AI learning modified the score
}

interface FoodListingsTableProps {
  listings: FoodListing[];
  userType: 'donor' | 'ngo';
  onClaim?: (id: string) => void;
  onOpenProfile?: (profile: { uid?: string; name?: string; role?: 'donor' | 'recipient' }) => void;
}

const FoodListingsTable: React.FC<FoodListingsTableProps> = ({ listings, userType, onClaim, onOpenProfile }) => {
  const getStatusBadge = (status: string) => {
    const badges = {
      available: 'bg-green-100 text-green-800',
      requested: 'bg-amber-100 text-amber-800',
      claimed: 'bg-blue-100 text-blue-800',
      picked_up: 'bg-purple-100 text-purple-800',
      expired: 'bg-red-100 text-red-800',
    } as const;
    return badges[status as keyof typeof badges] || 'bg-slate-100 text-slate-800';
  };

  const deriveStatus = (l: FoodListing) => {
    // Prefer new claimed boolean then legacy status
  if (l.status === 'requested') return 'requested';
  if (l.claimed || l.status === 'claimed') return 'claimed';
    // Expiry handling
    const expiryDate = l.expiryTime?.toDate ? l.expiryTime.toDate() : (l.expiry ? new Date(l.expiry) : null);
    if (expiryDate && expiryDate.getTime() < Date.now()) return 'expired';
    return 'available';
  };

  const toDisplayName = (l: FoodListing) => l.foodName || l.name || 'Food Item';
  const toDisplayExpiry = (l: FoodListing) => {
    const expiryDate = l.expiryTime?.toDate ? l.expiryTime.toDate() : (l.expiry ? new Date(l.expiry) : null);
    return expiryDate ? format(expiryDate, 'MMM dd, yyyy') : '—';
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-zinc-900">
          {userType === 'donor' ? 'My Food Listings' : 'Available Food'}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <div className="lg:hidden space-y-4">
          {/* Mobile Card View */}
          {listings.map((listing) => {
            const derivedStatus = deriveStatus(listing);
            const matchQuality = listing._matchScore !== undefined ? getMatchQuality(listing._matchScore) : null;
            const urgencyBadge = getUrgencyBadge(listing._expiryHours);
            const smartTag = getSmartTag(listing, userType);
            
            return (
            <div key={listing.id} className={`border-2 rounded-xl p-4 transition-all hover:shadow-lg ${
              matchQuality && matchQuality.color === 'green' 
                ? 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50/30' 
                : matchQuality && matchQuality.color === 'blue'
                ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50/30'
                : matchQuality && matchQuality.color === 'amber'
                ? 'border-amber-300 bg-amber-50/20'
                : 'border-slate-200 bg-white'
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-bold text-zinc-900 text-lg">{toDisplayName(listing)}</h4>
                  {(listing.donorName || listing.donor) && (
                    <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                      by {onOpenProfile ? (
                        <button onClick={()=>onOpenProfile({ uid: listing.donorId, name: listing.donorName || listing.donor, role:'donor'})} className="underline decoration-dotted hover:text-blue-700 font-medium">
                          {listing.donorName || listing.donor}
                        </button>
                      ) : (listing.donorName || listing.donor)}
                      {listing.verified && <Star size={12} className="text-cyan-600 fill-cyan-600" title="Verified Donor" />}
                    </p>
                  )}
                  
                  {/* AI Smart Tag */}
                  {smartTag && (
                    <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-bold ${smartTag.color}`}>
                      <smartTag.icon size={14} />
                      {smartTag.text}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  {/* Match Score */}
                  {matchQuality && userType === 'ngo' && (
                    <span className={`px-3 py-1.5 rounded-full text-xs font-black flex items-center shadow-sm ${
                      matchQuality.color === 'green' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                      matchQuality.color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' :
                      matchQuality.color === 'cyan' ? 'bg-cyan-100 text-cyan-800' :
                      matchQuality.color === 'amber' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      <Target size={12} className="mr-1" />
                      {matchQuality.emoji} {listing._matchScore}%
                    </span>
                  )}
                  
                  {/* Status */}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(derivedStatus)}`}>
                    {derivedStatus}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2.5 text-sm text-slate-700">
                <div className="flex items-center">
                  <span className="font-semibold text-slate-500 text-xs uppercase tracking-wide w-24">Quantity:</span>
                  <span className="font-bold text-zinc-900">{listing.quantity} servings</span>
                </div>
                
                {/* Expiry with Urgency Badge */}
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  <span className="text-xs">{toDisplayExpiry(listing)}</span>
                  <span className={`ml-auto px-2.5 py-1 rounded-md border-2 text-[10px] font-black flex items-center gap-1 ${urgencyBadge.bgColor} ${urgencyBadge.color}`}>
                    <span>{urgencyBadge.emoji}</span>
                    {urgencyBadge.label}
                    {listing._expiryHours !== undefined && listing._expiryHours < 24 && (
                      <span className="ml-1">({formatExpiryTime(listing._expiryHours)})</span>
                    )}
                  </span>
                </div>
                
                {/* Distance */}
                <div className="flex items-center">
                  <MapPin size={14} className="text-slate-400 mr-2" />
                  <span className="text-xs">{listing.location}</span>
                  {listing._distanceKm !== undefined && (
                    <span className={`ml-auto px-2 py-0.5 rounded-md text-xs font-bold ${
                      listing._distanceKm <= 2 ? 'bg-green-100 text-green-700' :
                      listing._distanceKm <= 5 ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      🚗 {formatDistance(listing._distanceKm)}
                    </span>
                  )}
                </div>
                
                {/* Freshness (if available) */}
                {listing._freshnessPercent !== undefined && (
                  <div className="flex items-center">
                    <Sparkles size={14} className="text-slate-400 mr-2" />
                    <span className="text-xs">Freshness:</span>
                    <div className="ml-2 flex-1 bg-slate-200 rounded-full h-2 max-w-[100px]">
                      <div 
                        className={`h-2 rounded-full ${
                          listing._freshnessPercent >= 0.8 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                          listing._freshnessPercent >= 0.5 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                          'bg-gradient-to-r from-orange-400 to-red-500'
                        }`}
                        style={{ width: `${Math.round(listing._freshnessPercent * 100)}%` }}
                      />
                    </div>
                    <span className="ml-2 text-xs font-bold">{Math.round(listing._freshnessPercent * 100)}%</span>
                  </div>
                )}
              </div>

              {userType === 'ngo' && (
                <>
                  {derivedStatus === 'available' && onClaim && (
                    <button
                      onClick={() => onClaim(listing.id)}
                      className="w-full mt-4 bg-gradient-to-r from-blue-700 to-cyan-500 text-white font-bold py-2 px-4 rounded-lg hover:from-blue-800 hover:to-cyan-600 transition-all duration-200"
                    >
                      Request
                    </button>
                  )}
                  {derivedStatus === 'requested' && (
                    <div className="w-full mt-4 bg-amber-100 text-amber-800 font-bold py-2 px-4 rounded-lg text-center border-2 border-amber-300">
                      ⏳ Requested - Awaiting Approval
                    </div>
                  )}
                  {derivedStatus === 'claimed' && (
                    <div className="w-full mt-4 bg-green-100 text-green-800 font-bold py-2 px-4 rounded-lg text-center border-2 border-green-300">
                      ✅ Approved - Ready for Pickup
                    </div>
                  )}
                </>
              )}
            </div>
          )})}
        </div>

        {/* Desktop Table View */}
        <table className="hidden lg:table w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 font-bold text-slate-700">Food Item</th>
              {userType === 'ngo' && <th className="text-left py-3 px-4 font-bold text-slate-700">Match</th>}
              {userType === 'ngo' && <th className="text-left py-3 px-4 font-bold text-slate-700">Donor</th>}
              <th className="text-left py-3 px-4 font-bold text-slate-700">Quantity</th>
              <th className="text-left py-3 px-4 font-bold text-slate-700">Expiry</th>
              <th className="text-left py-3 px-4 font-bold text-slate-700">Location</th>
              <th className="text-left py-3 px-4 font-bold text-slate-700">Status</th>
              {userType === 'ngo' && <th className="text-left py-3 px-4 font-bold text-slate-700">Action</th>}
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => {
              const derivedStatus = deriveStatus(listing);
              const matchQuality = listing._matchScore !== undefined ? getMatchQuality(listing._matchScore) : null;
              const urgencyBadge = getUrgencyBadge(listing._expiryHours);
              const smartTag = getSmartTag(listing, userType);
              
              return (
              <tr key={listing.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                matchQuality && matchQuality.color === 'green'
                  ? 'bg-gradient-to-r from-green-50/30 to-emerald-50/20'
                  : matchQuality && matchQuality.color === 'blue'
                  ? 'bg-gradient-to-r from-blue-50/30 to-cyan-50/20'
                  : ''
              }`}>
                <td className="py-4 px-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900">{toDisplayName(listing)}</span>
                      {listing.verified && <Star size={12} className="text-cyan-600 fill-cyan-600" title="Verified Donor" />}
                    </div>
                    
                    {/* AI Smart Tag */}
                    {smartTag && (
                      <span className={`inline-flex items-center gap-1 w-fit px-2.5 py-1 rounded-md border text-[10px] font-bold ${smartTag.color}`}>
                        <smartTag.icon size={11} />
                        {smartTag.text}
                      </span>
                    )}
                    
                    {/* Urgency Badge */}
                    <span className={`inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-md border text-[10px] font-bold ${urgencyBadge.bgColor} ${urgencyBadge.color}`}>
                      <span>{urgencyBadge.emoji}</span>
                      {urgencyBadge.label}
                      {listing._expiryHours !== undefined && listing._expiryHours < 24 && (
                        <span className="ml-0.5">({formatExpiryTime(listing._expiryHours)})</span>
                      )}
                    </span>
                  </div>
                </td>
                {userType === 'ngo' && (
                  <td className="py-4 px-4">
                    {matchQuality ? (
                      <div className="flex flex-col gap-1.5">
                        {/* Match Score Badge with Gradient */}
                        <span className={`px-3 py-1.5 rounded-full text-xs font-black flex items-center w-fit shadow-sm ${
                          matchQuality.color === 'green' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                          matchQuality.color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' :
                          matchQuality.color === 'cyan' ? 'bg-cyan-100 text-cyan-800' :
                          matchQuality.color === 'amber' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {matchQuality.emoji} {listing._matchScore}%
                        </span>
                        
                        {/* Distance */}
                        {listing._distanceKm !== undefined && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md w-fit ${
                            listing._distanceKm <= 2 ? 'bg-green-100 text-green-700' :
                            listing._distanceKm <= 5 ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            🚗 {formatDistance(listing._distanceKm)}
                          </span>
                        )}
                        
                        {/* Freshness Bar */}
                        {listing._freshnessPercent !== undefined && (
                          <div className="flex items-center gap-1">
                            <div className="w-16 bg-slate-200 rounded-full h-1.5">
                              <div 
                                className={`h-1.5 rounded-full ${
                                  listing._freshnessPercent >= 0.8 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                                  listing._freshnessPercent >= 0.5 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                                  'bg-gradient-to-r from-orange-400 to-red-500'
                                }`}
                                style={{ width: `${Math.round(listing._freshnessPercent * 100)}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-bold text-slate-600">
                              {Math.round(listing._freshnessPercent * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    ) : '—'}
                  </td>
                )}
                {userType === 'ngo' && (
                  <td className="py-4 px-4 text-slate-600">{(listing.donorName || listing.donor) && onOpenProfile ? (
                    <button onClick={()=>onOpenProfile({ uid: listing.donorId, name: listing.donorName || listing.donor, role:'donor'})} className="underline decoration-dotted hover:text-blue-700">
                      {listing.donorName || listing.donor}
                    </button>
                  ) : (listing.donorName || listing.donor)}</td>
                )}
                <td className="py-4 px-4 text-slate-600">{listing.quantity} servings</td>
                <td className="py-4 px-4 text-slate-600">
                  {toDisplayExpiry(listing)}
                </td>
                <td className="py-4 px-4 text-slate-600">{listing.location}</td>
                <td className="py-4 px-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(derivedStatus)}`}>
                    {derivedStatus}
                  </span>
                </td>
                {userType === 'ngo' && (
                  <td className="py-4 px-4">
                    {derivedStatus === 'available' && onClaim && (
                      <button
                        onClick={() => onClaim(listing.id)}
                        className="bg-gradient-to-r from-blue-700 to-cyan-500 text-white font-bold py-2 px-4 rounded-lg hover:from-blue-800 hover:to-cyan-600 transition-all duration-200"
                      >
                        Request
                      </button>
                    )}
                    {derivedStatus === 'requested' && (
                      <span className="inline-block bg-amber-100 text-amber-800 font-semibold py-2 px-4 rounded-lg border-2 border-amber-300">
                        ⏳ Requested
                      </span>
                    )}
                    {derivedStatus === 'claimed' && (
                      <span className="inline-block bg-green-100 text-green-800 font-semibold py-2 px-4 rounded-lg border-2 border-green-300">
                        ✅ Approved
                      </span>
                    )}
                  </td>
                )}
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FoodListingsTable;