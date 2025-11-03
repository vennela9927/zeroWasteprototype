import React, { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AnomalyScore, updateAnomalyStatus } from '../utils/anomalyDetection';
import { AlertTriangle, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';

/**
 * Admin Anomaly Dashboard
 * 
 * Displays users with anomaly scores and allows manual review/blocking.
 * For admin use only.
 */
export const AnomalyDashboard: React.FC = () => {
  const [anomalies, setAnomalies] = useState<AnomalyScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'blocked' | 'suspicious' | 'warning' | 'safe'>('all');
  const [reviewing, setReviewing] = useState<string | null>(null);

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const fetchAnomalies = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'anomaly_scores'), orderBy('riskScore', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ ...doc.data() } as AnomalyScore));
      setAnomalies(data);
    } catch (error) {
      console.error('Failed to fetch anomalies:', error);
      toast.error('Failed to load anomaly data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (userId: string, status: AnomalyScore['status']) => {
    try {
      setReviewing(userId);
      await updateAnomalyStatus(userId, status, 'Manual review by admin');
      toast.success(`User status updated to: ${status}`);
      await fetchAnomalies(); // Refresh
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update user status');
    } finally {
      setReviewing(null);
    }
  };

  const filteredAnomalies = filter === 'all' 
    ? anomalies 
    : anomalies.filter(a => a.status === filter);

  const getStatusConfig = (status: AnomalyScore['status']) => {
    const configs = {
      safe: { icon: CheckCircle, color: 'text-green-600 bg-green-100', label: 'Safe' },
      warning: { icon: AlertCircle, color: 'text-yellow-600 bg-yellow-100', label: 'Warning' },
      suspicious: { icon: AlertTriangle, color: 'text-orange-600 bg-orange-100', label: 'Suspicious' },
      blocked: { icon: Shield, color: 'text-red-600 bg-red-100', label: 'Blocked' },
    };
    return configs[status];
  };

  if (loading) {
    return (
      <div className="card-fintech p-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-fintech p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-zinc-900 mb-1">Anomaly Detection Dashboard</h2>
            <p className="text-sm text-slate-600">Monitor suspicious user activity and fraud patterns</p>
          </div>
          <Shield size={32} className="text-blue-600" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs font-semibold text-red-600 uppercase">Blocked</p>
            <p className="text-2xl font-black text-red-700">{anomalies.filter(a => a.status === 'blocked').length}</p>
          </div>
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs font-semibold text-orange-600 uppercase">Suspicious</p>
            <p className="text-2xl font-black text-orange-700">{anomalies.filter(a => a.status === 'suspicious').length}</p>
          </div>
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs font-semibold text-yellow-600 uppercase">Warning</p>
            <p className="text-2xl font-black text-yellow-700">{anomalies.filter(a => a.status === 'warning').length}</p>
          </div>
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs font-semibold text-green-600 uppercase">Safe</p>
            <p className="text-2xl font-black text-green-700">{anomalies.filter(a => a.status === 'safe').length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-fintech p-4">
        <div className="flex flex-wrap gap-2">
          {(['all', 'blocked', 'suspicious', 'warning', 'safe'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition ${
                filter === f
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Anomaly List */}
      <div className="card-fintech p-6">
        <div className="space-y-4">
          {filteredAnomalies.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No anomalies found for this filter.</p>
          ) : (
            filteredAnomalies.map((anomaly) => {
              const statusConfig = getStatusConfig(anomaly.status);
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={anomaly.userId}
                  className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-800">{anomaly.userId}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                          {anomaly.userRole}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Last analyzed: {anomaly.lastAnalyzed?.toDate?.().toLocaleString() || 'N/A'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1.5 rounded-lg flex items-center gap-2 ${statusConfig.color}`}>
                        <StatusIcon size={14} />
                        <span className="text-xs font-bold">{statusConfig.label}</span>
                      </span>
                      <span className="text-2xl font-black text-zinc-900">{anomaly.riskScore}</span>
                      <span className="text-xs text-slate-500">Risk Score</span>
                    </div>
                  </div>

                  {/* Flags */}
                  {Object.entries(anomaly.flags).some(([_, value]) => value) && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-slate-600 mb-2">Active Flags:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(anomaly.flags)
                          .filter(([_, value]) => value)
                          .map(([key]) => (
                            <span
                              key={key}
                              className="px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded text-[10px] font-semibold"
                            >
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Violations */}
                  {anomaly.violations.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-slate-600 mb-2">Violations:</p>
                      <div className="space-y-1">
                        {anomaly.violations.slice(0, 3).map((violation, idx) => (
                          <div key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              violation.severity === 'high' ? 'bg-red-100 text-red-700' :
                              violation.severity === 'medium' ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {violation.severity}
                            </span>
                            <span>{violation.description}</span>
                          </div>
                        ))}
                        {anomaly.violations.length > 3 && (
                          <p className="text-[10px] text-slate-500">+{anomaly.violations.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
                    {anomaly.status !== 'blocked' && (
                      <button
                        onClick={() => handleUpdateStatus(anomaly.userId, 'blocked')}
                        disabled={reviewing === anomaly.userId}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50"
                      >
                        {reviewing === anomaly.userId ? 'Processing...' : 'Block User'}
                      </button>
                    )}
                    {anomaly.status === 'blocked' && (
                      <button
                        onClick={() => handleUpdateStatus(anomaly.userId, 'safe')}
                        disabled={reviewing === anomaly.userId}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                      >
                        {reviewing === anomaly.userId ? 'Processing...' : 'Unblock User'}
                      </button>
                    )}
                    {anomaly.status !== 'safe' && anomaly.status !== 'blocked' && (
                      <button
                        onClick={() => handleUpdateStatus(anomaly.userId, 'safe')}
                        disabled={reviewing === anomaly.userId}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                      >
                        Mark as Safe
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Help */}
      <div className="card-fintech p-4 bg-blue-50 border border-blue-200">
        <p className="text-xs font-semibold text-blue-900 mb-2">🛡️ How Anomaly Detection Works</p>
        <ul className="text-[10px] text-blue-700 space-y-1 ml-4 list-disc">
          <li>System analyzes last 30 days of user activity</li>
          <li>High cancellation rates, suspicious timing, and rapid changes are flagged</li>
          <li>Risk scores above 70 result in automatic blocking</li>
          <li>Manual review allows admins to override automatic decisions</li>
          <li>Run periodic analysis via Cloud Function for all users</li>
        </ul>
      </div>
    </div>
  );
};

export default AnomalyDashboard;

