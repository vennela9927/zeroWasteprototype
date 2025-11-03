import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, 
  Navigation, 
  Package, 
  Clock, 
  TrendingUp, 
  Zap,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';

// Fix for default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const donorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const ngoIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const AIMatchingResults = ({ 
  matchingResults, 
  donorLocation,
  onAutoAssign,
  onSelectNGO,
  isAssigning = false 
}) => {
  const [selectedNGO, setSelectedNGO] = useState(null);
  const [mapView, setMapView] = useState('list'); // 'list' | 'map'

  useEffect(() => {
    console.log('[AIMatching] Results:', matchingResults);
    console.log('[AIMatching] Donor Location:', donorLocation);
  }, [matchingResults, donorLocation]);

  if (!matchingResults || matchingResults.length === 0) {
    return null;
  }

  // Calculate map center (average of all locations)
  const allLocations = [
    donorLocation,
    ...matchingResults.filter(ngo => ngo.latitude && ngo.longitude)
  ].filter(Boolean);

  const mapCenter = allLocations.length > 0
    ? [
        allLocations.reduce((sum, loc) => sum + (loc.latitude || loc[0]), 0) / allLocations.length,
        allLocations.reduce((sum, loc) => sum + (loc.longitude || loc[1]), 0) / allLocations.length
      ]
    : [12.9716, 77.5946]; // Default to Bangalore

  const handleAutoAssign = () => {
    if (matchingResults.length > 0) {
      const bestNGO = matchingResults[0]; // Already sorted by AI score
      setSelectedNGO(bestNGO);
      onAutoAssign(bestNGO);
    }
  };

  const handleSelectNGO = (ngo) => {
    setSelectedNGO(ngo);
    if (onSelectNGO) {
      onSelectNGO(ngo);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-700 to-cyan-500 rounded-lg">
            <Zap className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-900">AI-Matched NGOs</h2>
            <p className="text-sm text-slate-600">
              {matchingResults.length} NGOs found based on location, capacity, and urgency
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setMapView('list')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
              mapView === 'list'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setMapView('map')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
              mapView === 'map'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Map View
          </button>
        </div>
      </div>

      {/* Auto-Assign Button */}
      <motion.button
        onClick={handleAutoAssign}
        disabled={isAssigning || selectedNGO}
        className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-xl font-bold text-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
        whileHover={{ scale: selectedNGO ? 1 : 1.02 }}
        whileTap={{ scale: selectedNGO ? 1 : 0.98 }}
      >
        {isAssigning ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            Assigning...
          </>
        ) : selectedNGO ? (
          <>
            <CheckCircle size={20} />
            Assigned to {selectedNGO.name}
          </>
        ) : (
          <>
            <Zap size={20} />
            Auto-Assign to Best NGO
          </>
        )}
      </motion.button>

      {/* Content - List or Map */}
      <AnimatePresence mode="wait">
        {mapView === 'list' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            {matchingResults.map((ngo, index) => (
              <motion.div
                key={ngo.ngoId || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleSelectNGO(ngo)}
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                  selectedNGO?.ngoId === ngo.ngoId
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* NGO Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      {/* Rank Badge */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                        index === 0 
                          ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {index + 1}
                      </div>

                      {/* Name */}
                      <div>
                        <h3 className="font-bold text-lg text-zinc-900">{ngo.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MapPin size={14} />
                          <span>{ngo.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      {/* Distance */}
                      <div className="bg-blue-50 rounded-lg p-2">
                        <div className="flex items-center gap-1 text-blue-700 mb-1">
                          <Navigation size={14} />
                          <span className="text-xs font-semibold">Distance</span>
                        </div>
                        <p className="text-lg font-black text-blue-900">
                          {ngo.distance ? `${ngo.distance.toFixed(1)} km` : 'N/A'}
                        </p>
                      </div>

                      {/* Capacity */}
                      <div className="bg-purple-50 rounded-lg p-2">
                        <div className="flex items-center gap-1 text-purple-700 mb-1">
                          <Package size={14} />
                          <span className="text-xs font-semibold">Capacity</span>
                        </div>
                        <p className="text-lg font-black text-purple-900">
                          {ngo.capacity || 'N/A'}
                        </p>
                      </div>

                      {/* ETA */}
                      <div className="bg-green-50 rounded-lg p-2">
                        <div className="flex items-center gap-1 text-green-700 mb-1">
                          <Clock size={14} />
                          <span className="text-xs font-semibold">ETA</span>
                        </div>
                        <p className="text-lg font-black text-green-900">
                          {ngo.eta || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* AI Score */}
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-slate-600 mb-1">
                      <TrendingUp size={14} />
                      <span className="text-xs font-semibold">AI Score</span>
                    </div>
                    <div className={`text-3xl font-black ${
                      ngo.score >= 90 ? 'text-green-600' :
                      ngo.score >= 70 ? 'text-blue-600' :
                      'text-slate-600'
                    }`}>
                      {ngo.score || 0}
                    </div>
                    <div className="text-xs text-slate-500">/ 100</div>
                  </div>
                </div>

                {/* Select Button */}
                {selectedNGO?.ngoId === ngo.ngoId && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-green-700 font-semibold">
                    <CheckCircle size={18} />
                    <span>Selected</span>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="map"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="h-[500px] rounded-xl overflow-hidden border-2 border-slate-200"
          >
            <MapContainer
              center={mapCenter}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Donor Marker */}
              {donorLocation && (
                <Marker 
                  position={[donorLocation.latitude || donorLocation[0], donorLocation.longitude || donorLocation[1]]} 
                  icon={donorIcon}
                >
                  <Popup>
                    <div className="text-center p-2">
                      <strong className="text-blue-700">Your Location</strong>
                      <p className="text-sm text-slate-600 mt-1">Donation Pickup Point</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* NGO Markers */}
              {matchingResults.filter(ngo => ngo.latitude && ngo.longitude).map((ngo, index) => (
                <React.Fragment key={ngo.ngoId || index}>
                  <Marker 
                    position={[ngo.latitude, ngo.longitude]} 
                    icon={ngoIcon}
                    eventHandlers={{
                      click: () => handleSelectNGO(ngo)
                    }}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <strong className="text-green-700 text-lg">{ngo.name}</strong>
                        <p className="text-sm text-slate-600 mt-1">{ngo.location}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-xs"><strong>Distance:</strong> {ngo.distance?.toFixed(1)} km</p>
                          <p className="text-xs"><strong>Capacity:</strong> {ngo.capacity}</p>
                          <p className="text-xs"><strong>AI Score:</strong> {ngo.score}/100</p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Line connecting donor to NGO */}
                  {donorLocation && (
                    <Polyline
                      positions={[
                        [donorLocation.latitude || donorLocation[0], donorLocation.longitude || donorLocation[1]],
                        [ngo.latitude, ngo.longitude]
                      ]}
                      color={selectedNGO?.ngoId === ngo.ngoId ? '#22c55e' : '#94a3b8'}
                      weight={selectedNGO?.ngoId === ngo.ngoId ? 3 : 1}
                      opacity={0.6}
                      dashArray={selectedNGO?.ngoId === ngo.ngoId ? null : '5, 10'}
                    />
                  )}
                </React.Fragment>
              ))}
            </MapContainer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Footer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2 text-sm">How AI Matching Works</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>🎯 <strong>Location Score:</strong> Closer NGOs ranked higher</li>
          <li>⏰ <strong>Urgency Score:</strong> Expiry time considered for fast delivery</li>
          <li>📦 <strong>Capacity Score:</strong> NGO's ability to handle quantity</li>
          <li>⭐ <strong>Reliability Score:</strong> Based on past fulfillment rate</li>
        </ul>
      </div>
    </div>
  );
};

export default AIMatchingResults;


