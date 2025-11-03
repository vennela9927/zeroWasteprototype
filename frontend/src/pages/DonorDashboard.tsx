import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFoodListings } from '../hooks/useFoodListings';
import { useClaims } from '../hooks/useClaims';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import ProfileSettings from '../components/ProfileSettings';
import DonorAnalytics from '../components/DonorAnalytics';
import DonorHistory from '../components/DonorHistory';
import DonationRequestModal from '../components/DonationRequestModal';
import DonationProgress from '../components/DonationProgress';
import { toast } from 'react-toastify';

const DonorDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'home' | 'food' | 'donations' | 'add-donation' | 'history' | 'analytics' | 'rewards' | 'csr' | 'support' | 'profile'>('home');
  const [selectedDonation, setSelectedDonation] = useState<any>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [showNewProgressModal, setShowNewProgressModal] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { listings, updateListing } = useFoodListings('donor');
  const { claims, updateClaimStatus } = useClaims('donor');

  const handleDonationClick = (donation: any) => {
    setSelectedDonation(donation);
    // Check if this donation has a claim (requested, approved, picked_up, etc.)
    const relatedClaim = claims.find(c => c.foodItemId === donation.id);
    
    if (relatedClaim) {
      // Open NEW progress modal with real-time updates
      setSelectedClaimId(relatedClaim.id);
      setShowNewProgressModal(true);
    } else {
      // No claim yet - just show basic info
      setIsRequestModalOpen(true);
    }
  };

  const handleStatusUpdate = async (donationId: string, newStatus: string) => {
    try {
      await updateListing(donationId, { status: newStatus as any });
      // Refresh the selected donation
      const updatedDonation = listings.find(l => l.id === donationId);
      if (updatedDonation) {
        setSelectedDonation(updatedDonation);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      throw error;
    }
  };

  // Detect account type (individual vs company)
  const accountType = profile?.accountType || 'individual';
  const isCompany = accountType === 'company';

  // Calculate stats
  const now = new Date();
  const isExpired = (l: any) => {
    try { return l.expiryTime?.toDate && l.expiryTime.toDate() < now; } catch { return false; }
  };

  const activeDonations = listings.filter(l => !l.claimed && !isExpired(l));
  const expiringSoon = activeDonations.filter(l => {
    const d = l.expiryTime?.toDate && l.expiryTime.toDate();
    return d && d.getTime() - now.getTime() < 1000 * 60 * 60 * 6; // < 6h
  }).length;

  const completedDonations = claims.filter((c:any) => c.status === 'fulfilled' || c.status === 'approved').length;
  const totalMeals = listings.reduce((sum, l) => sum + (l.quantity || 0), 0);
  
  // Rewards calculation (individuals only)
  const rewardPoints = completedDonations * 10;
  const co2Saved = Math.round(totalMeals * 0.5);

  const userDisplayName = profile?.name || user?.displayName || user?.email || 'Donor';

  const distinctNGOs = new Set(
    claims
      .filter((c: any) => c.status === 'approved' || c.status === 'fulfilled')
      .map((c: any) => c.recipientId)
  ).size;

  // Recent donations (last 3)
  const recentDonations = [...listings]
    .filter(l => l.createdAt)
    .sort((a: any, b: any) => {
      const at = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const bt = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return bt - at;
    })
    .slice(0, 3);

  // Pending requests from NGOs
  const pendingRequests = claims.filter((c:any) => c.status === 'requested');

  return (
    <div className="min-h-screen bg-bg-primary">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={(section) => setActiveSection(section as any)}
      />
      
      <div className="lg:ml-20">
        {user && (
          <TopBar userType="donor" userName={userDisplayName} />
        )}
        
        <main className="p-6 pb-24 lg:pb-8 max-w-[1600px] mx-auto">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeSection === 'home' && (
              <HomeTab 
                listings={listings}
                claims={claims}
                activeDonations={activeDonations.length}
                expiringSoon={expiringSoon}
                totalMeals={totalMeals}
                distinctNGOs={distinctNGOs}
                recentDonations={recentDonations}
                pendingRequests={pendingRequests}
                isCompany={isCompany}
                rewardPoints={rewardPoints}
                onAddDonation={() => setActiveSection('add-donation')}
                profile={profile}
                navigate={navigate}
                updateClaimStatus={updateClaimStatus}
                setSelectedClaimId={setSelectedClaimId}
                setShowNewProgressModal={setShowNewProgressModal}
              />
            )}
            {activeSection === 'add-donation' && <AddDonationForm />}
            {(activeSection === 'food' || activeSection === 'donations') && (
              <DonationsTab 
                listings={listings} 
                claims={claims}
                onDonationClick={handleDonationClick}
              />
            )}
            {activeSection === 'history' && (
              <DonorHistory listings={listings} claims={claims} />
            )}
            {activeSection === 'analytics' && (
              <DonorAnalytics listings={listings} claims={claims} />
            )}
            {activeSection === 'rewards' && !isCompany && <RewardsTab points={rewardPoints} co2Saved={co2Saved} totalMeals={totalMeals} />}
            {activeSection === 'csr' && isCompany && <CSRTab claims={claims} />}
            {activeSection === 'support' && <SupportTab />}
            {activeSection === 'profile' && <ProfileSettings />}
          </motion.div>
        </main>
      </div>

      {/* Donation Request Modal (with Accept/Reject and Map) */}
      <DonationRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        donation={selectedDonation}
        userRole="donor"
        onStatusUpdate={handleStatusUpdate}
      />

      {/* New Comprehensive Donation Progress with Proof Upload & CSR Certificate */}
      {showNewProgressModal && selectedClaimId && (
        <DonationProgress
          claimId={selectedClaimId}
          userRole="donor"
          onClose={() => {
            setShowNewProgressModal(false);
            setSelectedClaimId(null);
          }}
        />
      )}
    </div>
  );
};

// HomeTab Component
interface HomeTabProps {
  listings: any[];
  claims: any[];
  activeDonations: number;
  expiringSoon: number;
  totalMeals: number;
  distinctNGOs: number;
  recentDonations: any[];
  pendingRequests: any[];
  isCompany: boolean;
  rewardPoints: number;
  onAddDonation: () => void;
  profile: any;
  navigate: any;
  updateClaimStatus: (claimId: string, status: 'approved' | 'rejected' | 'fulfilled' | 'cancelled') => Promise<void>;
  setSelectedClaimId: (id: string) => void;
  setShowNewProgressModal: (show: boolean) => void;
}

const HomeTab: React.FC<HomeTabProps> = ({
  listings,
  claims,
  activeDonations,
  expiringSoon,
  totalMeals,
  distinctNGOs,
  recentDonations,
  pendingRequests,
  isCompany,
  rewardPoints,
  onAddDonation,
  profile,
  navigate,
  updateClaimStatus,
  setSelectedClaimId,
  setShowNewProgressModal
}) => {
  const claimedCount = listings.filter(l => l.status === 'claimed' || l.claimed).length;
  const milestoneMessage = totalMeals >= 100 ? '🏅 Incredible! 100+ meals shared!' 
    : totalMeals >= 50 ? '🎉 You\'ve reached 50 meals donated!' 
    : totalMeals >= 10 ? '👏 Great start – 10 meals donated!' 
    : null;

  return (
    <div className="space-y-8">
      {/* Aadhaar Verification Banner - Show only if NOT verified */}
      {!(profile as any)?.aadhaarVerified && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-fintech p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertCircle className="text-amber-600" size={24} />
              </div>
              <div>
                <p className="font-bold text-amber-900">Aadhaar Not Verified</p>
                <p className="text-sm text-amber-700">Complete verification to increase trust and credibility</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/verify-aadhaar')}
              className="bg-gradient-to-r from-blue-700 to-cyan-500 text-white font-bold px-5 py-2 rounded-lg hover:from-blue-800 hover:to-cyan-600 transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <Shield size={18} />
              Verify Now
            </button>
          </div>
        </motion.div>
      )}

      {/* Quick Add Donation Button */}
      <div className="card-fintech p-5">
        <button 
          onClick={onAddDonation} 
          className="w-full bg-gradient-to-r from-blue-700 to-cyan-500 text-white font-bold px-6 py-4 rounded-xl hover:from-blue-800 hover:to-cyan-600 shadow-lg hover:shadow-xl transition-all"
        >
          <span className="text-xl">Add New Donation</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Active Donations Summary */}
        <div className="card-fintech p-5">
          <h3 className="text-sm font-semibold text-slate-600 mb-2">Active Donations</h3>
          <p className="text-2xl font-black text-zinc-900">{activeDonations} <span className="text-base font-semibold text-slate-400">active</span></p>
          <p className="text-xs text-slate-500 mt-1">{claimedCount} claimed · {pendingRequests.length} pending</p>
          {expiringSoon > 0 && <p className="mt-2 text-[11px] font-semibold text-amber-600">{expiringSoon} expiring &lt;6h</p>}
        </div>

        {/* Impact Overview */}
        <div className="card-fintech p-5">
          <h3 className="text-sm font-semibold text-slate-600 mb-2">Impact Overview</h3>
          <p className="text-2xl font-black text-zinc-900">{totalMeals}<span className="text-base font-semibold text-slate-400 ml-1">meals</span></p>
          <p className="text-xs text-slate-500 mt-1">Helped {distinctNGOs} NGOs</p>
          {milestoneMessage && <p className="mt-2 text-[11px] font-semibold text-blue-700">{milestoneMessage}</p>}
        </div>

        {/* Rewards or Company Stats */}
        <div className="card-fintech p-5">
          <h3 className="text-sm font-semibold text-slate-600 mb-2">{isCompany ? 'CSR Impact' : 'Reward Points'}</h3>
          <p className="text-2xl font-black text-zinc-900">{isCompany ? totalMeals : rewardPoints}<span className="text-base font-semibold text-slate-400 ml-1">{isCompany ? 'meals' : 'pts'}</span></p>
          <p className="text-xs text-slate-500 mt-1">{isCompany ? 'Corporate Social Responsibility' : 'Earn more by donating'}</p>
        </div>
      </div>

      {/* Recent Donations */}
      <div className="card-fintech p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide">Recent Donations</h3>
        </div>
        {recentDonations.length === 0 && <p className="text-xs text-slate-500">No donations yet.</p>}
        <ul className="divide-y divide-slate-100">
          {recentDonations.map(r => {
            const created = r.createdAt?.toDate ? r.createdAt.toDate() : null;
            const tsLabel = created ? created.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
            
            // Check for related claim to get the correct status
            const relatedClaim = claims.find(c => c.foodItemId === r.id);
            const status = relatedClaim ? relatedClaim.status : (r.status || (r.claimed ? 'claimed' : 'available'));
            
            return (
              <li key={r.id} className="py-2 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono text-slate-400">{tsLabel}</span>
                  <p className="font-medium text-zinc-900 truncate">{r.foodName || r.name}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                  status === 'requested' ? 'bg-amber-100 text-amber-700' : 
                  status === 'approved' ? 'bg-blue-100 text-blue-700' : 
                  status === 'picked_up' ? 'bg-purple-100 text-purple-700' :
                  status === 'in_transit' ? 'bg-orange-100 text-orange-700' :
                  status === 'delivered' ? 'bg-green-100 text-green-700' :
                  status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                  status === 'fulfilled' ? 'bg-emerald-100 text-emerald-700' :
                  status === 'claimed' ? 'bg-blue-100 text-blue-700' : 
                  status === 'available' ? 'bg-green-100 text-green-700' : 
                  'bg-slate-100 text-slate-600'
                }`}>{status}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="card-fintech p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide">Pending Requests</h3>
            <span className="text-[10px] font-semibold text-slate-500">{pendingRequests.length} total</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {pendingRequests.map((req: any) => {
              const whenTs = req.requestedAt?.toDate && req.requestedAt.toDate();
              const when = whenTs ? whenTs.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
              return (
                <li key={req.id} className="py-2 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-slate-400 whitespace-nowrap">{when}</span>
                    <p className="font-medium text-zinc-900 truncate">{req.recipientName || 'NGO'} requested {req.foodName || 'Food'} ({req.quantity || 1})</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={async () => { 
                        await updateClaimStatus(req.id, 'approved'); 
                        toast.success('Request approved'); 
                      }}
                      className="px-2 py-1 rounded-md text-[11px] font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={async () => { 
                        await updateClaimStatus(req.id, 'rejected'); 
                        toast.info('Request rejected'); 
                      }}
                      className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        setSelectedClaimId(req.id);
                        setShowNewProgressModal(true);
                      }}
                      className="px-2 py-1 rounded-md text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      📊 Track
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

// AddDonationForm Component
const AddDonationForm: React.FC = () => {
  const { addListing } = useFoodListings('donor');
  const [submitting, setSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationData, setLocationData] = useState<{ location: string; lat?: number; lng?: number }>({ location: '' });

  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Try to get address from Google Maps Geocoding API
        try {
          const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
          if (apiKey) {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
            );
            const data = await response.json();
            
            if (data.results && data.results[0]) {
              const address = data.results[0].formatted_address;
              setLocationData({ location: address, lat, lng });
            } else {
              // Fallback to coordinates
              setLocationData({ location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, lat, lng });
            }
          } else {
            // No API key, use coordinates
            setLocationData({ location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, lat, lng });
          }
        } catch (error) {
          console.error('Geocoding failed:', error);
          // Fallback to coordinates
          setLocationData({ location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, lat, lng });
        }

        setGettingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to get your location. Please check browser permissions.');
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    const form = evt.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get('name') || '').trim(),
      quantity: Number(fd.get('quantity') || 0),
      expiry: String(fd.get('expiry') || ''),
      preparedTime: String(fd.get('preparedTime') || '').trim() || undefined,
      location: String(fd.get('location') || ''),
      foodType: String(fd.get('foodType') || '').trim() || undefined,
      preparationType: String(fd.get('preparationType') || 'cooked').trim(),
      latitude: locationData.lat,
      longitude: locationData.lng
    };
    if (!payload.name || !payload.quantity || !payload.expiry || !payload.location) return;
    try {
      setSubmitting(true);
      await addListing({ ...payload, foodType: payload.foodType?.toLowerCase() } as any);
      form.reset();
      setLocationData({ location: '' });
      // Success - could show success message or navigate
      alert('Donation added successfully!');
    } catch (e: any) {
      console.error('Failed to add donation:', e);
      alert('Failed to add donation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-zinc-900 mb-1">Create New Donation</h2>
        <p className="text-slate-600 text-sm">Fill in the details below to create a new food donation</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Food Name *</label>
            <input 
              name="name" 
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              placeholder="e.g., Rice & Dal" 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Food Type *</label>
            <select 
              name="foodType" 
              defaultValue="veg" 
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="veg">Veg</option>
              <option value="non-veg">Non-Veg</option>
              <option value="rice">Rice</option>
              <option value="bread">Bread</option>
              <option value="curry">Curry</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Preparation Type *</label>
            <select 
              name="preparationType" 
              defaultValue="cooked" 
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="raw">Raw</option>
              <option value="cooked">Cooked</option>
              <option value="packaged">Packaged</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Quantity (meals) *</label>
            <input 
              name="quantity" 
              type="number" 
              min="1" 
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              placeholder="e.g., 50"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Prepared Time (optional)</label>
            <input 
              name="preparedTime" 
              type="datetime-local" 
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            />
            <p className="text-xs text-slate-500 mt-1">When was the food cooked?</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Expiry Date *</label>
            <input 
              name="expiry" 
              type="date" 
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              required 
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Pickup Location *</label>
            <div className="flex gap-3">
              <input 
                name="location" 
                value={locationData.location}
                onChange={(e) => setLocationData({ ...locationData, location: e.target.value })}
                className="flex-1 px-4 py-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="e.g., 123 Main St, Bangalore" 
                required 
              />
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={gettingLocation}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="Use my current location"
              >
                <svg 
                  className={gettingLocation ? 'animate-spin' : ''} 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                {gettingLocation ? 'Getting...' : 'GPS'}
              </button>
            </div>
            {locationData.lat && locationData.lng && (
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Location captured: {locationData.lat.toFixed(6)}, {locationData.lng.toFixed(6)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
          <button 
            disabled={submitting} 
            type="submit" 
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-700 to-cyan-500 text-white font-bold disabled:opacity-50 hover:from-blue-800 hover:to-cyan-600 transition-all"
          >
            {submitting ? 'Creating...' : 'Create Donation'}
          </button>
          <button 
            type="button" 
            onClick={() => window.history.back()}
            className="px-6 py-3 rounded-lg bg-slate-200 text-slate-700 font-semibold hover:bg-slate-300 transition-all"
          >
            Cancel
          </button>
          <span className="text-xs text-slate-500 ml-2">💡 AI matches using freshness + urgency + distance</span>
        </div>
      </form>
    </div>
  );
};

// DonationsTab Component
interface DonationsTabProps {
  listings: any[];
  claims: any[];
  onDonationClick?: (donation: any) => void;
}

const DonationsTab: React.FC<DonationsTabProps> = ({ listings, claims, onDonationClick }) => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-zinc-900 mb-1">My Donations</h2>
        <p className="text-slate-600 text-sm">View and manage all your donations</p>
      </div>

      <div className="card-fintech overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="py-2 pr-4 font-semibold text-slate-600">Date</th>
              <th className="py-2 pr-4 font-semibold text-slate-600">Food</th>
              <th className="py-2 pr-4 font-semibold text-slate-600">Qty</th>
              <th className="py-2 pr-4 font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {listings.map(r => {
              const created = r.createdAt?.toDate ? r.createdAt.toDate() : null;
              const dateStr = created ? created.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—';
              
              // Check for related claim to get the correct status
              const relatedClaim = claims?.find(c => c.foodItemId === r.id);
              const status = relatedClaim ? relatedClaim.status : (r.status || (r.claimed ? 'claimed' : 'available'));
              const hasRequest = status === 'requested';
              return (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-2 pr-4 text-slate-600 whitespace-nowrap">{dateStr}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onDonationClick?.(r)}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left transition-colors"
                      >
                        {r.foodName || r.name}
                      </button>
                      {hasRequest && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full animate-pulse">
                          🔔 REQUEST
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-slate-600">{r.quantity} {r.quantityUnit || 'meals'}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
                      status === 'requested' ? 'bg-yellow-100 text-yellow-700' :
                      status === 'approved' ? 'bg-blue-100 text-blue-700' : 
                      status === 'picked_up' ? 'bg-purple-100 text-purple-700' :
                      status === 'in_transit' ? 'bg-orange-100 text-orange-700' :
                      status === 'delivered' ? 'bg-green-100 text-green-700' :
                      status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                      status === 'fulfilled' ? 'bg-emerald-100 text-emerald-700' :
                      status === 'claimed' ? 'bg-blue-100 text-blue-700' : 
                      status === 'available' ? 'bg-green-100 text-green-700' : 
                      'bg-slate-100 text-slate-600'
                    }`}>{status}</span>
                  </td>
                </tr>
              );
            })}
            {listings.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-slate-500">No donations yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// RewardsTab Component
const RewardsTab: React.FC<{ points: number; co2Saved: number; totalMeals: number }> = ({ points, co2Saved, totalMeals }) => {
  const badges: Array<{ name: string; icon: string }> = [];
  if (totalMeals >= 10) badges.push({ name: 'First 10 Meals', icon: '🎯' });
  if (totalMeals >= 50) badges.push({ name: '50 Meal Milestone', icon: '⭐' });
  if (totalMeals >= 100) badges.push({ name: '100+ Meals Hero', icon: '🏆' });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-zinc-900 mb-1">Rewards & Impact</h2>
        <p className="text-slate-600 text-sm">Track your environmental impact and earn rewards</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-fintech p-6">
          <h3 className="text-sm font-semibold text-slate-600 mb-2">Reward Points</h3>
          <p className="text-4xl font-black text-blue-700">{points}</p>
          <p className="text-xs text-slate-500 mt-2">Keep donating to earn more!</p>
        </div>
        <div className="card-fintech p-6">
          <h3 className="text-sm font-semibold text-slate-600 mb-2">CO₂ Saved</h3>
          <p className="text-4xl font-black text-green-700">{co2Saved}kg</p>
          <p className="text-xs text-slate-500 mt-2">Environmental impact</p>
        </div>
        <div className="card-fintech p-6">
          <h3 className="text-sm font-semibold text-slate-600 mb-2">Total Meals</h3>
          <p className="text-4xl font-black text-purple-700">{totalMeals}</p>
          <p className="text-xs text-slate-500 mt-2">Meals donated</p>
        </div>
      </div>

      <div className="card-fintech p-6">
        <h3 className="text-lg font-black text-zinc-900 mb-4">Your Badges</h3>
        {badges.length === 0 && <p className="text-sm text-slate-500">Start donating to earn badges!</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {badges.map(b => (
            <div key={b.name} className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
              <span className="text-3xl">{b.icon}</span>
              <span className="font-semibold text-zinc-900">{b.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// CSRTab Component
const CSRTab: React.FC<{ claims: any[] }> = ({ claims }) => {
  const approvedClaims = claims.filter((c: any) => c.status === 'approved' || c.status === 'fulfilled');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-zinc-900 mb-1">CSR Certificates</h2>
        <p className="text-slate-600 text-sm">Download verified donation certificates for your records</p>
      </div>

      <div className="card-fintech">
        <h3 className="text-lg font-black text-zinc-900 mb-4">Available Certificates</h3>
        {approvedClaims.length === 0 && <p className="text-sm text-slate-500">No certificates available yet. Complete donations to generate certificates.</p>}
        <ul className="divide-y divide-slate-100">
          {approvedClaims.map((claim: any) => (
            <li key={claim.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-zinc-900">{claim.foodName || 'Food Donation'}</p>
                <p className="text-xs text-slate-500">NGO: {claim.recipientName || 'Unknown'} · Qty: {claim.quantity || 0}</p>
              </div>
              <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-700 to-cyan-500 text-white font-semibold text-sm">Download PDF</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// SupportTab Component
const SupportTab: React.FC = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-zinc-900 mb-1">Support Logistics</h2>
        <p className="text-slate-600 text-sm">Help fund delivery and operational costs with micro-donations</p>
      </div>

      <div className="card-fintech p-6">
        <h3 className="text-lg font-black text-zinc-900 mb-4">Micro-Donation Options</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[5, 10, 20, 50].map(amount => (
            <button key={amount} className="p-6 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition">
              <p className="text-2xl font-black text-zinc-900">₹{amount}</p>
              <p className="text-xs text-slate-500 mt-1">Support delivery</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-6">Your contribution helps NGOs with transportation and logistics costs.</p>
      </div>
    </div>
  );
};

export default DonorDashboard;

