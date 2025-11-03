import React, { useState, useEffect } from 'react';
import { useRewardPoints } from '../hooks/useRewardPoints';
import { Trophy, Star, Award, TrendingUp, Gift } from 'lucide-react';
import { motion } from 'framer-motion';

interface RewardsWidgetProps {
  userId: string | undefined;
  compact?: boolean;
}

/**
 * RewardsWidget Component
 * 
 * Displays user's reward points, tier, badges, and recent transactions.
 * Can be displayed in compact mode for dashboard or full mode for dedicated page.
 */
export const RewardsWidget: React.FC<RewardsWidgetProps> = ({ userId, compact = false }) => {
  const { account, loading, error, getLeaderboard } = useRewardPoints(userId);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    if (showLeaderboard) {
      getLeaderboard(5).then(setLeaderboard);
    }
  }, [showLeaderboard]);

  if (loading) {
    return (
      <div className="card-fintech p-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded mb-4"></div>
        <div className="h-20 bg-slate-200 rounded"></div>
      </div>
    );
  }

  if (error || !account) {
    return null;
  }

  const getTierConfig = (tier: string) => {
    const configs = {
      bronze: { color: 'from-amber-600 to-orange-600', icon: '🥉', label: 'Bronze' },
      silver: { color: 'from-slate-400 to-slate-600', icon: '🥈', label: 'Silver' },
      gold: { color: 'from-yellow-500 to-amber-500', icon: '🥇', label: 'Gold' },
      platinum: { color: 'from-cyan-500 to-blue-600', icon: '💎', label: 'Platinum' },
    };
    return configs[tier as keyof typeof configs] || configs.bronze;
  };

  const tierConfig = getTierConfig(account.tier);

  const getBadgeConfig = (badge: string) => {
    const badges: Record<string, { label: string; icon: string; color: string }> = {
      first_10_points: { label: 'First Steps', icon: '👟', color: 'bg-green-100 text-green-700' },
      centurion: { label: 'Centurion', icon: '💯', color: 'bg-blue-100 text-blue-700' },
      super_donor: { label: 'Super Donor', icon: '⭐', color: 'bg-purple-100 text-purple-700' },
      platinum_hero: { label: 'Platinum Hero', icon: '💎', color: 'bg-cyan-100 text-cyan-700' },
    };
    return badges[badge] || { label: badge, icon: '🏅', color: 'bg-slate-100 text-slate-700' };
  };

  if (compact) {
    return (
      <div className="card-fintech p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-blue-600" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Rewards</h3>
          </div>
          <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${tierConfig.color} text-white text-xs font-black flex items-center gap-1`}>
            <span>{tierConfig.icon}</span>
            {tierConfig.label}
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-4xl font-black text-zinc-900">{account.totalPoints}</span>
          <span className="text-sm text-slate-600">points</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {account.badges.slice(0, 3).map((badge, idx) => {
            const badgeConfig = getBadgeConfig(badge);
            return (
              <span
                key={idx}
                className={`px-2 py-1 rounded-md text-[10px] font-bold ${badgeConfig.color} flex items-center gap-1`}
              >
                <span>{badgeConfig.icon}</span>
                {badgeConfig.label}
              </span>
            );
          })}
          {account.badges.length > 3 && (
            <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
              +{account.badges.length - 3} more
            </span>
          )}
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className="space-y-6">
      {/* Points Overview */}
      <div className="card-fintech p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Points Display */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <Trophy size={32} className="text-blue-600" />
              <div>
                <h3 className="text-xl font-black text-zinc-900">Reward Points</h3>
                <p className="text-xs text-slate-600">Earn points by donating meals</p>
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <motion.span
                className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                {account.totalPoints}
              </motion.span>
              <span className="text-lg text-slate-600">points</span>
            </div>
            {account.redeemedPoints > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                Redeemed: {account.redeemedPoints} points
              </p>
            )}
          </div>

          {/* Tier Badge */}
          <div className="flex flex-col items-center gap-3">
            <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${tierConfig.color} flex items-center justify-center text-6xl shadow-lg`}>
              {tierConfig.icon}
            </div>
            <span className="text-sm font-black text-slate-700 uppercase tracking-wide">
              {tierConfig.label} Tier
            </span>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="card-fintech p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award size={20} className="text-blue-600" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">
            Badges Earned ({account.badges.length})
          </h3>
        </div>
        <div className="flex flex-wrap gap-3">
          {account.badges.length > 0 ? (
            account.badges.map((badge, idx) => {
              const badgeConfig = getBadgeConfig(badge);
              return (
                <motion.div
                  key={idx}
                  className={`px-4 py-3 rounded-xl border-2 ${badgeConfig.color} flex items-center gap-2`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <span className="text-2xl">{badgeConfig.icon}</span>
                  <span className="text-sm font-bold">{badgeConfig.label}</span>
                </motion.div>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">No badges earned yet. Start donating to unlock badges!</p>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card-fintech p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-blue-600" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">
            Recent Activity
          </h3>
        </div>
        <div className="space-y-3">
          {account.pointsHistory.length > 0 ? (
            account.pointsHistory.slice(0, 5).map((txn, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${txn.type === 'earned' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {txn.type === 'earned' ? (
                      <TrendingUp size={16} className="text-green-600" />
                    ) : (
                      <Gift size={16} className="text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{txn.reason}</p>
                    <p className="text-[10px] text-slate-500">
                      {txn.timestamp?.toDate ? txn.timestamp.toDate().toLocaleDateString() : 'Recent'}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${txn.type === 'earned' ? 'text-green-600' : 'text-red-600'}`}>
                  {txn.type === 'earned' ? '+' : ''}{txn.points}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No transactions yet.</p>
          )}
        </div>
      </div>

      {/* How to Earn More */}
      <div className="card-fintech p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
        <div className="flex items-start gap-3">
          <Star size={24} className="text-blue-600 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-blue-900 mb-2">How to Earn More Points</h3>
            <ul className="text-xs text-blue-700 space-y-1.5 ml-4 list-disc">
              <li>Donate meals: <strong>2 points per meal</strong></li>
              <li>Get verified: <strong>+10 bonus points per donation</strong></li>
              <li>Long-distance donations: <strong>+1 point per 5km traveled</strong></li>
              <li>Consistent donations unlock special badges!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RewardsWidget;

