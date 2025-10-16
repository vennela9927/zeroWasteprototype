import React from 'react';
import { Calendar, MapPin, Star } from 'lucide-react';
import { format } from 'date-fns';

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
  isRecommended?: boolean;
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
            return (
            <div key={listing.id} className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-zinc-900">{toDisplayName(listing)}</h4>
                  {(listing.donorName || listing.donor) && (
                    <p className="text-sm text-slate-600">by {onOpenProfile ? (
                      <button onClick={()=>onOpenProfile({ uid: listing.donorId, name: listing.donorName || listing.donor, role:'donor'})} className="underline decoration-dotted hover:text-blue-700">
                        {listing.donorName || listing.donor}
                      </button>
                    ) : (listing.donorName || listing.donor)}</p>
                  )}
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(derivedStatus)}`}>
                    {derivedStatus}
                  </span>
                  {listing.isRecommended && userType === 'ngo' && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex items-center">
                      <Star size={10} className="mr-1" />
                      Suggested for You
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center">
                  <span className="font-medium">Quantity:</span>
                  <span className="ml-2">{listing.quantity} servings</span>
                </div>
                <div className="flex items-center">
                  <Calendar size={14} className="mr-2" />
                  <span>Expires: {toDisplayExpiry(listing)}</span>
                </div>
                <div className="flex items-center">
                  <MapPin size={14} className="mr-2" />
                  <span>{listing.location}</span>
                </div>
              </div>

              {userType === 'ngo' && derivedStatus === 'available' && onClaim && (
                <button
                  onClick={() => onClaim(listing.id)}
                  className="w-full mt-4 bg-gradient-to-r from-blue-700 to-cyan-500 text-white font-bold py-2 px-4 rounded-lg hover:from-blue-800 hover:to-cyan-600 transition-all duration-200"
                >
                  Request
                </button>
              )}
            </div>
          )})}
        </div>

        {/* Desktop Table View */}
        <table className="hidden lg:table w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 font-bold text-slate-700">Food Item</th>
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
              return (
              <tr key={listing.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-4 px-4">
                  <div className="flex items-center">
                    <span className="font-medium text-zinc-900">{toDisplayName(listing)}</span>
                    {listing.isRecommended && userType === 'ngo' && (
                      <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex items-center">
                        <Star size={10} className="mr-1" />
                        Suggested for You
                      </span>
                    )}
                  </div>
                </td>
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