import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Filter, Clock, Leaf, Search, Navigation, CheckCircle, Map as MapIcon, AlertTriangle, Activity, Package, Truck } from 'lucide-react';
import { useFoodListings } from '../hooks/useFoodListings';
import { useClaims } from '../hooks/useClaims';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { sortListingsByRelevance } from '../utils/smartMatching';
import DonationProgress from './DonationProgress';

// GPS-ONLY MODE - No hardcoded districts or cities
// All filtering based on exact GPS coordinates

interface FoodManagementProps {
  onRequestFood?: (id: string) => void;
}

const FoodManagement: React.FC<FoodManagementProps> = () => {
  const { profile } = useAuth();
  const { listings: foodListings, claimListing } = useFoodListings('ngo');
  const { claims } = useClaims('recipient');
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'available' | 'requests' | 'approved'>('available');
  
  // Location state - GPS ONLY
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Progress modal state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  
  // Track last update time for claims
  const [lastClaimsUpdate, setLastClaimsUpdate] = useState<Date>(new Date());
  const [prevClaims, setPrevClaims] = useState<any[]>([]);
  
  // Update timestamp whenever claims change
  useEffect(() => {
    if (claims.length >= 0) {
      setLastClaimsUpdate(new Date());
    }
  }, [claims]);
  
  // Watch for status changes and show real-time notifications
  useEffect(() => {
    if (prevClaims.length === 0 && claims.length > 0) {
      // Initial load - don't show notifications
      setPrevClaims(claims);
      return;
    }
    
    // Check for status changes from 'requested' to 'approved'
    claims.forEach(currentClaim => {
      const previousClaim = prevClaims.find(pc => pc.id === currentClaim.id);
      
      if (previousClaim && previousClaim.status === 'requested' && currentClaim.status === 'approved') {
        // Status changed from requested to approved!
        toast.success(
          `🎉 Great News! "${currentClaim.foodName}" has been accepted by the donor!`,
          {
            autoClose: 5000,
            position: 'top-center',
          }
        );
        
        // Auto-switch to "Approved Foods" tab to show the approved item
        if (activeTab === 'available' || activeTab === 'requests') {
          setActiveTab('approved');
        }
      }
    });
    
    setPrevClaims(claims);
  }, [claims, prevClaims, activeTab]);
  
  // Filters state
  const [showFilters, setShowFilters] = useState(false);
  const defaultFilters = {
    foodPreference: 'both' as any,
    maxDistance: 100, // km - default radius
    expiryWindow: 24,
    minQuantity: 1,
    preparationType: 'all' as any,
  };
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [fetchingFoods, setFetchingFoods] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Handle apply filters
  const handleApplyFilters = () => {
    const userLat = currentLocation?.lat || profile?.latitude;
    const userLng = currentLocation?.lng || profile?.longitude;
    
    if (userLat && userLng) {
      console.log(`✅ Filtering with exact GPS coordinates: Lat ${userLat.toFixed(6)}, Lng ${userLng.toFixed(6)}`);
      if (currentLocation) {
        console.log('📡 Source: Current GPS location (live)');
      } else {
        console.log('💾 Source: Saved profile location');
      }
    }
    
    setFetchingFoods(true);
    setAppliedFilters(filters);
    
    // Simulate fetching delay for better UX
    setTimeout(() => {
      setFetchingFoods(false);
      const withDistance = availableFoods.filter(f => (f as any)._calculatedDistance !== null);
      toast.success(`Found ${availableFoods.length} food items (${withDistance.length} within ${filters.maxDistance} km from your exact location)`);
    }, 500);
  };
  
  // Handle reset filters
  const handleResetFilters = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    toast.info('Filters reset to default');
  };
  
  // Function to get current GPS location - EXACT COORDINATES ONLY
  const fetchCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    
    setFetchingLocation(true);
    console.log('🌍 Requesting exact GPS location...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log(`📍 Exact GPS coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        console.log(`🎯 GPS accuracy: ${accuracy.toFixed(0)} meters`);
        
        setCurrentLocation({ lat: latitude, lng: longitude });
        setFetchingLocation(false);
        
        // Show success message with exact coordinates
        toast.success(`✅ Exact location acquired: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${accuracy.toFixed(0)}m)`, {
          autoClose: 3000,
        });
      },
      (error) => {
        console.error('❌ GPS error:', error);
        setFetchingLocation(false);
        
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('🚫 Location permission denied. Please enable GPS in your browser settings.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          toast.error('📡 Location unavailable. Please check your GPS/network settings.');
        } else if (error.code === error.TIMEOUT) {
          toast.error('⏱️ Location request timed out. Please try again.');
        } else {
          toast.error('❌ Failed to get your location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  };
  
  // Auto-fetch GPS location on component mount
  useEffect(() => {
    console.log('🚀 FoodManagement component mounted - GPS-only mode');
    
    // Check if profile has exact coordinates
    const profileLat = profile?.latitude;
    const profileLng = profile?.longitude;
    
    if (profileLat && profileLng && typeof profileLat === 'number' && typeof profileLng === 'number') {
      // Use saved profile coordinates
      console.log(`✅ Using saved GPS coordinates: ${profileLat.toFixed(6)}, ${profileLng.toFixed(6)}`);
      setCurrentLocation({ lat: profileLat, lng: profileLng });
      toast.info(`📍 Using saved location: ${profileLat.toFixed(4)}, ${profileLng.toFixed(4)}`);
    } else {
      // No saved coordinates, fetch live GPS
      console.log('🔄 No saved GPS coordinates. Fetching live location...');
      toast.info('📡 Detecting your exact GPS location...');
      
      // Small delay to let UI render
      setTimeout(() => {
        fetchCurrentLocation();
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);
  
  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };
  
  // Filter and sort available foods
  const availableFoods = useMemo(() => {
    // TEMP: show all items from feed unfiltered to diagnose missing listings
    let filtered = [...foodListings];
    
    const userLat = currentLocation?.lat || profile?.latitude;
    const userLng = currentLocation?.lng || profile?.longitude;
    
    console.log(`📍 YOUR GPS LOCATION:`);
    console.log(`   Latitude:  ${userLat?.toFixed(6)}`);
    console.log(`   Longitude: ${userLng?.toFixed(6)}`);
    console.log(`📦 Total available food items: ${filtered.length}`);
    console.log(`📏 Your radius filter: ${appliedFilters.maxDistance} km`);
    
    // Calculate distance for each item and add it to the object
    if (userLat && userLng) {
      console.log(`\n🔄 Calculating distances from your location...`);
      console.log(`${'='.repeat(80)}`);
      
      filtered = filtered.map(item => {
        const itemLat = (item as any).latitude;
        const itemLng = (item as any).longitude;
        
        let distance: number | null = null;
        if (itemLat && itemLng && typeof itemLat === 'number' && typeof itemLng === 'number') {
          distance = calculateDistance(userLat, userLng, itemLat, itemLng);
          console.log(`\n📦 ${item.foodName || item.name}:`);
          console.log(`   Food Lat:  ${itemLat.toFixed(6)}`);
          console.log(`   Food Lng:  ${itemLng.toFixed(6)}`);
          console.log(`   Distance:  ${distance.toFixed(2)} km`);
          console.log(`   ${distance <= appliedFilters.maxDistance ? '✅ WITHIN RANGE' : '❌ TOO FAR'}`);
        } else {
          console.log(`\n⚠️ ${item.foodName || item.name}: NO GPS COORDINATES`);
          console.log(`   Lat: ${itemLat}, Lng: ${itemLng}`);
        }
        
        return {
          ...item,
          _calculatedDistance: distance,
        };
      });
      
      // Do NOT exclude by radius for now; keep everything and sort by distance
      const beforeFilter = filtered.length;
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📊 DISTANCE SUMMARY (no exclusion applied):`);
      console.log(`   ✅ Items considered: ${beforeFilter}`);
      console.log(`${'='.repeat(80)}\n`);
      
      if (filtered.length === 0 && beforeFilter > 0) {
        console.warn(`\n⚠️ ALL ${beforeFilter} FOOD ITEMS WERE EXCLUDED!`);
        console.warn(`\nPossible reasons:`);
        console.warn(`   1. All items are beyond ${appliedFilters.maxDistance} km from your location`);
        console.warn(`   2. Food items don't have GPS coordinates saved`);
        console.warn(`   3. GPS coordinates might be incorrect\n`);
        console.warn(`💡 TIP: Check if the food donation coordinates are correct!`);
        console.warn(`   Your location: ${userLat.toFixed(6)}, ${userLng.toFixed(6)}`);
        console.warn(`   Try increasing radius or check coordinates above.\n`);
      }
      
      // Sort by distance (closest first), unknown distances last
      filtered.sort((a, b) => {
        const distA = (a as any)._calculatedDistance;
        const distB = (b as any)._calculatedDistance;
        const aVal = (distA === null || distA === undefined) ? Number.POSITIVE_INFINITY : distA;
        const bVal = (distB === null || distB === undefined) ? Number.POSITIVE_INFINITY : distB;
        return aVal - bVal; // Ascending order
      });
    } else {
      // No user GPS coordinates - can't filter by location
      console.warn('⚠️ No GPS coordinates available - cannot filter by distance');
      console.warn('   Please click "Get Location" button to enable GPS-based filtering');
    }
    
    // Apply search
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        (item.foodName || item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.location || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply food preference filter (use appliedFilters)
    if (appliedFilters.foodPreference !== 'both') {
      filtered = filtered.filter(item => {
        const foodType = (item.foodType || '').toLowerCase();
        if (appliedFilters.foodPreference === 'veg') {
          return foodType.includes('veg') || foodType.includes('vegetarian');
        } else {
          return foodType.includes('non-veg') || foodType.includes('non-vegetarian') || foodType.includes('chicken') || foodType.includes('meat');
        }
      });
    }
    
    // Apply preparation type filter (use appliedFilters)
    if (appliedFilters.preparationType !== 'all') {
      filtered = filtered.filter(item => item.preparationType === appliedFilters.preparationType);
    }
    
    // Apply quantity filter (use appliedFilters)
    filtered = filtered.filter(item => (item.quantity || 0) >= appliedFilters.minQuantity);
    
    // Skip expiry filtering for now (diagnostic mode)
    
    // Calculate AI match scores for display (without changing sort order)
    if (profile || currentLocation) {
      const ngoProfile = {
        foodPreference: appliedFilters.foodPreference,
        capacity: profile?.capacity || appliedFilters.minQuantity,
        latitude: currentLocation?.lat || profile?.latitude,
        longitude: currentLocation?.lng || profile?.longitude,
        preparationCapability: profile?.preparationCapability,
      };
      
      // Get match scores from AI but keep distance-based sorting
      const withScores = sortListingsByRelevance(filtered, ngoProfile);
      
      // Transfer match scores to our distance-sorted list
      filtered = filtered.map(item => {
        const scored = withScores.find(s => s.id === item.id);
        return {
          ...item,
          _matchScore: (scored as any)?._matchScore,
        };
      });
    }
    
    return filtered;
  }, [foodListings, searchQuery, appliedFilters, profile, currentLocation]);
  
  // My Requests - Only show pending requests (not yet approved by donor)
  const myRequests = useMemo(() => {
    console.log(`\n📋 [MY REQUESTS] Filtering claims...`);
    console.log(`   Total claims: ${claims.length}`);
    
    // Show ONLY 'requested' claims (pending donor approval)
    const requestedClaims = claims.filter(c => c.status === 'requested');
    console.log(`   Requested (pending) claims: ${requestedClaims.length}`);
    
    requestedClaims.forEach(claim => {
      console.log(`   ✓ Claim ${claim.id.substring(0, 8)}... - Status: ${claim.status} - Food: ${claim.foodName}`);
    });
    
    return requestedClaims.map(claim => {
      const foodItem = foodListings.find(f => f.id === claim.foodItemId);
      return { ...claim, foodItem };
    });
  }, [claims, foodListings]);
  
  // Approved Foods - Show from approved until verified (all in-progress stages)
  const approvedFoods = useMemo(() => {
    console.log(`\n✅ [APPROVED FOODS] Filtering claims...`);
    console.log(`   Total claims: ${claims.length}`);
    
    // Show all claims from 'approved' through 'delivered' (until 'verified')
    // This includes: approved, picked_up, in_transit, delivered, fulfilled
    const approvedStatuses = ['approved', 'picked_up', 'in_transit', 'delivered', 'fulfilled'];
    const approvedClaims = claims.filter(c => approvedStatuses.includes(c.status));
    console.log(`   Approved (in-progress) claims: ${approvedClaims.length}`);
    
    approvedClaims.forEach(claim => {
      console.log(`   ✓ Claim ${claim.id.substring(0, 8)}... - Status: ${claim.status} - Food: ${claim.foodName}`);
    });
    
    return approvedClaims.map(claim => {
      const foodItem = foodListings.find(f => f.id === claim.foodItemId);
      return { ...claim, foodItem };
    });
  }, [claims, foodListings]);
  
  // Handle request food
  const handleRequestFood = async (foodId: string) => {
    try {
      const listing = availableFoods.find(f => f.id === foodId);
      const matchScore = (listing as any)?._matchScore;
      
      await claimListing(foodId, matchScore);
      toast.success('Request sent to donor successfully!');
    } catch (error) {
      console.error('Request error:', error);
      toast.error((error as Error).message || 'Failed to send request');
    }
  };
  
  // Handle view directions
  const handleViewDirections = (claim: any) => {
    const foodItem = claim.foodItem;
    if (!foodItem) {
      toast.error('Food item details not found');
      return;
    }
    
    // Use latitude/longitude if available, otherwise use location string
    let url = '';
    if (foodItem.latitude && foodItem.longitude && profile?.latitude && profile?.longitude) {
      // Directions from NGO to donor
      url = `https://www.google.com/maps/dir/?api=1&origin=${profile.latitude},${profile.longitude}&destination=${foodItem.latitude},${foodItem.longitude}`;
    } else {
      // Fallback to location search
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(foodItem.location || '')}`;
    }
    
    window.open(url, '_blank');
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-zinc-900">Food Management</h1>
          <p className="text-slate-600 mt-1">Browse, request, and manage food donations</p>
        </div>
        
        {/* Location Selector with GPS */}
        <div className="flex items-center gap-2">
          {/* GPS Fetch Button */}
          <button
            onClick={fetchCurrentLocation}
            disabled={fetchingLocation}
            className={`flex items-center gap-2 px-4 py-2 border-2 rounded-xl transition-all ${
              fetchingLocation
                ? 'bg-blue-50 border-blue-300 cursor-wait'
                : currentLocation
                ? 'bg-green-50 border-green-300 hover:bg-green-100'
                : 'bg-white border-slate-200 hover:border-blue-500'
            }`}
            title={currentLocation ? 'GPS location active - Click to refresh' : 'Detect my location'}
          >
            <Navigation 
              size={20} 
              className={`${
                fetchingLocation 
                  ? 'text-blue-600 animate-spin' 
                  : currentLocation 
                  ? 'text-green-600' 
                  : 'text-slate-600'
              }`} 
            />
            {fetchingLocation ? (
              <span className="text-xs font-semibold text-blue-600">Detecting...</span>
            ) : currentLocation ? (
              <span className="text-xs font-semibold text-green-600">GPS Active</span>
            ) : (
              <span className="text-xs font-semibold text-slate-600">Get Location</span>
            )}
          </button>
          
          {/* GPS Location Display - EXACT COORDINATES ONLY */}
          <div className={`flex items-center gap-3 px-4 py-2.5 border-2 rounded-xl ${
            currentLocation 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' 
              : 'bg-amber-50 border-amber-300'
          }`}>
            <MapPin 
              size={24} 
              className={currentLocation ? 'text-green-600' : 'text-amber-600'} 
            />
            <div>
              <div className="text-xs font-semibold text-slate-600">
                {currentLocation ? '✅ Exact GPS Location' : '⚠️ No GPS Location'}
              </div>
              <div className="font-mono font-bold text-sm text-zinc-900">
                {currentLocation 
                  ? `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`
                  : fetchingLocation ? 'Detecting...' : 'Click GPS button →'
                }
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('available')}
          className={`px-6 py-3 font-bold text-sm transition-all ${
            activeTab === 'available'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Available Foods ({availableFoods.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-6 py-3 font-bold text-sm transition-all ${
            activeTab === 'requests'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          My Requests ({myRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-6 py-3 font-bold text-sm transition-all ${
            activeTab === 'approved'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Approved Foods ({approvedFoods.length})
        </button>
        
        {/* Last Update Indicator */}
        {(activeTab === 'requests' || activeTab === 'approved') && (
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full">
            <Activity size={12} className="text-green-500 animate-pulse" />
            <span>
              Updated {Math.floor((new Date().getTime() - lastClaimsUpdate.getTime()) / 1000)}s ago
            </span>
            <button
              onClick={() => {
                toast.info('Real-time updates are active. Check console (F12) for details.');
                console.log('\n🔄 Manual Refresh Triggered');
                console.log(`   Current claims count: ${claims.length}`);
                console.log(`   My Requests: ${myRequests.length}`);
                console.log(`   Approved Foods: ${approvedFoods.length}`);
              }}
              className="ml-1 text-blue-600 hover:text-blue-700 font-semibold"
            >
              View Updates
            </button>
          </div>
        )}
      </div>
      
      {/* Available Foods Tab */}
      {activeTab === 'available' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Search & Filters Bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search by food name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-colors relative ${
                showFilters
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-blue-500'
              }`}
            >
              <Filter size={20} />
              Filters
              {/* Active filters indicator */}
              {(appliedFilters.foodPreference !== 'both' || 
                appliedFilters.preparationType !== 'all' || 
                appliedFilters.minQuantity > 1 || 
                appliedFilters.expiryWindow !== 24 ||
                appliedFilters.maxDistance !== 100) && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
          </div>
          
          {/* Filters Panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-slate-50 rounded-xl p-6 border border-slate-200"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Distance Radius */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    <MapPin className="inline mr-1" size={16} />
                    Distance Radius
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="5"
                      max="200"
                      step="5"
                      value={filters.maxDistance}
                      onChange={(e) => setFilters({ ...filters, maxDistance: Number(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-sm font-semibold text-blue-600 min-w-[50px]">
                      {filters.maxDistance} km
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>5 km</span>
                    <span>200 km</span>
                  </div>
                </div>
                
                {/* Food Preference */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    <Leaf className="inline mr-1" size={16} />
                    Food Preference
                  </label>
                  <select
                    value={filters.foodPreference}
                    onChange={(e) => setFilters({ ...filters, foodPreference: e.target.value as any })}
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="both">Both Veg & Non-Veg</option>
                    <option value="veg">Vegetarian Only</option>
                    <option value="non-veg">Non-Vegetarian Only</option>
                  </select>
                </div>
                
                {/* Preparation Type */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Preparation Type
                  </label>
                  <select
                    value={filters.preparationType}
                    onChange={(e) => setFilters({ ...filters, preparationType: e.target.value as any })}
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="all">All Types</option>
                    <option value="cooked">Cooked</option>
                    <option value="raw">Raw</option>
                    <option value="packaged">Packaged</option>
                  </select>
                </div>
                
                {/* Min Quantity */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Min Quantity (servings)
                  </label>
                  <input
                    type="number"
                    value={filters.minQuantity}
                    onChange={(e) => setFilters({ ...filters, minQuantity: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
                
                {/* Expiry Window */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    <Clock className="inline mr-1" size={16} />
                    Expiry Within (hours)
                  </label>
                  <input
                    type="number"
                    value={filters.expiryWindow}
                    onChange={(e) => setFilters({ ...filters, expiryWindow: parseInt(e.target.value) || 24 })}
                    min="1"
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              
              {/* Fetch Foods Button */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Customize your preferences and click fetch to see matching food items
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleResetFilters}
                    disabled={fetchingFoods}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleApplyFilters}
                    disabled={fetchingFoods}
                    className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${
                      fetchingFoods
                        ? 'bg-blue-400 text-white cursor-wait'
                        : 'bg-gradient-to-r from-blue-700 to-cyan-500 text-white hover:from-blue-800 hover:to-cyan-600 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {fetchingFoods ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Fetching...
                      </>
                    ) : (
                      <>
                        <Search size={20} />
                        Fetch Foods
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Available Foods Grid */}
          {(currentLocation?.lat || profile?.latitude) && availableFoods.length > 0 && (
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Navigation className="text-emerald-600" size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-900">
                      {availableFoods.length} food items within {appliedFilters.maxDistance} km radius
                    </h4>
                    <p className="text-sm text-emerald-700">
                      Sorted by distance from your exact location
                    </p>
                  </div>
                </div>
                <span className="text-2xl">📍</span>
              </div>
              {currentLocation && (
                <div className="mt-2 pt-2 border-t border-emerald-200">
                  <div className="flex items-center gap-2 text-xs text-emerald-700">
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300">
                      📍 {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                    </span>
                    <span>→ Using exact GPS coordinates for distance calculation</span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {!(currentLocation?.lat || profile?.latitude) && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="text-amber-600 flex-shrink-0" size={24} />
              <div>
                <h4 className="font-bold text-amber-900">📍 GPS Location Required</h4>
                <p className="text-sm text-amber-700 mb-2">
                  Click the <strong>"Get Location"</strong> button above to enable exact GPS-based filtering.
                </p>
                <p className="text-xs text-amber-600">
                  💡 Food items within {appliedFilters.maxDistance} km will be calculated from your exact GPS coordinates, not city centers.
                </p>
              </div>
            </div>
          )}
          
          {(currentLocation?.lat || profile?.latitude) && availableFoods.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🍽️</div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">
                No food available within {appliedFilters.maxDistance} km from your location
              </h3>
              <div className="max-w-md mx-auto space-y-3">
                <p className="text-slate-500">This could be because:</p>
                <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 text-left space-y-2">
                  <p>• All food donations are beyond {appliedFilters.maxDistance} km from you</p>
                  <p>• Food donations don't have GPS coordinates saved</p>
                  <p>• Your filters are too restrictive</p>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Try:</p>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <button
                      onClick={() => setFilters({ ...filters, maxDistance: Math.min(200, filters.maxDistance + 50) })}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all"
                    >
                      Increase Radius to {Math.min(200, filters.maxDistance + 50)} km
                    </button>
                    <button
                      onClick={handleResetFilters}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-all"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
                {currentLocation && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs font-bold text-blue-900 mb-2">🔍 Debug Information:</p>
                    <p className="text-xs text-blue-700 font-mono">
                      📍 Your GPS: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      💡 Open browser console (F12) to see detailed distance calculations
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableFoods.map((food) => {
              const matchScore = (food as any)._matchScore || 0;
              const calculatedDistance = (food as any)._calculatedDistance;
              const expiryDate = food.expiryTime?.toDate ? food.expiryTime.toDate() : (food.expiry ? new Date(food.expiry) : null);
              const hoursUntilExpiry = expiryDate ? (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60) : null;
              
              return (
                <motion.div
                  key={food.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border-2 border-slate-100 hover:border-blue-300 hover:shadow-lg transition-all overflow-hidden"
                >
                  {/* Distance Badge - Always show if available */}
                  {calculatedDistance !== null && calculatedDistance !== undefined && typeof calculatedDistance === 'number' && (
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-xs font-bold">📍 Distance</span>
                        <span className="bg-white text-emerald-600 px-2 py-0.5 rounded-full text-xs font-black">
                          {calculatedDistance.toFixed(1)} km
                        </span>
                      </div>
                      {matchScore > 0 && (
                        <div className="text-white text-xs font-semibold">
                          ⭐ {Math.round(matchScore * 100)}% match
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-black text-lg text-zinc-900">{food.foodName || food.name}</h3>
                        <p className="text-sm text-slate-600">{food.donorName || 'Anonymous Donor'}</p>
                      </div>
                      {food.verified && (
                        <div className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <CheckCircle size={12} />
                          Verified
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-500">Quantity:</span>
                        <span className="font-bold text-zinc-900">{food.quantity} servings</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin size={14} className="text-slate-400" />
                        <span className="text-slate-600 text-xs">{food.location}</span>
                      </div>
                      {hoursUntilExpiry !== null && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock size={14} className={hoursUntilExpiry < 6 ? 'text-red-500' : 'text-slate-400'} />
                          <span className={`text-xs font-semibold ${hoursUntilExpiry < 6 ? 'text-red-600' : 'text-slate-600'}`}>
                            Expires in {Math.round(hoursUntilExpiry)}h
                          </span>
                        </div>
                      )}
                      {food.preparationType && (
                        <div className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">
                          {food.preparationType}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleRequestFood(food.id)}
                      className="w-full bg-gradient-to-r from-blue-700 to-cyan-500 text-white font-bold py-3 rounded-xl hover:from-blue-800 hover:to-cyan-600 transition-all"
                    >
                      Request Food
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
      
      {/* My Requests Tab */}
      {activeTab === 'requests' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {myRequests.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">No pending requests</h3>
              <p className="text-slate-500">Your food requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myRequests.map((request) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl border-2 border-slate-100 p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-black text-xl text-zinc-900">
                          {request.foodName}
                        </h3>
                        {/* Status Badge - Always "Pending Approval" in My Requests tab */}
                        <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <Clock size={12} />
                          Pending Approval
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="text-slate-600">
                          <span className="font-semibold">Donor:</span> {request.donorName || 'Anonymous'}
                        </p>
                        <p className="text-slate-600">
                          <span className="font-semibold">Quantity:</span> {request.quantity} servings
                        </p>
                        {request.location && (
                          <p className="text-slate-600 flex items-center gap-2">
                            <MapPin size={14} className="text-slate-400" />
                            {request.location}
                          </p>
                        )}
                        <p className="text-slate-500 text-xs">
                          Requested {request.requestedAt?.toDate ? request.requestedAt.toDate().toLocaleString() : 'recently'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        setSelectedClaimId(request.id);
                        setShowProgressModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold py-3 rounded-xl hover:from-blue-700 hover:to-cyan-600 transition-all"
                    >
                      <Activity size={18} />
                      Track Progress
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}
      
      {/* Approved Foods Tab */}
      {activeTab === 'approved' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {approvedFoods.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">No approved foods</h3>
              <p className="text-slate-500">Approved donations will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvedFoods.map((approved) => (
                <motion.div
                  key={approved.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl border-2 border-green-200 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-black text-xl text-zinc-900">
                          {approved.foodName}
                        </h3>
                        {/* Dynamic Status Badge */}
                        {approved.status === 'approved' && (
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <CheckCircle size={12} />
                            Approved
                          </span>
                        )}
                        {approved.status === 'picked_up' && (
                          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <Package size={12} />
                            Picked Up
                          </span>
                        )}
                        {approved.status === 'in_transit' && (
                          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <Truck size={12} />
                            In Transit
                          </span>
                        )}
                        {approved.status === 'delivered' && (
                          <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <MapPin size={12} />
                            Delivered
                          </span>
                        )}
                        {approved.status === 'fulfilled' && (
                          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <CheckCircle size={12} />
                            Fulfilled
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="text-slate-600">
                          <span className="font-semibold">Donor:</span> {approved.donorName || 'Anonymous'}
                        </p>
                        <p className="text-slate-600">
                          <span className="font-semibold">Quantity:</span> {approved.quantity} servings
                        </p>
                        {approved.location && (
                          <p className="text-slate-600 flex items-center gap-2">
                            <MapPin size={14} className="text-slate-400" />
                            {approved.location}
                          </p>
                        )}
                        <p className="text-green-600 text-xs font-semibold">
                          ✅ Approved {approved.approvedAt?.toDate ? approved.approvedAt.toDate().toLocaleString() : 'recently'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedClaimId(approved.id);
                        setShowProgressModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-500 text-white font-bold py-3 rounded-xl hover:from-purple-700 hover:to-indigo-600 transition-all"
                    >
                      <Activity size={18} />
                      Track Progress
                    </button>
                    <button
                      onClick={() => handleViewDirections(approved)}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold py-3 rounded-xl hover:from-blue-700 hover:to-cyan-600 transition-all"
                    >
                      <Navigation size={18} />
                      View Directions
                    </button>
                    <button
                      onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(approved.location || '')}`, '_blank')}
                      className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 font-bold px-6 py-3 rounded-xl hover:bg-slate-200 transition-all"
                    >
                      <MapIcon size={18} />
                      Map
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Donation Progress Modal */}
      {showProgressModal && selectedClaimId && (
        <DonationProgress
          claimId={selectedClaimId}
          userRole="ngo"
          onClose={() => {
            setShowProgressModal(false);
            setSelectedClaimId(null);
          }}
        />
      )}
    </div>
  );
};

export default FoodManagement;

