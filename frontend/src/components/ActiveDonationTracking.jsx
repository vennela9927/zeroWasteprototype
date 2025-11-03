import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  CheckCircle2, 
  Truck, 
  MapPin, 
  Clock,
  AlertCircle,
  Navigation
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const STATUSES = {
  submitted: { label: 'Submitted', icon: Package, color: 'blue' },
  matched: { label: 'Matched', icon: CheckCircle2, color: 'purple' },
  pickup: { label: 'Pickup Scheduled', icon: MapPin, color: 'orange' },
  in_transit: { label: 'In Transit', icon: Truck, color: 'cyan' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'green' },
};

const ActiveDonationTracking = ({ activeDonations, onViewDetails }) => {
  const [expandedDonation, setExpandedDonation] = useState(null);

  if (!activeDonations || activeDonations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-8">
        <div className="text-center text-slate-500">
          <Package size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold mb-2">No Active Donations</h3>
          <p className="text-sm">Submit a donation to start tracking!</p>
        </div>
      </div>
    );
  }

  const getStatusIndex = (status) => {
    const statusKeys = ['submitted', 'matched', 'pickup', 'in_transit', 'delivered'];
    const normalizedStatus = status?.toLowerCase() || 'submitted';
    
    // Map various status strings to our canonical statuses
    if (normalizedStatus.includes('submit') || normalizedStatus === 'available') return 0;
    if (normalizedStatus.includes('match') || normalizedStatus === 'requested') return 1;
    if (normalizedStatus.includes('pickup') || normalizedStatus.includes('approved')) return 2;
    if (normalizedStatus.includes('transit') || normalizedStatus === 'claimed') return 3;
    if (normalizedStatus.includes('deliver') || normalizedStatus === 'fulfilled') return 4;
    
    return 0;
  };

  const getStatusColor = (status) => {
    const colors = {
      blue: 'bg-blue-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      cyan: 'bg-cyan-500',
      green: 'bg-green-500',
    };
    const statusKey = Object.keys(STATUSES)[getStatusIndex(status)];
    return colors[STATUSES[statusKey]?.color] || 'bg-slate-500';
  };

  const calculateETA = (donation) => {
    const statusIndex = getStatusIndex(donation.status);
    const expiryDate = donation.expiryTime?.toDate ? donation.expiryTime.toDate() : new Date(donation.expiry || Date.now() + 24 * 60 * 60 * 1000);
    
    // Different ETA based on status
    switch (statusIndex) {
      case 0: // submitted
        return 'Awaiting NGO match';
      case 1: // matched
        return 'Pickup within 2 hours';
      case 2: // pickup
        return '30-60 minutes';
      case 3: // in_transit
        return '15-30 minutes to delivery';
      case 4: // delivered
        return 'Completed';
      default:
        return formatDistanceToNow(expiryDate, { addSuffix: true });
    }
  };

  return (
    <div className="space-y-4">
      {activeDonations.map((donation, index) => {
        const currentStatusIndex = getStatusIndex(donation.status);
        const isExpanded = expandedDonation === donation.id;
        const eta = calculateETA(donation);

        return (
          <motion.div
            key={donation.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm border overflow-hidden"
          >
            {/* Header - Clickable */}
            <div
              onClick={() => setExpandedDonation(isExpanded ? null : donation.id)}
              className="p-6 cursor-pointer hover:bg-slate-50 transition"
            >
              <div className="flex items-center justify-between gap-4">
                {/* Donation Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Package className="text-blue-700" size={24} />
                    <div>
                      <h3 className="font-bold text-lg text-zinc-900">
                        {donation.foodName || donation.name || 'Food Donation'}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {donation.quantity} {donation.quantityUnit || 'kg'} • {donation.location}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Current Status Badge */}
                <div className="text-center">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white ${getStatusColor(donation.status)}`}>
                    {React.createElement(STATUSES[Object.keys(STATUSES)[currentStatusIndex]]?.icon || Package, { size: 18 })}
                    <span className="font-semibold text-sm">
                      {STATUSES[Object.keys(STATUSES)[currentStatusIndex]]?.label || 'Submitted'}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-2 text-xs text-slate-600">
                    <Clock size={14} />
                    <span>{eta}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Content - Timeline */}
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-slate-200"
              >
                <div className="p-6 bg-slate-50">
                  {/* Timeline */}
                  <div className="relative">
                    {/* Progress Line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />
                    <div 
                      className="absolute left-6 top-0 w-0.5 bg-gradient-to-b from-blue-500 to-green-500 transition-all duration-1000"
                      style={{ height: `${(currentStatusIndex / 4) * 100}%` }}
                    />

                    {/* Timeline Steps */}
                    <div className="space-y-6">
                      {Object.entries(STATUSES).map(([key, statusInfo], index) => {
                        const isCompleted = index <= currentStatusIndex;
                        const isCurrent = index === currentStatusIndex;
                        const Icon = statusInfo.icon;

                        return (
                          <div key={key} className="relative flex items-start gap-4">
                            {/* Icon Circle */}
                            <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 border-white transition-all ${
                              isCompleted 
                                ? `${getStatusColor(key)} text-white shadow-lg`
                                : 'bg-slate-200 text-slate-400'
                            }`}>
                              <Icon size={20} strokeWidth={isCompleted ? 2.5 : 2} />
                            </div>

                            {/* Status Info */}
                            <div className="flex-1 pt-2">
                              <div className="flex items-center justify-between">
                                <h4 className={`font-bold ${isCompleted ? 'text-zinc-900' : 'text-slate-500'}`}>
                                  {statusInfo.label}
                                </h4>
                                {isCurrent && (
                                  <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                                    Current
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 mt-1">
                                {index === 0 && 'Donation submitted and registered in system'}
                                {index === 1 && 'AI matched with suitable NGO'}
                                {index === 2 && 'NGO scheduled pickup time'}
                                {index === 3 && 'Food is being transported to NGO'}
                                {index === 4 && 'Successfully delivered to beneficiaries'}
                              </p>
                              {isCompleted && donation[`${key}At`] && (
                                <p className="text-xs text-slate-500 mt-1">
                                  {formatDistanceToNow(
                                    donation[`${key}At`]?.toDate ? donation[`${key}At`].toDate() : new Date(),
                                    { addSuffix: true }
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 flex items-center gap-3">
                    {donation.latitude && donation.longitude && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${donation.latitude},${donation.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-sm"
                      >
                        <Navigation size={16} />
                        Get Directions
                      </a>
                    )}
                    {onViewDetails && (
                      <button
                        onClick={() => onViewDetails(donation)}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition text-sm"
                      >
                        View Full Details
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}

      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-black text-blue-700">{activeDonations.length}</div>
            <div className="text-xs text-blue-600 font-medium mt-1">Active</div>
          </div>
          <div>
            <div className="text-2xl font-black text-purple-700">
              {activeDonations.filter(d => getStatusIndex(d.status) >= 1).length}
            </div>
            <div className="text-xs text-purple-600 font-medium mt-1">Matched</div>
          </div>
          <div>
            <div className="text-2xl font-black text-cyan-700">
              {activeDonations.filter(d => getStatusIndex(d.status) >= 3).length}
            </div>
            <div className="text-xs text-cyan-600 font-medium mt-1">In Transit</div>
          </div>
          <div>
            <div className="text-2xl font-black text-green-700">
              {activeDonations.reduce((sum, d) => sum + (d.quantity || 0), 0)}
            </div>
            <div className="text-xs text-green-600 font-medium mt-1">Total Meals</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveDonationTracking;


