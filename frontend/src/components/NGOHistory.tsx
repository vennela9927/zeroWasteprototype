import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  Search,
  MapPin,
  User,
  TrendingUp,
  Eye,
  Utensils,
} from 'lucide-react';
import { format } from 'date-fns';

interface NGOHistoryProps {
  claims: any[];
  listings: any[];
}

const NGOHistory: React.FC<NGOHistoryProps> = ({ claims, listings }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'quantity'>('date');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Enrich claims with food item data
  const requestHistory = useMemo(() => {
    const history = claims.map(claim => {
      const foodItem = listings.find(l => l.id === claim.foodItemId);
      return {
        ...claim,
        foodItem,
        foodName: claim.foodName || foodItem?.foodName || foodItem?.name || 'Unknown',
        location: foodItem?.location || claim.location,
        foodType: foodItem?.foodType || claim.foodType,
      };
    });

    // Apply filters
    let filtered = history;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        (item.foodName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.donorName || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          const dateA = a.requestedAt?.toDate?.() || new Date(a.requestedAt || 0);
          const dateB = b.requestedAt?.toDate?.() || new Date(b.requestedAt || 0);
          return dateB.getTime() - dateA.getTime();
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        case 'quantity':
          return (b.quantity || 0) - (a.quantity || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [claims, listings, searchQuery, statusFilter, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const total = claims.length;
    const completed = claims.filter(c => c.status === 'fulfilled' || c.status === 'verified').length;
    const pending = claims.filter(c => c.status === 'requested').length;
    const approved = claims.filter(c => c.status === 'approved' || c.status === 'picked_up' || c.status === 'in_transit' || c.status === 'delivered').length;
    const rejected = claims.filter(c => c.status === 'rejected').length;

    const totalMeals = claims
      .filter(c => c.status === 'fulfilled' || c.status === 'verified')
      .reduce((sum, c) => sum + (c.quantity || 0), 0);

    return { total, completed, pending, approved, rejected, totalMeals };
  }, [claims]);

  const getStatusBadge = (status: string) => {
    const badges = {
      requested: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock, label: 'Pending' },
      approved: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle, label: 'Approved' },
      picked_up: { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Package, label: 'Picked Up' },
      in_transit: { color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: TrendingUp, label: 'In Transit' },
      delivered: { color: 'bg-teal-100 text-teal-700 border-teal-200', icon: CheckCircle, label: 'Delivered' },
      verified: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle, label: 'Verified' },
      fulfilled: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Completed' },
      rejected: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, label: 'Rejected' },
      cancelled: { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: XCircle, label: 'Cancelled' },
    };

    const badge = badges[status as keyof typeof badges] || badges.requested;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
        <Icon size={12} />
        {badge.label}
      </span>
    );
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return format(d, 'MMM dd, yyyy h:mm a');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-zinc-900 mb-2">Request History</h2>
        <p className="text-slate-600">Track all your food donation requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-4 text-white"
        >
          <Package size={24} className="mb-2" />
          <div className="text-3xl font-black">{stats.total}</div>
          <div className="text-sm text-blue-100">Total Requests</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-4 text-white"
        >
          <CheckCircle size={24} className="mb-2" />
          <div className="text-3xl font-black">{stats.completed}</div>
          <div className="text-sm text-green-100">Completed</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-4 text-white"
        >
          <Clock size={24} className="mb-2" />
          <div className="text-3xl font-black">{stats.pending}</div>
          <div className="text-sm text-amber-100">Pending</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4 text-white"
        >
          <TrendingUp size={24} className="mb-2" />
          <div className="text-3xl font-black">{stats.approved}</div>
          <div className="text-sm text-purple-100">Approved</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl p-4 text-white"
        >
          <Utensils size={24} className="mb-2" />
          <div className="text-3xl font-black">{stats.totalMeals}</div>
          <div className="text-sm text-emerald-100">Meals Received</div>
        </motion.div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border-2 border-slate-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none appearance-none"
            >
              <option value="all">All Status</option>
              <option value="requested">Pending</option>
              <option value="approved">Approved</option>
              <option value="fulfilled">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none appearance-none"
            >
              <option value="date">Sort by Date</option>
              <option value="status">Sort by Status</option>
              <option value="quantity">Sort by Quantity</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {requestHistory.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-slate-100 p-12 text-center">
            <Package size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">No requests found</h3>
            <p className="text-slate-500">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Start by requesting food donations'}
            </p>
          </div>
        ) : (
          requestHistory.map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl border-2 border-slate-100 p-6 hover:border-blue-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-black text-zinc-900">
                      {request.foodName}
                    </h3>
                    {getStatusBadge(request.status)}
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-slate-500 text-xs font-semibold mb-1">Quantity</div>
                      <div className="font-bold text-slate-900">{request.quantity} servings</div>
                    </div>

                    <div>
                      <div className="text-slate-500 text-xs font-semibold mb-1">Requested</div>
                      <div className="font-bold text-slate-900">{formatDate(request.requestedAt)}</div>
                    </div>

                    <div>
                      <div className="text-slate-500 text-xs font-semibold mb-1">Food Type</div>
                      <div className="font-bold text-slate-900">{request.foodType || 'N/A'}</div>
                    </div>

                    <div>
                      <div className="text-slate-500 text-xs font-semibold mb-1">Donor</div>
                      <div className="font-bold text-slate-900">{request.donorName || 'Anonymous'}</div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="mt-4 flex items-center gap-2 text-xs">
                    {request.requestedAt && (
                      <div className="flex items-center gap-1 text-slate-500">
                        <Clock size={12} />
                        <span>Requested: {formatDate(request.requestedAt)}</span>
                      </div>
                    )}
                    {request.approvedAt && (
                      <>
                        <span className="text-slate-300">•</span>
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle size={12} />
                          <span>Approved: {formatDate(request.approvedAt)}</span>
                        </div>
                      </>
                    )}
                    {request.fulfilledAt && (
                      <>
                        <span className="text-slate-300">•</span>
                        <div className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle size={12} />
                          <span>Completed: {formatDate(request.fulfilledAt)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Location */}
                  {request.location && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                      <MapPin size={16} className="text-slate-400" />
                      {request.location}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedRequest(request)}
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    title="View Details"
                  >
                    <Eye size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-zinc-900">Request Details</h3>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-slate-600 mb-1">Food Name</div>
                <div className="text-lg font-bold text-slate-900">{selectedRequest.foodName}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-600 mb-1">Quantity</div>
                  <div className="font-bold text-slate-900">{selectedRequest.quantity} servings</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-600 mb-1">Status</div>
                  <div>{getStatusBadge(selectedRequest.status)}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-600 mb-1">Donor</div>
                <div className="flex items-center gap-2">
                  <User size={16} className="text-slate-400" />
                  <span className="font-bold text-slate-900">{selectedRequest.donorName || 'Anonymous'}</span>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-600 mb-1">Food Type</div>
                <div className="font-bold text-slate-900">{selectedRequest.foodType || 'N/A'}</div>
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-600 mb-1">Location</div>
                <div className="font-bold text-slate-900">{selectedRequest.location || 'N/A'}</div>
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-600 mb-2">Timeline</div>
                <div className="space-y-2">
                  {selectedRequest.requestedAt && (
                    <div className="flex items-center gap-3">
                      <Clock size={16} className="text-amber-500" />
                      <div>
                        <div className="text-sm font-semibold">Requested</div>
                        <div className="text-xs text-slate-500">{formatDate(selectedRequest.requestedAt)}</div>
                      </div>
                    </div>
                  )}
                  {selectedRequest.approvedAt && (
                    <div className="flex items-center gap-3">
                      <CheckCircle size={16} className="text-green-500" />
                      <div>
                        <div className="text-sm font-semibold">Approved</div>
                        <div className="text-xs text-slate-500">{formatDate(selectedRequest.approvedAt)}</div>
                      </div>
                    </div>
                  )}
                  {selectedRequest.fulfilledAt && (
                    <div className="flex items-center gap-3">
                      <CheckCircle size={16} className="text-emerald-500" />
                      <div>
                        <div className="text-sm font-semibold">Completed</div>
                        <div className="text-xs text-slate-500">{formatDate(selectedRequest.fulfilledAt)}</div>
                      </div>
                    </div>
                  )}
                  {selectedRequest.rejectedAt && (
                    <div className="flex items-center gap-3">
                      <XCircle size={16} className="text-red-500" />
                      <div>
                        <div className="text-sm font-semibold">Rejected</div>
                        <div className="text-xs text-slate-500">{formatDate(selectedRequest.rejectedAt)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default NGOHistory;


