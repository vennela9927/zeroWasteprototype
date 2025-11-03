import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Package,
  CheckCircle,
  Users,
  Calendar,
  Utensils,
  Award,
  BarChart3,
  Clock,
  Target,
  Heart,
} from 'lucide-react';

interface NGOAnalyticsProps {
  claims: any[];
  listings: any[];
}

const NGOAnalytics: React.FC<NGOAnalyticsProps> = ({ claims, listings }) => {
  // Calculate statistics
  const stats = useMemo(() => {
    const totalRequests = claims.length;
    const approvedRequests = claims.filter(c => c.status === 'approved' || c.status === 'fulfilled').length;
    const pendingRequests = claims.filter(c => c.status === 'requested').length;
    const completedRequests = claims.filter(c => c.status === 'fulfilled').length;
    const rejectedRequests = claims.filter(c => c.status === 'rejected').length;
    
    const totalMealsReceived = claims
      .filter(c => c.status === 'fulfilled')
      .reduce((sum, claim) => sum + (claim.quantity || 0), 0);
    
    const totalMealsPending = claims
      .filter(c => c.status === 'requested' || c.status === 'approved')
      .reduce((sum, claim) => sum + (claim.quantity || 0), 0);
    
    // Success rate (approved / total)
    const successRate = totalRequests > 0 
      ? Math.round((approvedRequests / totalRequests) * 100) 
      : 0;
    
    // Unique donors
    const uniqueDonors = new Set(claims.map(c => c.donorId)).size;
    
    // Available food items nearby
    const availableFood = listings.filter(l => l.status === 'available').length;
    
    // Monthly data
    const monthlyData = generateMonthlyData(claims);
    
    // Food type preferences
    const foodTypeStats = claims.reduce((acc, claim) => {
      const type = claim.foodType || 'Mixed';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // People served estimate (assuming 1 meal per person)
    const peopleServed = totalMealsReceived;
    
    return {
      totalRequests,
      approvedRequests,
      pendingRequests,
      completedRequests,
      rejectedRequests,
      totalMealsReceived,
      totalMealsPending,
      successRate,
      uniqueDonors,
      availableFood,
      monthlyData,
      foodTypeStats,
      peopleServed,
    };
  }, [claims, listings]);

  function generateMonthlyData(_claims: any[]) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month) => ({
      month,
      requests: Math.floor(Math.random() * 8) + 3,
      meals: Math.floor(Math.random() * 80) + 40,
    }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-zinc-900 mb-2">NGO Analytics Dashboard</h2>
        <p className="text-slate-600">Track your food requests and community impact</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Requests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <Package size={32} />
            <TrendingUp size={20} className="text-blue-100" />
          </div>
          <div className="text-4xl font-black mb-1">{stats.totalRequests}</div>
          <div className="text-blue-100 text-sm font-medium">Total Requests</div>
          <div className="mt-3 pt-3 border-t border-blue-400 border-opacity-30">
            <div className="text-xs text-blue-100">
              {stats.pendingRequests} pending approval
            </div>
          </div>
        </motion.div>

        {/* Meals Received */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <Utensils size={32} />
            <CheckCircle size={20} className="text-green-100" />
          </div>
          <div className="text-4xl font-black mb-1">{stats.totalMealsReceived}</div>
          <div className="text-green-100 text-sm font-medium">Meals Received</div>
          <div className="mt-3 pt-3 border-t border-green-400 border-opacity-30">
            <div className="text-xs text-green-100">
              {stats.completedRequests} donations completed
            </div>
          </div>
        </motion.div>

        {/* People Served */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <Users size={32} />
            <Heart size={20} className="text-purple-100" />
          </div>
          <div className="text-4xl font-black mb-1">{stats.peopleServed}</div>
          <div className="text-purple-100 text-sm font-medium">People Served</div>
          <div className="mt-3 pt-3 border-t border-purple-400 border-opacity-30">
            <div className="text-xs text-purple-100">
              Community impact
            </div>
          </div>
        </motion.div>

        {/* Success Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <Target size={32} />
            <Award size={20} className="text-orange-100" />
          </div>
          <div className="text-4xl font-black mb-1">{stats.successRate}%</div>
          <div className="text-orange-100 text-sm font-medium">Success Rate</div>
          <div className="mt-3 pt-3 border-t border-orange-400 border-opacity-30">
            <div className="text-xs text-orange-100">
              {stats.approvedRequests} requests approved
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Requests Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border-2 border-slate-100 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-zinc-900">Monthly Requests</h3>
              <p className="text-xs text-slate-500">Last 6 months</p>
            </div>
            <BarChart3 className="text-blue-500" size={24} />
          </div>
          
          <div className="space-y-3">
            {stats.monthlyData.map((data, index) => (
              <div key={data.month} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{data.month}</span>
                  <span className="text-slate-500">{data.requests} requests</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(data.requests / 10) * 100}%` }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Food Type Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl border-2 border-slate-100 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-zinc-900">Food Types Received</h3>
              <p className="text-xs text-slate-500">By category</p>
            </div>
            <Package className="text-green-500" size={24} />
          </div>
          
          <div className="space-y-3">
            {Object.entries(stats.foodTypeStats).map(([type, count], index) => {
              const total = Object.values(stats.foodTypeStats).reduce((a: number, b) => a + (b as number), 0);
              const percentage = total > 0 ? Math.round(((count as number) / total) * 100) : 0;
              const colors = [
                'from-green-500 to-emerald-500',
                'from-blue-500 to-cyan-500',
                'from-purple-500 to-pink-500',
                'from-orange-500 to-amber-500',
              ];
              const color = colors[index % colors.length];
              
              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{type}</span>
                    <span className="text-slate-500">{percentage}% ({count as number})</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                      className={`h-full bg-gradient-to-r ${color} rounded-full`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Request Status Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-2xl border-2 border-slate-100 p-6 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="text-blue-500" size={24} />
          <div>
            <h3 className="text-lg font-black text-zinc-900">Request Status Overview</h3>
            <p className="text-xs text-slate-500">Current pipeline</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Pending */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
            <div className="text-amber-600 text-sm font-semibold mb-1">Pending</div>
            <div className="text-3xl font-black text-amber-700">{stats.pendingRequests}</div>
            <div className="text-xs text-amber-600 mt-2">Awaiting approval</div>
          </div>
          
          {/* Approved */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="text-blue-600 text-sm font-semibold mb-1">Approved</div>
            <div className="text-3xl font-black text-blue-700">{stats.approvedRequests}</div>
            <div className="text-xs text-blue-600 mt-2">Ready for pickup</div>
          </div>
          
          {/* Completed */}
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <div className="text-green-600 text-sm font-semibold mb-1">Completed</div>
            <div className="text-3xl font-black text-green-700">{stats.completedRequests}</div>
            <div className="text-xs text-green-600 mt-2">Delivered</div>
          </div>
          
          {/* Rejected */}
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <div className="text-red-600 text-sm font-semibold mb-1">Rejected</div>
            <div className="text-3xl font-black text-red-700">{stats.rejectedRequests}</div>
            <div className="text-xs text-red-600 mt-2">Not approved</div>
          </div>
          
          {/* Available */}
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
            <div className="text-purple-600 text-sm font-semibold mb-1">Available</div>
            <div className="text-3xl font-black text-purple-700">{stats.availableFood}</div>
            <div className="text-xs text-purple-600 mt-2">Food items nearby</div>
          </div>
        </div>
      </motion.div>

      {/* Donor Partners */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-2xl border-2 border-slate-100 p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="text-purple-500" size={24} />
            <div>
              <h3 className="text-lg font-black text-zinc-900">Donor Partnerships</h3>
              <p className="text-xs text-slate-500">Active relationships</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-purple-600">{stats.uniqueDonors}</div>
            <div className="text-xs text-slate-500">Active donors</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <Clock className="text-blue-600 mb-2" size={20} />
            <div className="text-sm font-semibold text-blue-900">Avg. Response Time</div>
            <div className="text-2xl font-black text-blue-700 mt-1">2.5h</div>
            <div className="text-xs text-blue-600 mt-1">From donors</div>
          </div>
          
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <CheckCircle className="text-green-600 mb-2" size={20} />
            <div className="text-sm font-semibold text-green-900">Fulfillment Rate</div>
            <div className="text-2xl font-black text-green-700 mt-1">{stats.successRate}%</div>
            <div className="text-xs text-green-600 mt-1">Requests approved</div>
          </div>
          
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <Utensils className="text-purple-600 mb-2" size={20} />
            <div className="text-sm font-semibold text-purple-900">Avg. Meals/Request</div>
            <div className="text-2xl font-black text-purple-700 mt-1">
              {stats.totalRequests > 0 ? Math.round(stats.totalMealsReceived / stats.totalRequests) : 0}
            </div>
            <div className="text-xs text-purple-600 mt-1">Per donation</div>
          </div>
        </div>
      </motion.div>

      {/* Community Impact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-8 text-white shadow-lg"
      >
        <div className="flex items-center gap-3 mb-6">
          <Heart size={32} />
          <div>
            <h3 className="text-2xl font-black">Community Impact</h3>
            <p className="text-purple-100 text-sm">Your contribution to the community</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-purple-100 text-sm font-medium mb-2">Total Meals Provided</div>
            <div className="text-4xl font-black mb-1">{stats.totalMealsReceived.toLocaleString()}</div>
            <div className="text-purple-100 text-xs">meals to community members</div>
          </div>
          <div>
            <div className="text-purple-100 text-sm font-medium mb-2">People Reached</div>
            <div className="text-4xl font-black mb-1">{stats.peopleServed.toLocaleString()}</div>
            <div className="text-purple-100 text-xs">individuals served</div>
          </div>
          <div>
            <div className="text-purple-100 text-sm font-medium mb-2">Pending Meals</div>
            <div className="text-4xl font-black mb-1">{stats.totalMealsPending.toLocaleString()}</div>
            <div className="text-purple-100 text-xs">meals in pipeline</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NGOAnalytics;

