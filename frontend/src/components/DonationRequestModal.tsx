import React, { useState, useEffect } from 'react';
import { X, MapPin, Phone, Mail, User, CheckCircle, XCircle, Package, TruckIcon, Clock, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

// Types
interface Request {
  id: string;
  ngoId: string;
  ngoName: string;
  ngoContact: string;
  ngoEmail?: string;
  ngoLatitude: number;
  ngoLongitude: number;
  status: 'requested' | 'approved' | 'rejected' | 'picked_up' | 'in_transit' | 'delivered' | 'fulfilled';
  requestedAt: string;
  approvedAt?: string;
  message?: string;
}

interface DonationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  donation: {
    id: string;
    foodName: string;
    quantity: number;
    quantityUnit?: string;
    status: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    donorName?: string;
  } | null;
  userRole: 'donor' | 'ngo';
  onStatusUpdate?: (donationId: string, newStatus: string) => Promise<void>;
}

// Progress Stages
const STAGES = [
  { key: 'requested', label: 'Requested', icon: User },
  { key: 'approved', label: 'Accepted', icon: CheckCircle },
  { key: 'picked_up', label: 'Picked Up', icon: Package },
  { key: 'in_transit', label: 'In Transit', icon: TruckIcon },
  { key: 'delivered', label: 'Delivered', icon: MapPin },
  { key: 'fulfilled', label: 'Verified', icon: CheckCircle }
];

const DonationRequestModal: React.FC<DonationRequestModalProps> = ({
  isOpen,
  onClose,
  donation,
  userRole,
  onStatusUpdate
}) => {
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch request details
  useEffect(() => {
    if (isOpen && donation) {
      fetchRequestDetails(donation.id);
    }
  }, [isOpen, donation]);

  const fetchRequestDetails = async (donationId: string) => {
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock API response - In production, replace with actual API call
    const mockRequest: Request = {
      id: 'req_' + Math.random().toString(36).substr(2, 9),
      ngoId: 'ngo_123',
      ngoName: 'Annapurna Food Bank',
      ngoContact: '+91 98765 43210',
      ngoEmail: 'contact@annapurnafood.org',
      ngoLatitude: donation?.latitude ? donation.latitude + 0.05 : 28.6139,
      ngoLongitude: donation?.longitude ? donation.longitude + 0.05 : 77.2090,
      status: donation?.status as any || 'requested',
      requestedAt: new Date(Date.now() - 30 * 60000).toISOString(),
      approvedAt: ['approved', 'picked_up', 'in_transit', 'delivered', 'fulfilled'].includes(donation?.status || '')
        ? new Date(Date.now() - 20 * 60000).toISOString()
        : undefined,
      message: 'We urgently need this food for our shelter. We can pick it up immediately.'
    };

    setRequest(mockRequest);
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!donation || !request) return;
    
    setActionLoading(true);
    try {
      // Simulate API call - In production, replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update status
      if (onStatusUpdate) {
        await onStatusUpdate(donation.id, 'approved');
      }

      // Update local state
      setRequest({ ...request, status: 'approved', approvedAt: new Date().toISOString() });
      
      toast.success('Request approved! NGO has been notified.');
    } catch (error) {
      console.error('Failed to approve request:', error);
      toast.error('Failed to approve request. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!donation || !request) return;
    
    setActionLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onStatusUpdate) {
        await onStatusUpdate(donation.id, 'available');
      }

      toast.info('Request rejected. Donation is available for others.');
      onClose();
    } catch (error) {
      console.error('Failed to reject request:', error);
      toast.error('Failed to reject request. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPickedUp = async () => {
    if (!donation) return;
    
    setActionLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onStatusUpdate) {
        await onStatusUpdate(donation.id, 'picked_up');
      }
      
      if (request) {
        setRequest({ ...request, status: 'picked_up' });
      }

      toast.success('Status updated to Picked Up!');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!donation) return;
    
    setActionLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onStatusUpdate) {
        await onStatusUpdate(donation.id, 'delivered');
      }
      
      if (request) {
        setRequest({ ...request, status: 'delivered' });
      }

      toast.success('Status updated to Delivered!');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const getCurrentStageIndex = () => {
    if (!request) return -1;
    return STAGES.findIndex(stage => stage.key === request.status);
  };

  const getMapEmbedUrl = () => {
    if (!donation?.latitude || !donation?.longitude || !request) return null;
    
    const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';
    if (!apiKey) return null;

    return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${donation.latitude},${donation.longitude}&destination=${request.ngoLatitude},${request.ngoLongitude}&mode=driving`;
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', { 
      month: 'short',
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (!isOpen || !donation) return null;

  const currentStageIndex = getCurrentStageIndex();
  const isApproved = request && ['approved', 'picked_up', 'in_transit', 'delivered', 'fulfilled'].includes(request.status);
  const isPending = request?.status === 'requested';
  const mapUrl = getMapEmbedUrl();

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
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
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
              <div className="overflow-y-auto max-h-[calc(90vh-280px)] p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : request ? (
                  <div className="space-y-6">
                    {/* Request Details Card */}
                    {userRole === 'donor' && isPending && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="text-white" size={24} />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-yellow-900 mb-2">
                              🔔 New Request Received
                            </h3>
                            <p className="text-yellow-800 mb-4">
                              An NGO has requested this donation. Please review and respond.
                            </p>
                            <div className="bg-white rounded-lg p-4 space-y-2 mb-4">
                              <div className="flex items-center gap-2">
                                <User size={16} className="text-slate-600" />
                                <span className="font-semibold text-slate-900">{request.ngoName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone size={16} className="text-slate-600" />
                                <span className="text-slate-700">{request.ngoContact}</span>
                              </div>
                              {request.ngoEmail && (
                                <div className="flex items-center gap-2">
                                  <Mail size={16} className="text-slate-600" />
                                  <span className="text-slate-700">{request.ngoEmail}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Clock size={16} className="text-slate-600" />
                                <span className="text-slate-600 text-sm">
                                  Requested at: {formatTime(request.requestedAt)}
                                </span>
                              </div>
                            </div>
                            {request.message && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                <p className="text-sm text-slate-700 italic">"{request.message}"</p>
                              </div>
                            )}
                            <div className="flex gap-3">
                              <button
                                onClick={handleApprove}
                                disabled={actionLoading}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
                              >
                                <CheckCircle size={20} />
                                {actionLoading ? 'Processing...' : 'Accept Request'}
                              </button>
                              <button
                                onClick={handleReject}
                                disabled={actionLoading}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                              >
                                <XCircle size={20} />
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* NGO Side - Request Accepted */}
                    {userRole === 'ngo' && isApproved && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-green-50 border-2 border-green-200 rounded-xl p-6"
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="text-white" size={24} />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-green-900 mb-2">
                              ✅ Request Accepted!
                            </h3>
                            <p className="text-green-800">
                              Your request was accepted by <strong>{donation.donorName || 'the donor'}</strong>
                            </p>
                            {request.approvedAt && (
                              <p className="text-sm text-green-700 mt-1">
                                Approved at: {formatTime(request.approvedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Map Route (shown after approval) */}
                    {isApproved && mapUrl && (
                      <div className="bg-slate-50 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Navigation className="text-blue-600" size={24} />
                          <h3 className="text-lg font-bold text-slate-900">Navigation Route</h3>
                        </div>
                        <div className="relative w-full h-[400px] bg-slate-200 rounded-xl overflow-hidden">
                          <iframe
                            src={mapUrl}
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            className="rounded-xl"
                          />
                        </div>
                        <div className="mt-4 bg-white rounded-lg p-4 space-y-2">
                          <div className="flex items-start gap-3">
                            <MapPin className="text-green-600 flex-shrink-0 mt-1" size={18} />
                            <div>
                              <p className="text-sm font-semibold text-slate-700">Pickup Location</p>
                              <p className="text-sm text-slate-600">{donation.location || 'Donor location'}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <MapPin className="text-red-600 flex-shrink-0 mt-1" size={18} />
                            <div>
                              <p className="text-sm font-semibold text-slate-700">Delivery Location</p>
                              <p className="text-sm text-slate-600">{request.ngoName}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Status Update Actions (NGO Side) */}
                    {userRole === 'ngo' && isApproved && request.status !== 'fulfilled' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Update Status</h3>
                        <div className="flex flex-wrap gap-3">
                          {request.status === 'approved' && (
                            <button
                              onClick={handleMarkPickedUp}
                              disabled={actionLoading}
                              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              <Package size={20} />
                              Mark as Picked Up
                            </button>
                          )}
                          {request.status === 'picked_up' && (
                            <button
                              onClick={handleMarkDelivered}
                              disabled={actionLoading}
                              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle size={20} />
                              Mark as Delivered
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Progress Bar */}
                    {request.status !== 'rejected' && (
                      <div className="bg-white border border-slate-200 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-6">Donation Progress</h3>
                        
                        {/* Progress Line */}
                        <div className="relative mb-8">
                          <div className="absolute top-6 left-0 right-0 h-1 bg-slate-200">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ 
                                width: `${(currentStageIndex / (STAGES.length - 1)) * 100}%` 
                              }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                            />
                          </div>

                          {/* Stage Circles */}
                          <div className="relative flex justify-between">
                            {STAGES.map((stage, index) => {
                              const isCompleted = index <= currentStageIndex;
                              const isCurrent = index === currentStageIndex;
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
                                        ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white' 
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

                        {/* Current Status */}
                        <div className="text-center">
                          <span className={`
                            inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold
                            ${currentStageIndex === STAGES.length - 1
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                            }
                          `}>
                            {currentStageIndex === STAGES.length - 1 ? (
                              <>
                                <CheckCircle size={16} />
                                Donation Completed!
                              </>
                            ) : (
                              <>
                                <Clock size={16} />
                                Currently: {STAGES[currentStageIndex]?.label || 'Processing'}
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package size={48} className="mx-auto text-slate-400 mb-4" />
                    <p className="text-slate-600 font-semibold">No request found</p>
                    <p className="text-sm text-slate-500 mt-2">
                      This donation hasn't been requested yet
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

export default DonationRequestModal;

