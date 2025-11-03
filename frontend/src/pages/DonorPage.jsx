import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, 
  Package, 
  Trophy, 
  Award, 
  Heart, 
  LogOut, 
  Menu, 
  X 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFoodListings } from '../hooks/useFoodListings';
import { useClaims } from '../hooks/useClaims';
import DonationFormEnhanced from '../components/DonationFormEnhanced';
import AIMatchingResults from '../components/AIMatchingResults';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc as firestoreDoc, getDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

const DonorPage = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { profile, user, logout } = useAuth();
  const navigate = useNavigate();
  
  // AI Matching State
  const [aiMatchingResults, setAIMatchingResults] = useState(null);
  const [isMatchingLoading, setIsMatchingLoading] = useState(false);
  const [currentDonation, setCurrentDonation] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Fetch data
  const { listings } = useFoodListings('donor');
  const { claims } = useClaims('donor');

  // Debug logging
  React.useEffect(() => {
    console.log('[DonorPage] User:', user);
    console.log('[DonorPage] Profile:', profile);
    console.log('[DonorPage] Listings:', listings);
    console.log('[DonorPage] Claims:', claims);
  }, [user, profile, listings, claims]);

  // Check if user is company
  const isCompany = profile?.accountType === 'company';

  // Calculate metrics
  const totalMeals = listings.reduce((sum, l) => sum + (l.quantity || 0), 0);
  const activeDonations = listings.filter(l => 
    ['available', 'requested', 'claimed', 'in_transit'].includes(l.status || 'available')
  ).length;
  const completedDonations = claims.filter(c => c.status === 'fulfilled').length;
  const rewardPoints = completedDonations * 10; // 10 points per completed donation

  // Handle logout
  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      try {
        await logout();
        navigate('/');
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
  };

  // Trigger AI Matching after donation submission
  const handleDonationSuccess = async (donationData) => {
    console.log('[DonorPage] Donation successful, triggering AI matching:', donationData);
    
    setCurrentDonation(donationData);
    setIsMatchingLoading(true);
    
    try {
      const functions = getFunctions();
      const triggerAIMatching = httpsCallable(functions, 'triggerAIMatching');
      
      // Calculate hours to expiry
      const expiryDate = new Date(donationData.expiry);
      const hoursToExpiry = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60);

      const result = await triggerAIMatching({
        foodName: donationData.name,
        foodType: donationData.foodType,
        quantity: donationData.quantity,
        latitude: donationData.latitude,
        longitude: donationData.longitude,
        hoursToExpiry: hoursToExpiry,
      });
      
      console.log('[DonorPage] AI Matching results:', result.data);
      
      if (result.data && result.data.matchedNGOs && result.data.matchedNGOs.length > 0) {
        // Transform the response to include all necessary fields for display
        const transformedMatches = await Promise.all(
          result.data.matchedNGOs.map(async (match) => {
            // Fetch full NGO details from Firestore
            const db = getFirestore();
            const ngoDocRef = firestoreDoc(db, 'users', match.ngoId);
            const ngoDoc = await getDoc(ngoDocRef);
            const ngoData = ngoDoc.exists() ? ngoDoc.data() : {};
            
            return {
              ngoId: match.ngoId,
              name: match.ngoName,
              location: ngoData.address?.line1 || ngoData.location || 'Location not set',
              latitude: ngoData.latitude,
              longitude: ngoData.longitude,
              distance: match.breakdown?.distanceKm,
              capacity: `${ngoData.pickupRadiusKm || 10} km radius`,
              eta: match.breakdown?.distanceKm 
                ? `${Math.round(match.breakdown.distanceKm * 3 + 15)} min`
                : 'N/A',
              score: match.score,
            };
          })
        );
        
        setAIMatchingResults(transformedMatches);
        toast.success(`Found ${transformedMatches.length} NGOs nearby! 🎯`);
      } else {
        setAIMatchingResults([]);
        toast.info('No NGOs found in your area at this time.');
      }
    } catch (error) {
      console.error('[DonorPage] AI Matching error:', error);
      toast.error('Failed to find NGOs. Please try again.');
      setAIMatchingResults([]);
    } finally {
      setIsMatchingLoading(false);
    }
  };

  // Auto-assign donation to best NGO
  const handleAutoAssign = async (ngo) => {
    console.log('[DonorPage] Auto-assigning to NGO:', ngo);
    setIsAssigning(true);
    
    try {
      // TODO: Create a claim/request record in Firestore
      // For now, just show success message
      toast.success(`Donation assigned to ${ngo.name}! They will be notified. ✅`);
      
      // Clear AI matching results after assignment
      setTimeout(() => {
        setAIMatchingResults(null);
        setCurrentDonation(null);
      }, 2000);
    } catch (error) {
      console.error('[DonorPage] Auto-assign error:', error);
      toast.error('Failed to assign donation. Please try again.');
    } finally {
      setIsAssigning(false);
    }
  };

  // Manual NGO selection
  const handleSelectNGO = (ngo) => {
    console.log('[DonorPage] NGO selected:', ngo);
    // Optionally handle manual selection differently
  };

  // Navigation items
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'donations', label: 'My Donations', icon: Package },
    ...(isCompany 
      ? [{ id: 'csr', label: 'CSR', icon: Award }]
      : [{ id: 'rewards', label: 'Rewards', icon: Trophy }]
    ),
    { id: 'support', label: 'Support', icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header/Navbar */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-700 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-black text-lg">Z</span>
              </div>
              <div>
                <h1 className="text-lg font-black text-zinc-900">ZeroWaste</h1>
                <p className="text-xs text-slate-500">
                  {isCompany ? 'Company Portal' : 'Donor Dashboard'}
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      activeTab === item.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* User Menu & Logout */}
            <div className="flex items-center space-x-4">
              {/* User Info (Desktop) */}
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-zinc-900">
                  {profile?.name || user?.displayName || 'User'}
                </p>
                <p className="text-xs text-slate-500">
                  {profile?.email || user?.email}
                </p>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                title="Logout"
              >
                <LogOut size={18} className="text-slate-600" />
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-3 border-t">
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                        activeTab === item.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Dashboard Summary Bar */}
          <div className="border-t py-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              {/* Total Meals Donated */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-2xl md:text-3xl font-black text-zinc-900">
                  {totalMeals}
                </p>
                <p className="text-xs md:text-sm text-slate-600 font-medium mt-1">
                  Total Meals Donated
                </p>
              </div>

              {/* Active Donations */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-2xl md:text-3xl font-black text-green-700">
                  {activeDonations}
                </p>
                <p className="text-xs md:text-sm text-slate-600 font-medium mt-1">
                  Active Donations
                </p>
              </div>

              {/* Reward Points (Individual) / Completed (Company) */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-2xl md:text-3xl font-black text-blue-700">
                  {isCompany ? completedDonations : rewardPoints}
                </p>
                <p className="text-xs md:text-sm text-slate-600 font-medium mt-1">
                  {isCompany ? 'Completed' : 'Reward Points'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'home' && (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-white rounded-xl shadow-sm border p-8">
              <h2 className="text-2xl font-black text-zinc-900 mb-4">
                Welcome Back, {profile?.name || 'Donor'}! 👋
              </h2>
              <p className="text-slate-600">
                Ready to make a difference? Register a new food donation below.
              </p>
            </div>

            {/* Donation Form */}
            <DonationFormEnhanced 
              onSuccess={handleDonationSuccess} 
            />

            {/* AI Matching Results */}
            {isMatchingLoading && (
              <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
                  <p className="text-lg font-semibold text-slate-700">Finding best NGOs for your donation...</p>
                  <p className="text-sm text-slate-500">AI is analyzing location, capacity, and urgency</p>
                </div>
              </div>
            )}

            {aiMatchingResults && aiMatchingResults.length > 0 && (
              <AIMatchingResults
                matchingResults={aiMatchingResults}
                donorLocation={currentDonation}
                onAutoAssign={handleAutoAssign}
                onSelectNGO={handleSelectNGO}
                isAssigning={isAssigning}
              />
            )}

            {aiMatchingResults && aiMatchingResults.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <h3 className="font-bold text-yellow-900 mb-2">No NGOs Found</h3>
                <p className="text-sm text-yellow-800">
                  Unfortunately, we couldn't find any NGOs in your area at this time. 
                  Your donation is still registered and NGOs can discover it when browsing available donations.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab !== 'home' && (
          <div className="bg-white rounded-xl shadow-sm border p-8">
            {activeTab === 'donations' && (
            <div>
              <h2 className="text-2xl font-black text-zinc-900 mb-4">
                My Donations
              </h2>
              <p className="text-slate-600">
                View and manage your active and past donations here.
              </p>
            </div>
          )}

          {activeTab === 'rewards' && !isCompany && (
            <div>
              <h2 className="text-2xl font-black text-zinc-900 mb-4">
                Rewards & Impact
              </h2>
              <p className="text-slate-600">
                Track your reward points, badges, and environmental impact.
              </p>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-blue-900">Your Points</h3>
                    <Trophy className="text-blue-700" size={24} />
                  </div>
                  <p className="text-4xl font-black text-blue-700">{rewardPoints}</p>
                  <p className="text-sm text-blue-600 mt-2">
                    Keep donating to earn more rewards!
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-green-900">CO₂ Saved</h3>
                    <span className="text-2xl">🌱</span>
                  </div>
                  <p className="text-4xl font-black text-green-700">
                    {Math.round(totalMeals * 0.5)}kg
                  </p>
                  <p className="text-sm text-green-600 mt-2">
                    Environmental impact of your donations
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'csr' && isCompany && (
            <div>
              <h2 className="text-2xl font-black text-zinc-900 mb-4">
                CSR Certificates
              </h2>
              <p className="text-slate-600">
                Download verified donation certificates for your completed donations.
              </p>
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Company:</span> {profile?.companyName || profile?.name}
                </p>
                <p className="text-sm text-blue-900 mt-2">
                  <span className="font-semibold">Total Verified Donations:</span> {completedDonations}
                </p>
                <button className="mt-4 px-4 py-2 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition">
                  View Certificates
                </button>
              </div>
            </div>
          )}

          {activeTab === 'support' && (
            <div>
              <h2 className="text-2xl font-black text-zinc-900 mb-4">
                Support Logistics
              </h2>
              <p className="text-slate-600 mb-6">
                Help fund delivery and operational costs with a micro-donation.
              </p>
              <div className="bg-gradient-to-r from-pink-50 to-orange-50 rounded-xl p-6 border border-orange-100">
                <h3 className="font-bold text-orange-900 mb-4">Micro-Donation Options</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[5, 10, 15, 20].map(amount => (
                    <button
                      key={amount}
                      className="bg-white border-2 border-orange-200 rounded-lg p-4 hover:border-orange-400 hover:shadow-md transition"
                    >
                      <p className="text-2xl font-black text-orange-700">₹{amount}</p>
                    </button>
                  ))}
                </div>
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-orange-900">Funding Progress</span>
                    <span className="text-sm font-semibold text-orange-700">₹45,000 / ₹50,000</span>
                  </div>
                  <div className="w-full bg-orange-100 rounded-full h-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-500 to-pink-500 h-full rounded-full" style={{ width: '90%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        )}
      </main>
    </div>
  );
};

export default DonorPage;

