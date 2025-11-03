import React, { useState, useEffect } from 'react';
import { X, Package, TruckIcon, CheckCircle, Clock, MapPin, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface TimelineEvent {
  stage: string;
  time: string;
  actor?: string;
  location?: string;
}

interface DonationStatus {
  status: string;
  timeline: TimelineEvent[];
  currentStageIndex: number;
}

interface DonationProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  donation: {
    id: string;
    foodName: string;
    quantity: number;
    quantityUnit?: string;
    status: string;
    ngoName?: string;
    createdAt?: any;
  } | null;
}

// Progress Stages Configuration
const STAGES = [
  { key: 'assigned', label: 'Assigned', icon: User, color: 'blue' },
  { key: 'picked_up', label: 'Picked Up', icon: Package, color: 'purple' },
  { key: 'in_transit', label: 'In Transit', icon: TruckIcon, color: 'orange' },
  { key: 'delivered', label: 'Delivered', icon: MapPin, color: 'green' },
  { key: 'verified', label: 'Verified', icon: CheckCircle, color: 'emerald' }
];

const DonationProgressModal: React.FC<DonationProgressModalProps> = ({
  isOpen,
  onClose,
  donation
}) => {
  const [statusData, setStatusData] = useState<DonationStatus | null>(null);
  const [loading, setLoading] = useState(false);

  // Simulate API call to fetch donation status
  useEffect(() => {
    if (isOpen && donation) {
      fetchDonationStatus(donation.id, donation.status);
    }
  }, [isOpen, donation]);

  const fetchDonationStatus = async (donationId: string, currentStatus: string) => {
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock API response based on current status
    const mockTimeline = generateMockTimeline(currentStatus);
    const currentStageIndex = getCurrentStageIndex(currentStatus);

    setStatusData({
      status: currentStatus,
      timeline: mockTimeline,
      currentStageIndex
    });

    setLoading(false);
  };

  const generateMockTimeline = (status: string): TimelineEvent[] => {
    const now = new Date();
    const timeline: TimelineEvent[] = [];
    
    const statusMap: { [key: string]: number } = {
      'available': -1,
      'requested': 0,
      'approved': 0,
      'assigned': 0,
      'picked_up': 1,
      'in_transit': 2,
      'delivered': 3,
      'fulfilled': 4,
      'verified': 4
    };

    const maxStage = statusMap[status.toLowerCase()] ?? -1;

    if (maxStage >= 0) {
      timeline.push({
        stage: 'Assigned',
        time: new Date(now.getTime() - 120 * 60000).toISOString(),
        actor: donation?.ngoName || 'NGO Partner',
        location: 'Accepted donation request'
      });
    }

    if (maxStage >= 1) {
      timeline.push({
        stage: 'Picked Up',
        time: new Date(now.getTime() - 75 * 60000).toISOString(),
        actor: 'Driver (Ravi Kumar)',
        location: 'Pickup location confirmed'
      });
    }

    if (maxStage >= 2) {
      timeline.push({
        stage: 'In Transit',
        time: new Date(now.getTime() - 45 * 60000).toISOString(),
        actor: 'Driver (Ravi Kumar)',
        location: 'En route to NGO center'
      });
    }

    if (maxStage >= 3) {
      timeline.push({
        stage: 'Delivered',
        time: new Date(now.getTime() - 10 * 60000).toISOString(),
        actor: donation?.ngoName || 'NGO Partner',
        location: 'Delivered successfully'
      });
    }

    if (maxStage >= 4) {
      timeline.push({
        stage: 'Verified',
        time: new Date(now.getTime() - 5 * 60000).toISOString(),
        actor: donation?.ngoName || 'NGO Partner',
        location: 'Quality verified, distributed to beneficiaries'
      });
    }

    return timeline;
  };

  const getCurrentStageIndex = (status: string): number => {
    const statusMap: { [key: string]: number } = {
      'available': -1,
      'requested': 0,
      'approved': 0,
      'assigned': 0,
      'picked_up': 1,
      'in_transit': 2,
      'delivered': 3,
      'fulfilled': 4,
      'verified': 4
    };

    return statusMap[status.toLowerCase()] ?? -1;
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!isOpen || !donation) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-5 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Package size={24} />
                      <h2 className="text-2xl font-black">{donation.foodName}</h2>
                    </div>
                    <p className="text-blue-100 text-sm">
                      Donation ID: #{donation.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-blue-100 text-sm">
                      Quantity: {donation.quantity} {donation.quantityUnit || 'meals'}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : statusData && statusData.currentStageIndex >= 0 ? (
                  <>
                    {/* Progress Tracker */}
                    <div className="mb-8">
                      <h3 className="text-lg font-bold text-slate-800 mb-6">Donation Progress</h3>
                      
                      {/* Progress Steps */}
                      <div className="relative">
                        {/* Progress Line */}
                        <div className="absolute top-6 left-0 right-0 h-1 bg-slate-200">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ 
                              width: `${(statusData.currentStageIndex / (STAGES.length - 1)) * 100}%` 
                            }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                          />
                        </div>

                        {/* Stage Circles */}
                        <div className="relative flex justify-between">
                          {STAGES.map((stage, index) => {
                            const isCompleted = index <= statusData.currentStageIndex;
                            const isCurrent = index === statusData.currentStageIndex;
                            const Icon = stage.icon;

                            return (
                              <div key={stage.key} className="flex flex-col items-center">
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: index * 0.1 }}
                                  className={`
                                    w-12 h-12 rounded-full flex items-center justify-center z-10 border-4 border-white shadow-lg
                                    ${isCompleted 
                                      ? `bg-gradient-to-br from-green-500 to-emerald-500 text-white` 
                                      : 'bg-slate-200 text-slate-400'
                                    }
                                    ${isCurrent ? 'ring-4 ring-green-200 animate-pulse' : ''}
                                  `}
                                >
                                  <Icon size={20} />
                                </motion.div>
                                <p className={`
                                  text-xs font-semibold mt-2 text-center max-w-[80px]
                                  ${isCompleted ? 'text-slate-800' : 'text-slate-400'}
                                `}>
                                  {stage.label}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Timeline Feed */}
                    <div className="bg-slate-50 rounded-xl p-6">
                      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Clock size={20} />
                        Activity Timeline
                      </h3>

                      <div className="space-y-4">
                        {statusData.timeline.map((event, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex gap-4 items-start"
                          >
                            {/* Timeline Dot */}
                            <div className="relative">
                              <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5 ring-4 ring-green-100" />
                              {index !== statusData.timeline.length - 1 && (
                                <div className="absolute top-6 left-1/2 w-0.5 h-12 bg-slate-200 -translate-x-1/2" />
                              )}
                            </div>

                            {/* Event Card */}
                            <div className="flex-1 bg-white rounded-lg p-4 shadow-sm border border-slate-100">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-bold text-slate-800">{event.stage}</h4>
                                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                  {formatTime(event.time)}
                                </span>
                              </div>
                              {event.actor && (
                                <p className="text-sm text-slate-600 mb-1">
                                  👤 {event.actor}
                                </p>
                              )}
                              {event.location && (
                                <p className="text-sm text-slate-500">
                                  📍 {event.location}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Current Status Badge */}
                      <div className="mt-6 text-center">
                        <span className={`
                          inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold
                          ${statusData.currentStageIndex === STAGES.length - 1
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                          }
                        `}>
                          {statusData.currentStageIndex === STAGES.length - 1 ? (
                            <>
                              <CheckCircle size={16} />
                              Donation Completed & Verified
                            </>
                          ) : (
                            <>
                              <Clock size={16} />
                              Currently: {STAGES[statusData.currentStageIndex]?.label}
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-slate-400 mb-4">
                      <Package size={48} className="mx-auto" />
                    </div>
                    <p className="text-slate-600 font-semibold">No tracking available yet</p>
                    <p className="text-sm text-slate-500 mt-2">
                      This donation is still awaiting assignment
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold rounded-xl hover:from-blue-700 hover:to-cyan-600 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DonationProgressModal;

