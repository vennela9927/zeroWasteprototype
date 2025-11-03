import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Clock, User, Package } from 'lucide-react';
import { getDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DeliveryTask } from '../utils/driverManagement';

interface LiveTrackingProps {
  taskId: string;
  viewerRole: 'donor' | 'recipient' | 'driver';
}

/**
 * Live GPS Tracking Component
 * 
 * Features:
 * - Real-time driver location updates
 * - Route visualization
 * - ETA calculation
 * - Status updates
 * - Distance traveled
 */
export const LiveTracking: React.FC<LiveTrackingProps> = ({ taskId, viewerRole }) => {
  const [task, setTask] = useState<DeliveryTask | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    // Subscribe to task updates
    const unsubscribe = onSnapshot(doc(db, 'delivery_tasks', taskId), (doc) => {
      if (doc.exists()) {
        const taskData = doc.data() as DeliveryTask;
        setTask(taskData);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [taskId]);

  useEffect(() => {
    if (!task) return;

    // Subscribe to driver location updates (from Realtime Database or Firestore)
    const unsubscribe = onSnapshot(doc(db, 'drivers', task.driverId), (doc) => {
      if (doc.exists()) {
        const driverData = doc.data();
        if (driverData.currentLocation) {
          setDriverLocation({
            lat: driverData.currentLocation.lat,
            lng: driverData.currentLocation.lng,
          });

          // Calculate ETA
          if (task.status === 'en_route_pickup') {
            calculateETA(driverData.currentLocation, task.pickupLocation);
          } else if (task.status === 'en_route_delivery') {
            calculateETA(driverData.currentLocation, task.dropoffLocation);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [task]);

  useEffect(() => {
    if (!mapRef.current || !task) return;

    // Initialize Google Map (placeholder - would need Google Maps API key)
    // For now, showing a simple representation
    initializeMap();
  }, [task, driverLocation]);

  const initializeMap = () => {
    // This is a simplified version
    // In production, you would use Google Maps JavaScript API
    // or Mapbox to render an actual map with markers and routes
    console.log('Map initialized', { task, driverLocation });
  };

  const calculateETA = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    // Haversine formula for distance
    const R = 6371; // Earth's radius in km
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLon = (to.lng - from.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Estimate time (average 30 km/h in city)
    const estimatedMinutes = Math.ceil((distance / 30) * 60);
    setEta(estimatedMinutes);
  };

  const getStatusLabel = (status: DeliveryTask['status']) => {
    const labels = {
      assigned: 'Driver Assigned',
      en_route_pickup: 'Heading to Pickup',
      picked_up: 'Food Collected',
      en_route_delivery: 'Delivering',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: DeliveryTask['status']) => {
    const colors = {
      assigned: 'bg-blue-100 text-blue-700',
      en_route_pickup: 'bg-purple-100 text-purple-700',
      picked_up: 'bg-cyan-100 text-cyan-700',
      en_route_delivery: 'bg-orange-100 text-orange-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  if (loading) {
    return (
      <div className="card-fintech p-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded mb-4"></div>
        <div className="h-64 bg-slate-200 rounded"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="card-fintech p-6">
        <p className="text-slate-600">Delivery task not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="card-fintech p-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-zinc-900 mb-1">
              Live Tracking
            </h2>
            <p className="text-sm text-slate-600">
              Task ID: {task.taskId.substring(0, 12)}...
            </p>
          </div>
          <span className={`px-4 py-2 rounded-lg font-bold text-sm ${getStatusColor(task.status)}`}>
            {getStatusLabel(task.status)}
          </span>
        </div>

        {/* ETA Display */}
        {eta && ['en_route_pickup', 'en_route_delivery'].includes(task.status) && (
          <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-blue-300">
            <Clock size={20} className="text-blue-600" />
            <div>
              <p className="text-xs font-semibold text-slate-600">Estimated Arrival</p>
              <p className="text-lg font-black text-zinc-900">{eta} minutes</p>
            </div>
          </div>
        )}
      </div>

      {/* Map Placeholder */}
      <div className="card-fintech p-4">
        <div 
          ref={mapRef}
          className="relative w-full h-96 bg-slate-100 rounded-xl border-2 border-slate-300 flex items-center justify-center overflow-hidden"
        >
          {/* Map placeholder - would be replaced with actual Google Maps */}
          <div className="text-center">
            <MapPin size={48} className="text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600 mb-1">
              Live Map View
            </p>
            <p className="text-xs text-slate-500">
              Requires Google Maps API integration
            </p>
            
            {driverLocation && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg inline-block">
                <p className="text-xs font-semibold text-blue-900 mb-1">Driver Location</p>
                <p className="text-[10px] text-blue-700">
                  Lat: {driverLocation.lat.toFixed(4)}, Lng: {driverLocation.lng.toFixed(4)}
                </p>
              </div>
            )}
          </div>

          {/* Animated driver marker (visual effect) */}
          {driverLocation && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75" style={{ width: '24px', height: '24px' }} />
                <div className="relative bg-blue-600 rounded-full flex items-center justify-center" style={{ width: '24px', height: '24px' }}>
                  <Navigation size={14} className="text-white" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pickup Info */}
        <div className="card-fintech p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Package size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Pickup Location</h3>
              <p className="text-xs text-slate-600">{task.donorName || 'Donor'}</p>
            </div>
          </div>
          <p className="text-sm text-slate-700 mb-3">{task.pickupLocation.address}</p>
          {task.pickedUpAt && (
            <p className="text-xs text-green-600 font-semibold">
              ✓ Picked up at {task.pickedUpAt?.toDate?.().toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Dropoff Info */}
        <div className="card-fintech p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <MapPin size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Delivery Location</h3>
              <p className="text-xs text-slate-600">{task.ngoName || 'NGO'}</p>
            </div>
          </div>
          <p className="text-sm text-slate-700 mb-3">{task.dropoffLocation.address}</p>
          {task.deliveredAt && (
            <p className="text-xs text-green-600 font-semibold">
              ✓ Delivered at {task.deliveredAt?.toDate?.().toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Driver Info */}
      <div className="card-fintech p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
            <User size={24} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900">{task.driverName || 'Driver'}</h3>
            <p className="text-xs text-slate-600">Delivery Partner</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1">Distance</p>
            <p className="text-lg font-black text-zinc-900">{task.distanceKm.toFixed(1)} km</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1">Estimated Time</p>
            <p className="text-lg font-black text-zinc-900">{task.estimatedTimeMinutes} min</p>
          </div>
          {task.actualTimeMinutes && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1">Actual Time</p>
              <p className="text-lg font-black text-zinc-900">{task.actualTimeMinutes} min</p>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="card-fintech p-4 bg-blue-50 border border-blue-200">
        <p className="text-xs font-semibold text-blue-900 mb-2">📍 Tracking Information</p>
        <ul className="text-[10px] text-blue-700 space-y-1 ml-4 list-disc">
          <li>Driver location updates every 10 seconds</li>
          <li>Scan QR code at pickup and delivery for verification</li>
          <li>All events are logged to blockchain for transparency</li>
          <li>Contact support if driver doesn't arrive within estimated time</li>
        </ul>
      </div>
    </div>
  );
};

export default LiveTracking;

