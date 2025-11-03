import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, limit, serverTimestamp } from 'firebase/firestore';

export interface RewardAccount {
  userId: string;
  totalPoints: number;
  pointsHistory: PointTransaction[];
  redeemedPoints: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  badges: string[];
  lastUpdated: any;
}

export interface PointTransaction {
  transactionId: string;
  points: number;
  reason: string;
  timestamp: any;
  relatedDonation?: string;
  type: 'earned' | 'redeemed';
}

interface UseRewardPointsReturn {
  account: RewardAccount | null;
  loading: boolean;
  error: string | null;
  awardPoints: (points: number, reason: string, relatedDonation?: string) => Promise<void>;
  redeemPoints: (points: number, reason: string) => Promise<void>;
  getLeaderboard: (limitCount?: number) => Promise<any[]>;
}

/**
 * Custom hook to manage reward points for users
 * 
 * Points Formula:
 * - Base: (quantity * 2) points
 * - Verified Donor Bonus: +10 points
 * - Distance Bonus: +(distance_traveled / 5) points
 * 
 * Tiers:
 * - Bronze: 0-100 points
 * - Silver: 101-500 points
 * - Gold: 501-1000 points
 * - Platinum: 1000+ points
 */
export const useRewardPoints = (userId: string | undefined): UseRewardPointsReturn => {
  const [account, setAccount] = useState<RewardAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch reward account
  useEffect(() => {
    const fetchAccount = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const accountDoc = await getDoc(doc(db, 'reward_accounts', userId));

        if (accountDoc.exists()) {
          setAccount(accountDoc.data() as RewardAccount);
        } else {
          // Create new account
          const newAccount: RewardAccount = {
            userId,
            totalPoints: 0,
            pointsHistory: [],
            redeemedPoints: 0,
            tier: 'bronze',
            badges: [],
            lastUpdated: serverTimestamp(),
          };
          await setDoc(doc(db, 'reward_accounts', userId), newAccount);
          setAccount(newAccount);
        }
      } catch (err: any) {
        console.error('Failed to fetch reward account:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAccount();
  }, [userId]);

  // Calculate tier based on total points
  const calculateTier = (points: number): 'bronze' | 'silver' | 'gold' | 'platinum' => {
    if (points >= 1000) return 'platinum';
    if (points >= 500) return 'gold';
    if (points >= 100) return 'silver';
    return 'bronze';
  };

  // Award points to user
  const awardPoints = async (points: number, reason: string, relatedDonation?: string) => {
    if (!userId || !account) return;

    try {
      const transaction: PointTransaction = {
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        points,
        reason,
        timestamp: serverTimestamp(),
        relatedDonation,
        type: 'earned',
      };

      const newTotalPoints = account.totalPoints + points;
      const newTier = calculateTier(newTotalPoints);

      // Check for new badges
      const newBadges = [...account.badges];
      if (newTotalPoints >= 10 && !newBadges.includes('first_10_points')) {
        newBadges.push('first_10_points');
      }
      if (newTotalPoints >= 100 && !newBadges.includes('centurion')) {
        newBadges.push('centurion');
      }
      if (newTotalPoints >= 500 && !newBadges.includes('super_donor')) {
        newBadges.push('super_donor');
      }
      if (newTotalPoints >= 1000 && !newBadges.includes('platinum_hero')) {
        newBadges.push('platinum_hero');
      }

      const updatedAccount: Partial<RewardAccount> = {
        totalPoints: newTotalPoints,
        tier: newTier,
        badges: newBadges,
        pointsHistory: [transaction, ...account.pointsHistory].slice(0, 50), // Keep last 50 transactions
        lastUpdated: serverTimestamp(),
      };

      await updateDoc(doc(db, 'reward_accounts', userId), updatedAccount);

      // Update local state
      setAccount({
        ...account,
        ...updatedAccount,
      } as RewardAccount);
    } catch (err: any) {
      console.error('Failed to award points:', err);
      setError(err.message);
      throw err;
    }
  };

  // Redeem points
  const redeemPoints = async (points: number, reason: string) => {
    if (!userId || !account) return;

    if (account.totalPoints < points) {
      throw new Error('Insufficient points for redemption');
    }

    try {
      const transaction: PointTransaction = {
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        points: -points,
        reason,
        timestamp: serverTimestamp(),
        type: 'redeemed',
      };

      const newTotalPoints = account.totalPoints - points;
      const newRedeemedPoints = account.redeemedPoints + points;
      const newTier = calculateTier(newTotalPoints);

      const updatedAccount: Partial<RewardAccount> = {
        totalPoints: newTotalPoints,
        redeemedPoints: newRedeemedPoints,
        tier: newTier,
        pointsHistory: [transaction, ...account.pointsHistory].slice(0, 50),
        lastUpdated: serverTimestamp(),
      };

      await updateDoc(doc(db, 'reward_accounts', userId), updatedAccount);

      setAccount({
        ...account,
        ...updatedAccount,
      } as RewardAccount);
    } catch (err: any) {
      console.error('Failed to redeem points:', err);
      setError(err.message);
      throw err;
    }
  };

  // Get leaderboard
  const getLeaderboard = async (limitCount: number = 10): Promise<any[]> => {
    try {
      const q = query(
        collection(db, 'reward_accounts'),
        orderBy('totalPoints', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err: any) {
      console.error('Failed to fetch leaderboard:', err);
      return [];
    }
  };

  return {
    account,
    loading,
    error,
    awardPoints,
    redeemPoints,
    getLeaderboard,
  };
};

/**
 * Utility function to calculate points for a donation
 */
export const calculateDonationPoints = (
  quantity: number,
  verified: boolean,
  distanceKm?: number
): number => {
  let points = quantity * 2; // Base points
  if (verified) points += 10; // Verified bonus
  if (distanceKm) points += Math.floor(distanceKm / 5); // Distance bonus
  return Math.round(points);
};

