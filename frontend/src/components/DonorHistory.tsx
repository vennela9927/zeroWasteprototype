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
  Download,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';

interface DonorHistoryProps {
  listings: any[];
  claims: any[];
}

const DonorHistory: React.FC<DonorHistoryProps> = ({ listings, claims }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'quantity'>('date');
  const [selectedDonation, setSelectedDonation] = useState<any>(null);

  // Combine listings with their claims
  const donationHistory = useMemo(() => {
    const history = listings.map(listing => {
      const relatedClaims = claims.filter(c => c.foodItemId === listing.id);
      
      // Get the most recent claim (highest priority: verified > delivered > in_transit > picked_up > approved > requested)
      const statusPriority = {
        'verified': 7,
        'delivered': 6,
        'in_transit': 5,
        'picked_up': 4,
        'approved': 3,
        'requested': 2,
        'fulfilled': 1,
      };
      
      const activeClaim = relatedClaims.length > 0 
        ? relatedClaims.sort((a, b) => 
            (statusPriority[a.status as keyof typeof statusPriority] || 0) - 
            (statusPriority[b.status as keyof typeof statusPriority] || 0)
          ).reverse()[0]
        : null;

      return {
        ...listing,
        relatedClaims,
        activeClaim,
        displayStatus: activeClaim?.status || listing.status,
        recipientName: activeClaim?.recipientName,
        claimedAt: activeClaim?.claimedAt,
      };
    });

    // Apply filters
    let filtered = history;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        (item.foodName || item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.recipientName || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.displayStatus === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        case 'status':
          return (a.displayStatus || '').localeCompare(b.displayStatus || '');
        case 'quantity':
          return (b.quantity || 0) - (a.quantity || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [listings, claims, searchQuery, statusFilter, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const total = listings.length;
    const completed = claims.filter(c => c.status === 'fulfilled' || c.status === 'verified').length;
    const pending = claims.filter(c => c.status === 'requested').length;
    const active = claims.filter(c => c.status === 'approved' || c.status === 'picked_up' || c.status === 'in_transit' || c.status === 'delivered').length;

    return { total, completed, pending, active };
  }, [listings, claims]);

  const getStatusBadge = (status: string) => {
    const badges = {
      available: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Package, label: 'Available' },
      requested: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock, label: 'Requested' },
      approved: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Approved' },
      picked_up: { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Package, label: 'Picked Up' },
      in_transit: { color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: TrendingUp, label: 'In Transit' },
      delivered: { color: 'bg-teal-100 text-teal-700 border-teal-200', icon: CheckCircle, label: 'Delivered' },
      verified: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle, label: 'Verified' },
      fulfilled: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle, label: 'Completed' },
      rejected: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, label: 'Rejected' },
      claimed: { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: User, label: 'Claimed' },
    };

    const badge = badges[status as keyof typeof badges] || badges.available;
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
    return format(d, 'MMM dd, yyyy');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-zinc-900 mb-2">Donation History</h2>
        <p className="text-slate-600">Track all your past and current donations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-4 text-white"
        >
          <Package size={24} className="mb-2" />
          <div className="text-3xl font-black">{stats.total}</div>
          <div className="text-sm text-blue-100">Total Donations</div>
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
          <div className="text-3xl font-black">{stats.active}</div>
          <div className="text-sm text-purple-100">Active</div>
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
              placeholder="Search donations..."
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
              <option value="available">Available</option>
              <option value="requested">Requested</option>
              <option value="approved">Approved</option>
              <option value="fulfilled">Completed</option>
              <option value="rejected">Rejected</option>
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

      {/* Donations List */}
      <div className="space-y-4">
        {donationHistory.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-slate-100 p-12 text-center">
            <Package size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">No donations found</h3>
            <p className="text-slate-500">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Start by creating your first donation'}
            </p>
          </div>
        ) : (
          donationHistory.map((donation, index) => (
            <motion.div
              key={donation.id}
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
                      {donation.foodName || donation.name}
                    </h3>
                    {getStatusBadge(donation.displayStatus)}
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-slate-500 text-xs font-semibold mb-1">Quantity</div>
                      <div className="font-bold text-slate-900">{donation.quantity} servings</div>
                    </div>

                    <div>
                      <div className="text-slate-500 text-xs font-semibold mb-1">Created</div>
                      <div className="font-bold text-slate-900">{formatDate(donation.createdAt)}</div>
                    </div>

                    <div>
                      <div className="text-slate-500 text-xs font-semibold mb-1">Food Type</div>
                      <div className="font-bold text-slate-900">{donation.foodType || 'N/A'}</div>
                    </div>

                    <div>
                      <div className="text-slate-500 text-xs font-semibold mb-1">Requests</div>
                      <div className="font-bold text-slate-900">{donation.relatedClaims?.length || 0} NGOs</div>
                    </div>
                  </div>

                  {/* NGO Info */}
                  {donation.recipientName && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <User size={16} className="text-purple-500" />
                      <span className="text-slate-600">Claimed by:</span>
                      <span className="font-semibold text-slate-900">{donation.recipientName}</span>
                    </div>
                  )}

                  {/* Location */}
                  {donation.location && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                      <MapPin size={16} className="text-slate-400" />
                      {donation.location}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedDonation(donation)}
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    title="View Details"
                  >
                    <Eye size={20} />
                  </button>
                  <button
                    className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Download Report"
                  >
                    <Download size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedDonation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-zinc-900">Donation Details</h3>
              <button
                onClick={() => setSelectedDonation(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-slate-600 mb-1">Food Name</div>
                <div className="text-lg font-bold text-slate-900">{selectedDonation.foodName || selectedDonation.name}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-600 mb-1">Quantity</div>
                  <div className="font-bold text-slate-900">{selectedDonation.quantity} servings</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-600 mb-1">Status</div>
                  <div>{getStatusBadge(selectedDonation.displayStatus)}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-600 mb-1">Food Type</div>
                <div className="font-bold text-slate-900">{selectedDonation.foodType || 'N/A'}</div>
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-600 mb-1">Preparation Type</div>
                <div className="font-bold text-slate-900">{selectedDonation.preparationType || 'N/A'}</div>
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-600 mb-1">Location</div>
                <div className="font-bold text-slate-900">{selectedDonation.location || 'N/A'}</div>
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-600 mb-1">Created Date</div>
                <div className="font-bold text-slate-900">{formatDate(selectedDonation.createdAt)}</div>
              </div>

              {selectedDonation.relatedClaims && selectedDonation.relatedClaims.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-slate-600 mb-2">Request History</div>
                  <div className="space-y-2">
                    {selectedDonation.relatedClaims.map((claim: any) => (
                      <div key={claim.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <div className="font-semibold text-slate-900">{claim.recipientName}</div>
                          <div className="text-xs text-slate-500">{formatDate(claim.requestedAt)}</div>
                        </div>
                        {getStatusBadge(claim.status)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DonorHistory;


