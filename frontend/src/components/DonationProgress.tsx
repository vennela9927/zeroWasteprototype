import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, CheckCircle, Package, Truck, MapPin, 
  ShieldCheck, Clock, X, Upload, Download, 
  RefreshCw, AlertCircle, Map as MapIcon
} from 'lucide-react';
import { doc, getDoc, updateDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'react-toastify';
import ProofUpload from './ProofUpload';
import CSRGenerator from './CSRGenerator';

interface DonationProgressProps {
  claimId: string;
  userRole: 'donor' | 'ngo';
  onClose: () => void;
}

interface TimelineEvent {
  stage: string;
  time: Date;
  updatedBy?: string;
}

interface DonationData {
  id: string;
  foodName: string;
  donorName: string;
  recipientName: string;
  quantity: number;
  status: string;
  timeline: TimelineEvent[];
  proofImage?: string;
  proofFileName?: string;
  verifiedAt?: Date;
  latitude?: number;
  longitude?: number;
  donorLatitude?: number;
  donorLongitude?: number;
  location?: string;
}

const STAGES = [
  { key: 'requested', label: 'Requested', icon: User },
  { key: 'approved', label: 'Accepted', icon: CheckCircle },
  { key: 'picked_up', label: 'Picked Up', icon: Package },
  { key: 'in_transit', label: 'In Transit', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: MapPin },
  { key: 'verified', label: 'Verified', icon: ShieldCheck },
];

const DonationProgress: React.FC<DonationProgressProps> = ({ claimId, userRole, onClose }) => {
  const [donation, setDonation] = useState<DonationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showProofUpload, setShowProofUpload] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);

  // ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Real-time listener for donation data - INSTANT UPDATES!
  useEffect(() => {
    console.log(`\n🔄 [DONATION PROGRESS] Setting up real-time listener for claim: ${claimId}`);
    
    const unsubscribe = onSnapshot(
      doc(db, 'claims', claimId),
      (claimDoc) => {
        if (claimDoc.exists()) {
          const data = claimDoc.data();
          
          console.log(`\n📝 [DONATION PROGRESS] ⚡ REAL-TIME UPDATE RECEIVED`);
          console.log(`   Claim ID: ${claimId}`);
          console.log(`   Status: ${data.status}`);
          console.log(`   Food: ${data.foodName || data.name}`);
          console.log(`   User Role: ${userRole}`);
          console.log(`   Approved At: ${data.approvedAt ? 'YES' : 'NO'}`);
          console.log(`   Raw Data:`, data);
          console.log(`   Timestamps:`, {
            requestedAt: data.requestedAt,
            approvedAt: data.approvedAt,
            pickedUpAt: data.pickedUpAt,
            deliveredAt: data.deliveredAt,
          });
          
          // Flash visual indicator on update
          setJustUpdated(true);
          setTimeout(() => setJustUpdated(false), 2000);
          
          // Show toast notification on status change
          if (donation && donation.status !== data.status) {
            const statusLabels: Record<string, string> = {
              requested: 'Requested',
              approved: 'Accepted',
              picked_up: 'Picked Up',
              in_transit: 'In Transit',
              delivered: 'Delivered',
              verified: 'Verified',
            };
            toast.info(`✨ Status updated to: ${statusLabels[data.status] || data.status}`, {
              autoClose: 3000,
            });
          }
          
          // Build timeline from status
          const timeline: TimelineEvent[] = [];
          if (data.requestedAt) {
            timeline.push({
              stage: 'requested',
              time: data.requestedAt.toDate(),
              updatedBy: data.recipientName,
            });
          }
          if (data.approvedAt) {
            timeline.push({
              stage: 'approved',
              time: data.approvedAt.toDate(),
              updatedBy: data.donorName,
            });
            console.log(`   ✅ Approved at: ${data.approvedAt.toDate().toLocaleString()}`);
          }
          if (data.pickedUpAt) {
            timeline.push({
              stage: 'picked_up',
              time: data.pickedUpAt.toDate(),
              updatedBy: data.recipientName,
            });
          }
          if (data.inTransitAt) {
            timeline.push({
              stage: 'in_transit',
              time: data.inTransitAt.toDate(),
              updatedBy: data.recipientName,
            });
          }
          if (data.deliveredAt) {
            timeline.push({
              stage: 'delivered',
              time: data.deliveredAt.toDate(),
              updatedBy: data.recipientName,
            });
          }
          if (data.verifiedAt) {
            timeline.push({
              stage: 'verified',
              time: data.verifiedAt.toDate(),
              updatedBy: data.recipientName,
            });
          }

          setDonation({
            id: claimId,
            foodName: data.foodName || data.name || 'Food Item',
            donorName: data.donorName || 'Anonymous',
            recipientName: data.recipientName || 'NGO',
            quantity: data.quantity || 0,
            status: data.status || 'requested',
            timeline,
            proofImage: data.proofImage,
            proofFileName: data.proofFileName,
            verifiedAt: data.verifiedAt?.toDate(),
            latitude: data.latitude,
            longitude: data.longitude,
            donorLatitude: data.donorLatitude,
            donorLongitude: data.donorLongitude,
            location: data.location,
          });
          
          setLoading(false);
        } else {
          console.error(`❌ [DONATION PROGRESS] Claim not found: ${claimId}`);
          toast.error('Donation not found');
          setLoading(false);
        }
      },
      (error) => {
        console.error('❌ [DONATION PROGRESS] Real-time listener error:', error);
        toast.error('Failed to fetch donation details');
        setLoading(false);
      }
    );

    return () => {
      console.log(`🔌 [DONATION PROGRESS] Unsubscribing from claim: ${claimId}`);
      unsubscribe();
    };
  }, [claimId]);

  // Update donation status
  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const updateData: any = {
        status: newStatus,
      };

      // Add timestamp for each stage
      if (newStatus === 'approved') {
        updateData.approvedAt = Timestamp.now();
      } else if (newStatus === 'picked_up') {
        updateData.pickedUpAt = Timestamp.now();
      } else if (newStatus === 'in_transit') {
        updateData.inTransitAt = Timestamp.now();
      } else if (newStatus === 'delivered') {
        updateData.deliveredAt = Timestamp.now();
      } else if (newStatus === 'verified') {
        updateData.verifiedAt = Timestamp.now();
      }

      await updateDoc(doc(db, 'claims', claimId), updateData);
      
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      // onSnapshot listener will automatically update the UI!
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  // Handle proof upload success
  const handleProofUploaded = async (imageUrl: string, fileName: string) => {
    try {
      await updateDoc(doc(db, 'claims', claimId), {
        proofImage: imageUrl,
        proofFileName: fileName,
      });
      
      toast.success('Proof uploaded successfully');
      setShowProofUpload(false);
      // onSnapshot listener will automatically update the UI!
    } catch (error) {
      console.error('Error saving proof:', error);
      toast.error('Failed to save proof');
    }
  };

  // Get current stage index
  const getCurrentStageIndex = () => {
    if (!donation) return 0;
    return STAGES.findIndex(s => s.key === donation.status);
  };

  // Check if stage is completed
  const isStageCompleted = (stageKey: string) => {
    const currentIndex = getCurrentStageIndex();
    const stageIndex = STAGES.findIndex(s => s.key === stageKey);
    return stageIndex <= currentIndex;
  };

  // Get action button for current user
  const getActionButton = () => {
    if (!donation) return null;

    const currentStatus = donation.status;

    // Donor actions
    if (userRole === 'donor') {
      if (currentStatus === 'requested') {
        return (
          <div className="flex gap-3">
            <button
              onClick={() => updateStatus('approved')}
              disabled={updating}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold py-3 px-6 rounded-xl hover:from-green-700 hover:to-emerald-600 transition-all disabled:opacity-50"
            >
              {updating ? 'Updating...' : '✅ Accept Request'}
            </button>
            <button
              onClick={() => updateStatus('rejected')}
              disabled={updating}
              className="flex-1 bg-gradient-to-r from-red-600 to-rose-500 text-white font-bold py-3 px-6 rounded-xl hover:from-red-700 hover:to-rose-600 transition-all disabled:opacity-50"
            >
              {updating ? 'Updating...' : '❌ Reject'}
            </button>
          </div>
        );
      }
    }

    // NGO actions
    if (userRole === 'ngo') {
      if (currentStatus === 'approved') {
        return (
          <button
            onClick={() => updateStatus('picked_up')}
            disabled={updating}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold py-3 px-6 rounded-xl hover:from-blue-700 hover:to-cyan-600 transition-all disabled:opacity-50"
          >
            {updating ? 'Updating...' : '📦 Mark as Picked Up'}
          </button>
        );
      }
      if (currentStatus === 'picked_up') {
        return (
          <button
            onClick={() => updateStatus('in_transit')}
            disabled={updating}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-500 text-white font-bold py-3 px-6 rounded-xl hover:from-purple-700 hover:to-indigo-600 transition-all disabled:opacity-50"
          >
            {updating ? 'Updating...' : '🚚 Mark as In Transit'}
          </button>
        );
      }
      if (currentStatus === 'in_transit') {
        return (
          <button
            onClick={() => updateStatus('delivered')}
            disabled={updating}
            className="w-full bg-gradient-to-r from-orange-600 to-amber-500 text-white font-bold py-3 px-6 rounded-xl hover:from-orange-700 hover:to-amber-600 transition-all disabled:opacity-50"
          >
            {updating ? 'Updating...' : '📍 Mark as Delivered'}
          </button>
        );
      }
      if (currentStatus === 'delivered') {
        return (
          <button
            onClick={() => setShowProofUpload(true)}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-500 text-white font-bold py-3 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-600 transition-all"
          >
            <Upload className="inline mr-2" size={20} />
            Upload Proof & Verify
          </button>
        );
      }
    }

    return null;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-slate-600">Loading donation details...</p>
        </div>
      </div>
    );
  }

  if (!donation) {
    return null;
  }

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
        onClick={(e) => {
          // Close modal when clicking on backdrop
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">Donation Progress</h2>
                <p className="text-blue-100 text-sm">{donation.foodName} • {donation.quantity} servings</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Real-time Updates Indicator */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 ${
                  justUpdated 
                    ? 'bg-yellow-400 bg-opacity-40 border-yellow-400 animate-pulse' 
                    : 'bg-green-500 bg-opacity-20 border-green-400 border-opacity-30'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    justUpdated ? 'bg-yellow-300 animate-ping' : 'bg-green-400 animate-pulse'
                  }`}></div>
                  <span className={`text-xs font-medium ${
                    justUpdated ? 'text-yellow-100' : 'text-green-100'
                  }`}>
                    {justUpdated ? '⚡ Updating...' : 'Live Updates'}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all hover:scale-110"
                  title="Close (ESC)"
                  aria-label="Close modal"
                >
                  <X size={24} className="text-white" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Donation Info */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4">
              <div>
                <p className="text-sm text-slate-600">Donor</p>
                <p className="font-bold text-slate-900">{donation.donorName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">NGO</p>
                <p className="font-bold text-slate-900">{donation.recipientName}</p>
              </div>
            </div>

            {/* Current Status Badge */}
            <div className="flex items-center justify-center">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-full px-6 py-3 flex items-center gap-2">
                <Clock className="text-blue-600" size={20} />
                <span className="font-bold text-blue-900">
                  Currently: {STAGES.find(s => s.key === donation.status)?.label || donation.status}
                </span>
              </div>
            </div>

            {/* Progress Timeline */}
            <div className="relative">
              <div className="flex items-center justify-between mb-8">
                {STAGES.map((stage, index) => {
                  const Icon = stage.icon;
                  const isCompleted = isStageCompleted(stage.key);
                  const isCurrent = donation.status === stage.key;

                  return (
                    <React.Fragment key={stage.key}>
                      <div className="flex flex-col items-center relative z-10">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-all ${
                            isCompleted
                              ? 'bg-gradient-to-br from-green-500 to-emerald-400 text-white shadow-lg'
                              : isCurrent
                              ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg animate-pulse'
                              : 'bg-slate-200 text-slate-400'
                          }`}
                        >
                          <Icon size={28} />
                        </motion.div>
                        <p className={`text-xs font-semibold text-center ${
                          isCompleted || isCurrent ? 'text-slate-900' : 'text-slate-400'
                        }`}>
                          {stage.label}
                        </p>
                      </div>

                      {index < STAGES.length - 1 && (
                        <div className={`flex-1 h-2 rounded-full mx-2 transition-all ${
                          isStageCompleted(STAGES[index + 1].key)
                            ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                            : 'bg-slate-200'
                        }`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Timeline Details */}
            <div className="bg-slate-50 rounded-xl p-4 max-h-48 overflow-y-auto">
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Clock size={20} className="text-blue-600" />
                Timeline
              </h3>
              <div className="space-y-2">
                {donation.timeline.length === 0 ? (
                  <p className="text-sm text-slate-500">No timeline events yet</p>
                ) : (
                  donation.timeline.map((event, index) => (
                    <div key={index} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">
                          {STAGES.find(s => s.key === event.stage)?.label || event.stage}
                        </p>
                        <p className="text-slate-600">
                          {event.time.toLocaleString()} • {event.updatedBy}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Map View (In Transit) */}
            {donation.status === 'in_transit' && donation.latitude && donation.longitude && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-purple-900 flex items-center gap-2">
                    <MapIcon size={20} />
                    Delivery Route
                  </h3>
                  <button
                    onClick={() => setShowMap(!showMap)}
                    className="text-purple-600 hover:text-purple-800 font-semibold text-sm"
                  >
                    {showMap ? 'Hide Map' : 'Show Map'}
                  </button>
                </div>
                
                {showMap && (
                  <div className="rounded-lg overflow-hidden">
                    <iframe
                      width="100%"
                      height="300"
                      frameBorder="0"
                      src={`https://www.google.com/maps/embed/v1/directions?key=YOUR_API_KEY&origin=${donation.donorLatitude || donation.latitude},${donation.donorLongitude || donation.longitude}&destination=${donation.latitude},${donation.longitude}&mode=driving`}
                      allowFullScreen
                      className="border-0"
                    ></iframe>
                    <div className="mt-2 text-xs text-purple-700">
                      📍 From: {donation.location} → To: NGO Location
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Proof Image (if uploaded) */}
            {donation.proofImage && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                  <ShieldCheck size={20} />
                  Delivery Proof
                </h3>
                <img
                  src={donation.proofImage}
                  alt="Delivery Proof"
                  className="w-full max-h-64 object-contain rounded-lg border-2 border-green-300"
                />
                <p className="text-sm text-green-700 mt-2">
                  📄 {donation.proofFileName || 'proof.jpg'}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {getActionButton()}

              {/* CSR Certificate Download (Donor only, after verified) */}
              {userRole === 'donor' && donation.status === 'verified' && (
                <CSRGenerator donation={donation} />
              )}
            </div>

            {/* Status Messages */}
            {donation.status === 'rejected' && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
                <div>
                  <h4 className="font-bold text-red-900">Request Rejected</h4>
                  <p className="text-sm text-red-700">This donation request was rejected by the donor.</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer with Close Button */}
          <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent p-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-slate-600 to-slate-700 text-white font-bold py-3 px-6 rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all flex items-center justify-center gap-2"
            >
              <X size={20} />
              Close (Press ESC)
            </button>
          </div>
        </motion.div>
      </div>

      {/* Proof Upload Modal */}
      {showProofUpload && (
        <ProofUpload
          claimId={claimId}
          onClose={() => setShowProofUpload(false)}
          onSuccess={handleProofUploaded}
        />
      )}
    </>
  );
};

export default DonationProgress;

