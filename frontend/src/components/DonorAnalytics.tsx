import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Package,
  CheckCircle,
  Users,
  Calendar,
  Leaf,
  Award,
  BarChart3,
  PieChart,
  Target,
} from 'lucide-react';

interface DonorAnalyticsProps {
  listings: any[];
  claims: any[];
}

const DonorAnalytics: React.FC<DonorAnalyticsProps> = ({ listings, claims }) => {
  // Calculate statistics
  const stats = useMemo(() => {
    const totalDonations = listings.length;
    const completedDonations = claims.filter(c => c.status === 'fulfilled').length;
    const pendingRequests = claims.filter(c => c.status === 'requested').length;
    const approvedRequests = claims.filter(c => c.status === 'approved').length;
    const totalMeals = listings.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const mealsServed = claims
      .filter(c => c.status === 'fulfilled')
      .reduce((sum, claim) => sum + (claim.quantity || 0), 0);
    
    // CO2 calculation: ~2.5 kg CO2 per meal saved
    const co2Saved = mealsServed * 2.5;
    
    // Success rate
    const successRate = totalDonations > 0 
      ? Math.round((completedDonations / totalDonations) * 100) 
      : 0;
    
    // NGO recipients
    const uniqueNGOs = new Set(claims.map(c => c.recipientId)).size;
    
    // Monthly data (last 6 months)
    const monthlyData = generateMonthlyData(listings, claims);
    
    // Food type distribution
    const foodTypes = listings.reduce((acc, item) => {
      const type = item.foodType || 'Other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalDonations,
      completedDonations,
      pendingRequests,
      approvedRequests,
      totalMeals,
      mealsServed,
      co2Saved,
      successRate,
      uniqueNGOs,
      monthlyData,
      foodTypes,
    };
  }, [listings, claims]);

  // Generate monthly data for charts
  function generateMonthlyData(_listings: any[], _claims: any[]) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month) => ({
      month,
      donations: Math.floor(Math.random() * 10) + 5, // Mock data
      meals: Math.floor(Math.random() * 100) + 50,
    }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-zinc-900 mb-2">Analytics & Impact</h2>
        <p className="text-slate-600">Track your donation statistics and environmental impact</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Donations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <Package size={32} />
            <TrendingUp size={20} className="text-blue-100" />
          </div>
          <div className="text-4xl font-black mb-1">{stats.totalDonations}</div>
          <div className="text-blue-100 text-sm font-medium">Total Donations</div>
          <div className="mt-3 pt-3 border-t border-blue-400 border-opacity-30">
            <div className="text-xs text-blue-100">
              {stats.totalMeals.toLocaleString()} meals donated
            </div>
          </div>
        </motion.div>

        {/* Completed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <CheckCircle size={32} />
            <div className="text-xs bg-green-400 bg-opacity-30 px-2 py-1 rounded-full">
              {stats.successRate}%
            </div>
          </div>
          <div className="text-4xl font-black mb-1">{stats.completedDonations}</div>
          <div className="text-green-100 text-sm font-medium">Completed</div>
          <div className="mt-3 pt-3 border-t border-green-400 border-opacity-30">
            <div className="text-xs text-green-100">
              {stats.mealsServed.toLocaleString()} meals served
            </div>
          </div>
        </motion.div>

        {/* CO2 Saved */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <Leaf size={32} />
            <Award size={20} className="text-emerald-100" />
          </div>
          <div className="text-4xl font-black mb-1">{stats.co2Saved.toFixed(1)}</div>
          <div className="text-emerald-100 text-sm font-medium">kg CO₂ Saved</div>
          <div className="mt-3 pt-3 border-t border-emerald-400 border-opacity-30">
            <div className="text-xs text-emerald-100">
              Environmental impact
            </div>
          </div>
        </motion.div>

        {/* NGO Partners */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <Users size={32} />
            <Target size={20} className="text-purple-100" />
          </div>
          <div className="text-4xl font-black mb-1">{stats.uniqueNGOs}</div>
          <div className="text-purple-100 text-sm font-medium">NGO Partners</div>
          <div className="mt-3 pt-3 border-t border-purple-400 border-opacity-30">
            <div className="text-xs text-purple-100">
              {stats.pendingRequests} pending requests
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Donations Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border-2 border-slate-100 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-zinc-900">Monthly Donations</h3>
              <p className="text-xs text-slate-500">Last 6 months</p>
            </div>
            <BarChart3 className="text-blue-500" size={24} />
          </div>
          
          {/* Simple Bar Chart */}
          <div className="space-y-3">
            {stats.monthlyData.map((data, index) => (
              <div key={data.month} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{data.month}</span>
                  <span className="text-slate-500">{data.donations} donations</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(data.donations / 15) * 100}%` }}
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
              <h3 className="text-lg font-black text-zinc-900">Food Type Distribution</h3>
              <p className="text-xs text-slate-500">By category</p>
            </div>
            <PieChart className="text-purple-500" size={24} />
          </div>
          
          {/* Food Types */}
          <div className="space-y-3">
            {Object.entries(stats.foodTypes).map(([type, count], index) => {
              const total = Object.values(stats.foodTypes).reduce((a: number, b) => a + (b as number), 0);
              const percentage = total > 0 ? Math.round(((count as number) / total) * 100) : 0;
              const colors = [
                'from-blue-500 to-cyan-500',
                'from-green-500 to-emerald-500',
                'from-purple-500 to-pink-500',
                'from-orange-500 to-red-500',
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

      {/* Status Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-2xl border-2 border-slate-100 p-6 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="text-blue-500" size={24} />
          <div>
            <h3 className="text-lg font-black text-zinc-900">Donation Status Overview</h3>
            <p className="text-xs text-slate-500">Current pipeline</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Pending */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
            <div className="text-amber-600 text-sm font-semibold mb-1">Pending Requests</div>
            <div className="text-3xl font-black text-amber-700">{stats.pendingRequests}</div>
            <div className="text-xs text-amber-600 mt-2">Awaiting your approval</div>
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
            <div className="text-3xl font-black text-green-700">{stats.completedDonations}</div>
            <div className="text-xs text-green-600 mt-2">Successfully delivered</div>
          </div>
          
          {/* Success Rate */}
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
            <div className="text-purple-600 text-sm font-semibold mb-1">Success Rate</div>
            <div className="text-3xl font-black text-purple-700">{stats.successRate}%</div>
            <div className="text-xs text-purple-600 mt-2">Completion ratio</div>
          </div>
        </div>
      </motion.div>

      {/* Impact Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-8 text-white shadow-lg"
      >
        <div className="flex items-center gap-3 mb-6">
          <Award size={32} />
          <div>
            <h3 className="text-2xl font-black">Your Impact Summary</h3>
            <p className="text-green-100 text-sm">Making a difference, one meal at a time</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-green-100 text-sm font-medium mb-2">Meals Provided</div>
            <div className="text-4xl font-black mb-1">{stats.mealsServed.toLocaleString()}</div>
            <div className="text-green-100 text-xs">meals served to communities</div>
          </div>
          <div>
            <div className="text-green-100 text-sm font-medium mb-2">Environmental Impact</div>
            <div className="text-4xl font-black mb-1">{stats.co2Saved.toFixed(0)}</div>
            <div className="text-green-100 text-xs">kg CO₂ emissions prevented</div>
          </div>
          <div>
            <div className="text-green-100 text-sm font-medium mb-2">Community Reach</div>
            <div className="text-4xl font-black mb-1">{stats.uniqueNGOs}</div>
            <div className="text-green-100 text-xs">NGO partners served</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DonorAnalytics;

