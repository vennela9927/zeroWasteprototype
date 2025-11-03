import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { getAuth, signOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import FoodListingsTable from '../components/FoodListingsTable';
import ProfileSettings from '../components/ProfileSettings';
import PublicProfileModal from '../components/PublicProfileModal';
import DonorAnalytics from '../components/DonorAnalytics';
import NGOAnalytics from '../components/NGOAnalytics';
import DonorHistory from '../components/DonorHistory';
import NGOHistory from '../components/NGOHistory';
import DonationQRCode from '../components/DonationQRCode';
import RewardsWidget from '../components/RewardsWidget';
import FoodManagement from '../components/FoodManagement';
import { generateDonationCertificate } from '../utils/csrCertificate';
import { getAuditTrail } from '../utils/auditLog';
import { fetchUserProfile } from '../lib/fetchUserProfile';
import { useClaims } from '../hooks/useClaims';
import { useAuth } from '../context/AuthContext';
import { useFoodListings } from '../hooks/useFoodListings';
import { sortListingsByRelevance } from '../utils/smartMatching';

const Dashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState('home');
  // Location search (NGO view)
  const [ngoLocationQuery, setNgoLocationQuery] = useState('');
  // Sidebar no longer toggled in this layout; removed open state.
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  useEffect(() => {
    if (user === null) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const effectiveRole = profile?.role || 'donor';
  const userDisplayName = profile?.name || user?.displayName || user?.email || 'User';
  const userTypeForListings: 'donor' | 'ngo' = effectiveRole === 'recipient' ? 'ngo' : 'donor';
  const { listings: foodListings, addListing, claimListing, updateListing, cancelListing, discardListing, extendListingExpiry, loading, error: listingsError } = useFoodListings(userTypeForListings);
  // Wrapper functions for donor management feature (only used in donor Food Management)
  const updateListingForDonor = async (id: string, patch: any) => updateListing(id, patch);
  const cancelListingForDonor = async (id: string) => cancelListing(id);
  const discardListingForDonor = async (id: string) => discardListing(id);
  const extendListingForDonor = async (id: string, minutes: number) => extendListingExpiry(id, minutes);
  const roleForClaims = profile?.role === 'recipient' ? 'recipient' : 'donor';
  const { claims, updateClaimStatus } = useClaims(roleForClaims);
  const [publicProfile, setPublicProfile] = useState<any|null>(null);
  const [publicProfileOpen, setPublicProfileOpen] = useState(false);

  // Removed timeline & AI widget on NGO home minimal spec

  // Smart sorting for NGO view
  const smartSortedListings = useMemo(() => {
    if (userTypeForListings === 'ngo' && profile) {
      // Apply smart sorting based on NGO profile
      const ngoProfile = {
        foodPreference: profile.foodPreference,
        capacity: profile.capacity,
        latitude: profile.latitude,
        longitude: profile.longitude,
        preparationCapability: profile.preparationCapability,
      };
      
      return sortListingsByRelevance(foodListings, ngoProfile);
    }
    return foodListings;
  }, [foodListings, profile, userTypeForListings]);

  // For now: show all available foods (no smart sorting constraints for NGO)
  const filteredNgoListings = userTypeForListings === 'ngo'
    ? foodListings.filter(l =>
        ngoLocationQuery.trim() === '' ||
        (l.location || '').toLowerCase().includes(ngoLocationQuery.trim().toLowerCase())
      )
    : smartSortedListings;

  const handleClaimFood = async (id: string) => {
    try {
      // Find the listing to get its match score for AI learning
      const listing = filteredNgoListings.find(l => l.id === id);
      const matchScore = (listing as any)?._matchScore;
      
      await claimListing(id, matchScore);
      toast.success('Request sent to donor for approval');
    } catch (error) {
      console.error('[handleClaimFood] Error:', error);
      toast.error('Failed to send request: ' + (error as Error).message);
    }
  };


  const renderDonorDashboard = () => {
    const now = new Date();
    const isExpired = (l: any) => {
      try { return l.expiryTime?.toDate && l.expiryTime.toDate() < now; } catch { return false; }
    };
  const activeListings = foodListings.filter(l => !l.claimed && !isExpired(l));
    const expiringSoon = activeListings.filter(l => {
      const d = l.expiryTime?.toDate && l.expiryTime.toDate();
      return d && d.getTime() - now.getTime() < 1000 * 60 * 60 * 6; // < 6h
    }).length;
  // claimedListingsCount no longer displayed on simplified home

    const pendingClaims = claims.filter(c => c.status === 'requested');
    // Fallback: also include listings marked as requested (in case claim.donorId was missing)
    const requestedFromListings = foodListings
      .filter((l: any) => l.status === 'requested')
      .map((l: any) => ({
        id: `req_listing_${l.id}`,
        status: 'requested',
        requestedAt: l.requestedAt,
        recipientName: 'NGO',
        location: l.location,
        quantity: l.quantity,
        foodName: l.foodName || l.name,
      }));
    const pendingRequests = [...pendingClaims, ...requestedFromListings];

    // --- New Home Page Summary Widgets ---
    // Active donations summary
    const availableOrRequested = foodListings.filter(l => {
      const d = l.expiryTime?.toDate ? l.expiryTime.toDate() : null;
      const expired = d ? d.getTime() < Date.now() : false;
      return !expired && (l.status === 'available' || l.status === 'requested');
    });
    const claimedCount = foodListings.filter(l => l.status === 'claimed' || l.claimed).length;
    // Recent donation history (last 3 by createdAt)
    const recentDonations = [...foodListings]
      .filter(l => l.createdAt)
      .sort((a: any, b: any) => {
        const at = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bt = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return bt - at;
      })
      .slice(0, 3);
    // Impact overview (all time)
    const distinctNGOs = new Set(
      claims
        .filter((c: any) => c.status === 'approved' || c.status === 'fulfilled')
        .map((c: any) => c.recipientId)
    ).size;
    const totalMealsAllTime = claims
      .filter((c: any) => c.status === 'approved' || c.status === 'fulfilled')
      .reduce((sum: number, c: any) => sum + (c.quantity || 0), 0);
    // Upcoming soonest expiry (within next 12h) among active
    const soonestActive = availableOrRequested
      .map(l => ({
        ref: l,
        date: l.expiryTime?.toDate ? l.expiryTime.toDate() : (l.expiry ? new Date(l.expiry) : null)
      }))
      .filter(x => x.date && x.date.getTime() > Date.now())
      .sort((a, b) => (a.date!.getTime() - b.date!.getTime()))[0];
    const hoursLeft = soonestActive ? Math.max(0, Math.round((soonestActive.date!.getTime() - Date.now()) / 360000) / 10) : null; // one decimal hour
    // AI suggestion highlight (simple heuristic)
    const aiBestWindow = '6–8 PM';
    // Motivational badge milestone
    let milestoneMessage: string | null = null;
    if (totalMealsAllTime >= 50 && totalMealsAllTime < 100) milestoneMessage = '🎉 You\'ve reached 50 meals donated!';
    else if (totalMealsAllTime >= 100) milestoneMessage = '🏅 Incredible! 100+ meals shared!';
    else if (totalMealsAllTime >= 10) milestoneMessage = '👏 Great start – 10 meals donated!';

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

        {/* 1. Quick Add Donation Button (prominent first) */}
        <div className="card-fintech p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-600 tracking-wide uppercase mb-1">Quick Add Donation</p>
            <h2 className="text-xl font-black text-zinc-900">Post a new food donation</h2>
            <p className="text-xs text-slate-500 mt-1">Create a listing in Food Management</p>
          </div>
          <button onClick={() => setActiveSection('food')} className="bg-gradient-to-r from-blue-700 to-cyan-500 text-white font-bold text-xs px-5 py-3 rounded-lg hover:from-blue-800 hover:to-cyan-600 shadow-sm">Go to Food Management</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* 2. Active Donations Summary */}
          <div className="card-fintech p-5">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Active Donations</h3>
            <p className="text-2xl font-black text-zinc-900">{availableOrRequested.length} <span className="text-base font-semibold text-slate-400">active</span></p>
            <p className="text-xs text-slate-500 mt-1">{claimedCount} claimed · {pendingRequests.length} pending</p>
            {expiringSoon > 0 && <p className="mt-2 text-[11px] font-semibold text-amber-600">{expiringSoon} expiring &lt;6h</p>}
          </div>

          {/* 3. Impact Overview */}
          <div className="card-fintech p-5">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Impact Overview</h3>
            <p className="text-2xl font-black text-zinc-900">{totalMealsAllTime}<span className="text-base font-semibold text-slate-400 ml-1">meals</span></p>
            <p className="text-xs text-slate-500 mt-1">Helped {distinctNGOs} NGOs</p>
            {milestoneMessage && <p className="mt-2 text-[11px] font-semibold text-blue-700">{milestoneMessage}</p>}
          </div>

          {/* 4. Rewards Widget */}
          <RewardsWidget userId={user?.uid} compact={true} />
        </div>

        {/* 5. Recent Donation History (last 3) */}
        <div className="card-fintech p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide">Recent Donations</h3>
            <button onClick={() => setActiveSection('history')} className="text-xs font-semibold text-blue-600 hover:text-blue-800">History →</button>
          </div>
          {recentDonations.length === 0 && <p className="text-xs text-slate-500">No donations yet.</p>}
          <ul className="divide-y divide-slate-100">
            {recentDonations.map(r => {
              const approvedForListing = claims.find((c:any)=>c.foodItemId===r.id && c.status==='approved');
              const created = r.createdAt?.toDate ? r.createdAt.toDate() : null;
              const tsLabel = created ? created.toLocaleString(undefined,{ month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : '—';
              const status = approvedForListing ? 'approved' : (r.status || (r.claimed ? 'claimed' : 'available'));
              return (
                <li key={r.id} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-slate-400">{tsLabel}</span>
                    <p className="font-medium text-zinc-900 truncate">{r.foodName || r.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {status==='approved' && approvedForListing && (approvedForListing as any)?.latitude != null && (approvedForListing as any)?.longitude != null ? (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${(approvedForListing as any).latitude},${(approvedForListing as any).longitude}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-600 text-white"
                        title="Open pickup location in Google Maps"
                      >
                        Maps
                      </a>
                    ) : status==='approved' && approvedForListing?.location ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(approvedForListing.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-600 text-white"
                        title="Open pickup location in Google Maps"
                      >
                        Maps
                      </a>
                    ) : status==='claimed' && (r as any)?.latitude != null && (r as any)?.longitude != null ? (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${(r as any).latitude},${(r as any).longitude}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-600 text-white"
                        title="Open pickup location in Google Maps"
                      >
                        Maps
                      </a>
                    ) : status==='claimed' && r.location ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-600 text-white"
                        title="Open pickup location in Google Maps"
                      >
                        Maps
                      </a>
                    ) : null}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${status==='approved'?'bg-blue-100 text-blue-700':status==='claimed'?'bg-blue-100 text-blue-700':status==='requested'?'bg-amber-100 text-amber-700':status==='available'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-600'}`}>{status}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* 6. Expired Donations Overview */}
        {(() => {
          const nowLocal = Date.now();
          const expiredListings = foodListings.filter(l => {
            const d = l.expiryTime?.toDate ? l.expiryTime.toDate() : (l.expiry ? new Date(l.expiry) : null);
            if (!d) return false;
            return d.getTime() < nowLocal && !['discarded'].includes(l.status || '');
          }).sort((a,b)=>{
            const at = a.expiryTime?.toDate ? a.expiryTime.toDate().getTime() : 0;
            const bt = b.expiryTime?.toDate ? b.expiryTime.toDate().getTime() : 0;
            return bt - at; // latest expired first
          });
          if (expiredListings.length === 0) return null;
          const show = expiredListings.slice(0,4);
          return (
            <div className="card-fintech p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide">Expired Donations</h3>
                <span className="text-[10px] font-semibold text-slate-500">{expiredListings.length} total</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {show.map(e => {
                  const expD = e.expiryTime?.toDate ? e.expiryTime.toDate() : (e.expiry ? new Date(e.expiry) : null);
                  const label = expD ? expD.toLocaleDateString(undefined,{ month:'short', day:'numeric'}) : '—';
                  return (
                    <li key={e.id} className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-slate-400">{label}</span>
                        <p className="font-medium text-zinc-900 truncate">{e.foodName || e.name}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-red-100 text-red-700">Expired</span>
                    </li>
                  );
                })}
              </ul>
              {expiredListings.length > show.length && (
                <p className="mt-3 text-[11px] text-slate-500 font-medium">More expired items available in Food Management (filter: Expired).</p>
              )}
            </div>
          );
        })()}

        {/* 7. Pending Requests (NGO claims awaiting your approval) */}
        {pendingRequests.length > 0 && (
          <div className="card-fintech p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide">Pending Requests</h3>
              <span className="text-[10px] font-semibold text-slate-500">{pendingRequests.length} total</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {pendingRequests.map((req:any)=>{
                const whenTs = req.requestedAt?.toDate && req.requestedAt.toDate();
                const when = whenTs ? whenTs.toLocaleString(undefined,{ month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : '—';
                return (
                  <li key={req.id} className="py-2 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-slate-400 whitespace-nowrap">{when}</span>
                      <p className="font-medium text-zinc-900 truncate">{req.recipientName || 'NGO'} requested {req.foodName || 'Food'} ({req.quantity || 1})</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {req.location && (
                        <a
                          href={((req as any)?.latitude != null && (req as any)?.longitude != null)
                            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${(req as any).latitude},${(req as any).longitude}`)}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(req.location)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-md text-[11px] font-semibold bg-blue-600 text-white"
                        >
                          View on Maps
                        </a>
                      )}
                      <button
                        onClick={async ()=>{ await updateClaimStatus(req.id, 'approved'); toast.success('Request approved'); }}
                        className="px-2 py-1 rounded-md text-[11px] font-semibold bg-green-600 text-white"
                      >Approve</button>
                      <button
                        onClick={async ()=>{ await updateClaimStatus(req.id, 'rejected'); toast.info('Request rejected'); }}
                        className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-200 text-slate-700"
                      >Reject</button>
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

  const openPublicProfile = async (p:any) => {
    // Try to enrich with Firestore profile
    let enriched = p;
    if (p.uid) {
      const doc = await fetchUserProfile(p.uid);
      if (doc) enriched = { ...doc };
    }
    setPublicProfile(enriched);
    setPublicProfileOpen(true);
  };

  const renderNGODashboard = () => {
    const approvedOrFulfilled = claims.filter((c:any)=>['approved','fulfilled'].includes(c.status));
    const mealsThisWeek = approvedOrFulfilled.reduce((s,c)=>s+(c.quantity||0),0); // (could filter by week range later)
    const availableNow = foodListings.length;
    const inTransit = claims.filter((c:any)=>c.status==='approved').length; // placeholder until in_transit status added
    const recentClaims = claims.slice(0,3);
    // Urgent alerts: soon-to-expire (<2h) listings
    const urgent = filteredNgoListings.filter((l:any)=>{
      const d = l.expiryTime?.toDate ? l.expiryTime.toDate() : (l.expiry? new Date(l.expiry): null);
      if (!d) return false; const diff = d.getTime()-Date.now(); return diff>0 && diff < 2*3600*1000;
    }).slice(0,3);
    const milestone = mealsThisWeek >= 500 ? '🎉 Your NGO has reached 500 meals served!' : mealsThisWeek>=100? '👏 100+ meals this week!' : null;

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

        {/* Top snapshot row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-fintech p-5">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Active Donations</h3>
            <p className="text-2xl font-black text-zinc-900">{availableNow} <span className="text-base font-semibold text-slate-400">available</span></p>
            <p className="text-xs text-slate-500 mt-1">{inTransit} in transit / approved</p>
          </div>
          <div className="card-fintech p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-600 mb-2">Quick Claim</h3>
              <p className="text-xs text-slate-500">Jump to available donations list</p>
            </div>
            <button onClick={()=>setActiveSection('food')} className="mt-4 bg-gradient-to-r from-blue-700 to-cyan-500 text-white text-xs font-bold px-4 py-2 rounded-lg hover:from-blue-800 hover:to-cyan-600">Browse & Claim</button>
          </div>
          <div className="card-fintech p-5">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Impact This Week</h3>
            <p className="text-2xl font-black text-zinc-900">{mealsThisWeek}<span className="text-base font-semibold text-slate-400 ml-1">meals</span></p>
            {milestone && <p className="text-[11px] font-semibold text-blue-700 mt-2">{milestone}</p>}
          </div>
        </div>

        {/* Recent Claims + Urgent Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 card-fintech p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide">Recent Claims</h3>
              <button onClick={()=>setActiveSection('history')} className="text-xs font-semibold text-blue-600 hover:text-blue-800">History →</button>
            </div>
            {recentClaims.length===0 && <p className="text-xs text-slate-500">No claims yet.</p>}
            <ul className="divide-y divide-slate-100">
              {recentClaims.map(c=>{
                const tsOrder = c.fulfilledAt || c.approvedAt || c.requestedAt;
                let when = '—'; try { if (tsOrder?.toDate) when = tsOrder.toDate().toLocaleString(undefined,{ month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});} catch {}
                return (
                  <li key={c.id} className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-slate-400">{when}</span>
                      <p className="font-medium text-zinc-900 truncate">{c.foodName || 'Food Item'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.status==='approved' && (c as any)?.latitude != null && (c as any)?.longitude != null ? (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${(c as any).latitude},${(c as any).longitude}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-600 text-white"
                          title="Open pickup location in Google Maps"
                        >
                          Maps
                        </a>
                      ) : c.status==='approved' && c.location ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.location)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-600 text-white"
                          title="Open pickup location in Google Maps"
                        >
                          Maps
                        </a>
                      ) : null}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${c.status==='fulfilled'?'bg-green-100 text-green-700':c.status==='approved'?'bg-blue-100 text-blue-700':c.status==='requested'?'bg-amber-100 text-amber-700':c.status==='cancelled'?'bg-slate-200 text-slate-600':'bg-slate-100 text-slate-600'}`}>{c.status}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="space-y-6">
            <div className="card-fintech p-5">
              <h3 className="text-sm font-semibold text-slate-600 mb-2">Urgent Alerts</h3>
              {urgent.length===0 && <p className="text-xs text-slate-500">No urgent expiries.</p>}
              <ul className="space-y-2 text-xs">
                {urgent.map(u=>{
                  const d = u.expiryTime?.toDate ? u.expiryTime.toDate() : (u.expiry? new Date(u.expiry): null);
                  let mins = 0; if (d) mins = Math.round((d.getTime()-Date.now())/60000);
                  return <li key={u.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 px-2 py-1 rounded-md"><span className="font-medium text-amber-800 truncate mr-2">{u.foodName || u.name}</span><span className="text-amber-700 font-semibold">{mins}m</span></li>;
                })}
              </ul>
            </div>
            <div className="card-fintech p-5">
              <h3 className="text-sm font-semibold text-slate-600 mb-2">AI Suggestion</h3>
              <p className="text-sm font-medium text-zinc-900">Best claim window:</p>
              <p className="text-lg font-black bg-gradient-to-r from-blue-700 to-cyan-500 bg-clip-text text-transparent">6–8 PM</p>
            </div>
          </div>
        </div>

        {/* Available Listings */}
        <div className="card-fintech">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-fintech-black mb-2">Available Food Listings</h2>
            <p className="text-slate-600">Discover and claim food donations near you</p>
            <div className="mt-4">
              <label htmlFor="ngo-location-search" className="block text-sm font-semibold text-slate-700 mb-2">Search by Location</label>
              <input id="ngo-location-search" type="text" value={ngoLocationQuery} onChange={e=>setNgoLocationQuery(e.target.value)} placeholder="Enter area / location keyword" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50" />
              {ngoLocationQuery && <p className="text-xs text-slate-500 mt-1">Filtering {filteredNgoListings.length} of {foodListings.length} listings</p>}
            </div>
          </div>
          {loading && <p className="text-slate-500 text-sm">Loading...</p>}
          {listingsError && !loading && <div className="text-red-600 text-sm font-medium mb-4">{listingsError}</div>}
          {!loading && !listingsError && (
            <FoodListingsTable
              listings={filteredNgoListings as any}
              userType="ngo"
              onClaim={handleClaimFood}
              onOpenProfile={(p)=>openPublicProfile({ uid: p.uid, name: p.name || 'Donor', role:'donor' })}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      
      <div className="lg:ml-20">
        {user && (
          <TopBar userType={userTypeForListings === 'donor' ? 'donor' : 'ngo'} userName={userDisplayName} />
        )}
        
        <main className="p-6 pb-24 lg:pb-8 max-w-[1600px] mx-auto">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeSection === 'home' && (
              userTypeForListings === 'donor' ? renderDonorDashboard() : renderNGODashboard()
            )}
            
            {activeSection === 'food' && userTypeForListings === 'donor' && (
              <DonorFoodManagement
                listings={foodListings as any}
                add={async (d:any) => addListing(d)}
                edit={async (id:string, patch:any) => updateListingForDonor(id, patch)}
                cancel={async (id:string) => cancelListingForDonor(id)}
                discard={async (id:string) => discardListingForDonor(id)}
                extend={async (id:string, m:number) => extendListingForDonor(id, m)}
              />
            )}
            {activeSection === 'food' && userTypeForListings === 'ngo' && (
              <FoodManagement />
            )}
            
            {activeSection === 'history' && userTypeForListings === 'donor' && (
              <DonorHistory listings={foodListings as any} claims={claims as any} />
            )}
            {activeSection === 'history' && userTypeForListings === 'ngo' && (
              <NGOHistory claims={claims as any} listings={foodListings as any} />
            )}
            
            {activeSection === 'analytics' && userTypeForListings === 'donor' && (
              <DonorAnalytics listings={foodListings as any} claims={claims as any} />
            )}
            {activeSection === 'analytics' && userTypeForListings === 'ngo' && (
              <NGOAnalytics claims={claims as any} listings={foodListings as any} />
            )}
            
            {activeSection === 'profile' && <ProfileSettings />}
          </motion.div>
        </main>
      </div>
      <PublicProfileModal
        open={publicProfileOpen}
        onClose={() => setPublicProfileOpen(false)}
        profile={publicProfile}
        stats={undefined}
      />
    </div>
  );
};

export default Dashboard;

// Inline donor food management component (could be split out later)
interface DonorFoodManagementProps { listings: any[]; add: (d:any)=>Promise<any>; edit: (id:string,p: any)=>Promise<any>; cancel:(id:string)=>Promise<any>; discard:(id:string)=>Promise<any>; extend:(id:string, minutes:number)=>Promise<any>; }
const DonorFoodManagement: React.FC<DonorFoodManagementProps> = ({ listings, add, edit, cancel, discard, extend }) => {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any|null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [filter, setFilter] = React.useState<'active'|'claimed'|'expired'|'all'>('active');
  const [qrViewItem, setQrViewItem] = React.useState<any|null>(null);

  const deriveStatus = (l:any) => {
    if (l.status === 'requested') return 'requested';
    if (l.status === 'in_transit') return 'in_transit';
    if (l.status === 'discarded') return 'discarded';
    if (l.status === 'cancelled') return 'cancelled';
    if (l.claimed || l.status === 'claimed') return 'claimed';
    const d = l.expiryTime?.toDate ? l.expiryTime.toDate(): (l.expiry? new Date(l.expiry): null);
    if (d && d.getTime() < Date.now()) return 'expired';
    return 'available';
  };
  const withStatus = listings.map(l => ({ ...l, _status: deriveStatus(l) }));
  const filtered = withStatus.filter(l => {
    if (filter==='all') return true;
    if (filter==='active') return ['available','requested'].includes(l._status);
    return l._status === filter;
  });

  const handleSubmit = async (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    const fd = new FormData(evt.currentTarget);
    const payload = {
      name: String(fd.get('name')||'').trim(),
      quantity: Number(fd.get('quantity')||0),
      expiry: String(fd.get('expiry')||''),
      preparedTime: String(fd.get('preparedTime')||'').trim() || undefined,
      location: String(fd.get('location')||''),
      foodType: String(fd.get('foodType')||'').trim() || undefined,
      preparationType: String(fd.get('preparationType')||'cooked').trim()
    };
    if (!payload.name || !payload.quantity || !payload.expiry || !payload.location) return;
    try {
      setSubmitting(true);
      if (editing) {
        await edit(editing.id, { 
          foodName: payload.name, 
          name: payload.name, 
          quantity: payload.quantity, 
          expiry: payload.expiry, 
          location: payload.location, 
          foodType: payload.foodType?.toLowerCase(),
          preparationType: payload.preparationType?.toLowerCase() as 'raw'|'cooked'|'packaged',
          preparedTime: payload.preparedTime
        });
        toast.success('Donation updated');
      } else {
        await add({ ...payload, foodType: payload.foodType?.toLowerCase() } as any);
        toast.success('Donation added');
      }
      setEditing(null); setFormOpen(false); evt.currentTarget.reset();
    } catch (e:any) {
      toast.error(e?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  // Duplicate functionality removed per request

  const badge = (s:string) => {
    const map: any = {
      available:'bg-green-100 text-green-700', requested:'bg-amber-100 text-amber-700', claimed:'bg-blue-100 text-blue-700', expired:'bg-red-100 text-red-700', cancelled:'bg-slate-200 text-slate-700', discarded:'bg-slate-300 text-slate-700', in_transit:'bg-purple-100 text-purple-700'
    }; return map[s]||'bg-slate-100 text-slate-600'; };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 mb-1">Food Management</h2>
          <p className="text-slate-600 text-sm">Create & control live donations</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-2">
          {(['active','claimed','expired','all'] as const).map(f => (
            <button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${filter===f?'bg-gradient-to-r from-blue-700 to-cyan-500 text-white':'text-slate-600 hover:bg-slate-100'}`}>{f}</button>
          ))}
        </div>
        <button onClick={()=>{ setEditing(null); setFormOpen(o=>!o); }} className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-700 to-cyan-500 text-white text-xs font-bold">{formOpen? 'Close' : 'Add Donation'}</button>
      </div>
      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Food Name</label>
            <input name="name" defaultValue={editing?.foodName||editing?.name||''} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" placeholder="e.g., Rice & Dal" required />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Food Type</label>
            <select name="foodType" defaultValue={editing?.foodType||'veg'} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm">
              <option value="veg">Veg</option>
              <option value="non-veg">Non-Veg</option>
              <option value="rice">Rice</option>
              <option value="bread">Bread</option>
              <option value="curry">Curry</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Preparation</label>
            <select name="preparationType" defaultValue={(editing as any)?.preparationType||'cooked'} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm">
              <option value="raw">Raw</option>
              <option value="cooked">Cooked</option>
              <option value="packaged">Packaged</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Quantity (meals)</label>
            <input name="quantity" type="number" defaultValue={editing?.quantity||''} min="1" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" required />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Prepared Time</label>
            <input name="preparedTime" type="datetime-local" defaultValue={(editing as any)?.preparedTime || ''} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            <p className="text-[9px] text-slate-500 mt-0.5">When was food cooked? (optional)</p>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Expiry Date</label>
            <input name="expiry" type="date" defaultValue={editing?.expiry || ''} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" required />
          </div>
          <div className="md:col-span-3">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Pickup Location</label>
            <input name="location" defaultValue={editing?.location||''} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" placeholder="e.g., 123 Main St, Bangalore" required />
          </div>
          <div className="md:col-span-3 flex items-end gap-2">
            <button disabled={submitting} type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-50">{editing? 'Save Changes':'Create Donation'}</button>
            {editing && <button type="button" onClick={()=>{setEditing(null);}} className="px-3 py-2 rounded-lg bg-slate-200 text-xs font-semibold">Cancel Edit</button>}
            <span className="text-[10px] text-slate-500 ml-2">💡 AI matches using freshness + urgency + distance</span>
          </div>
        </form>
      )}
      <div className="card-fintech">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-zinc-900">Live Donations</h3>
          <span className="text-xs text-slate-500 font-medium">{filtered.length} shown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="py-2 pr-4 font-semibold text-slate-600">Food</th>
                <th className="py-2 pr-4 font-semibold text-slate-600">Qty</th>
                <th className="py-2 pr-4 font-semibold text-slate-600">Expiry</th>
                <th className="py-2 pr-4 font-semibold text-slate-600">Status</th>
                <th className="py-2 pr-4 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                const expiryDate = l.expiryTime?.toDate ? l.expiryTime.toDate() : (l.expiry ? new Date(l.expiry) : null);
                const expiryStr = expiryDate ? expiryDate.toLocaleDateString(undefined,{ month:'short', day:'numeric'}) : '—';
                return (
                  <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 pr-4 font-medium text-zinc-900 whitespace-nowrap max-w-[140px] truncate">{l.foodName || l.name || 'Item'}</td>
                    <td className="py-2 pr-4 text-slate-600">{l.quantity}</td>
                    <td className="py-2 pr-4 text-slate-600 whitespace-nowrap">{expiryStr}</td>
                    <td className="py-2 pr-4"><span className={`px-2 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${badge(l._status)}`}>{l._status}</span></td>
                    <td className="py-2 pr-4 space-x-1 whitespace-nowrap">
                      {/* QR Code Action - Always available for tracking */}
                      <button onClick={()=>setQrViewItem(l)} className="text-xs font-semibold px-2 py-1 rounded-md bg-emerald-200 hover:bg-emerald-300">📱 QR</button>
                      {/* Copy action removed */}
                      {['available','requested'].includes(l._status) && <button onClick={()=>setEditing(l)} className="text-xs font-semibold px-2 py-1 rounded-md bg-blue-200 hover:bg-blue-300">Edit</button>}
                      {['available','requested'].includes(l._status) && <button onClick={()=>cancel(l.id)} className="text-xs font-semibold px-2 py-1 rounded-md bg-orange-200 hover:bg-orange-300">Cancel</button>}
                      {['expired','available','requested'].includes(l._status) && <button onClick={()=>discard(l.id)} className="text-xs font-semibold px-2 py-1 rounded-md bg-red-200 hover:bg-red-300">Discard</button>}
                      {['available','requested'].includes(l._status) && <button onClick={()=>extend(l.id, 60)} className="text-xs font-semibold px-2 py-1 rounded-md bg-purple-200 hover:bg-purple-300">+1h</button>}
                      {/* Delete option removed per requirement */}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-500 text-sm">No listings.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Code Modal */}
      {qrViewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={()=>setQrViewItem(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-zinc-900">Donation QR Code</h3>
              <button onClick={()=>setQrViewItem(null)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="flex justify-center">
              <DonationQRCode foodItem={qrViewItem} size={250} showActions={true} />
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-blue-900 mb-2">🔒 How QR Tracking Works</p>
              <ul className="text-[10px] text-blue-700 space-y-1 ml-4 list-disc">
                <li>Driver scans QR at pickup to confirm collection</li>
                <li>NGO scans QR at delivery to verify receipt</li>
                <li>All scans are logged with GPS coordinates</li>
                <li>Creates immutable audit trail for transparency</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InsightStat: React.FC<{ label: string; value: number; variant?: 'warn' | 'ok' }>= ({ label, value, variant }) => (
  <div className={`p-4 rounded-xl border text-center ${variant==='warn'?'bg-red-50 border-red-200':'bg-slate-50 border-slate-200'}`}> 
    <p className="text-[10px] uppercase font-semibold tracking-wide text-slate-500">{label}</p>
    <p className={`mt-1 text-xl font-black ${variant==='warn'?'text-red-600':'text-zinc-900'}`}>{value}</p>
  </div>
);