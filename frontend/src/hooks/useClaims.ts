import { useEffect, useState, useCallback } from 'react';
import { db, ts } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';

export interface ClaimRecord {
  id: string;
  foodItemId: string;
  recipientId: string;
  claimedAt: any;
  status: 'requested' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled';
  quantity?: number;
  foodName?: string;
  donorName?: string;
  recipientName?: string;
  requestedAt?: any;
  approvedAt?: any;
  rejectedAt?: any;
  fulfilledAt?: any;
}

export function useClaims(role: 'donor' | 'recipient') {
  const { user } = useAuth();
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // Order by requestedAt (primary creation timestamp for request workflow)
    let q;
    if (role === 'recipient') {
      q = query(collection(db, 'claims'), where('recipientId', '==', user.uid), orderBy('requestedAt', 'desc'));
    } else {
      q = query(collection(db, 'claims'), where('donorId', '==', user.uid), orderBy('requestedAt', 'desc'));
    }
    const unsub = onSnapshot(q, snap => {
      setClaims(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      setLoading(false);
    }, err => {
      // eslint-disable-next-line no-console
      console.error('[claims] listener error', err);
      setLoading(false);
    });
    return () => unsub();
  }, [role, user]);

  const addClaim = useCallback(async (data: { foodItemId: string; recipientId: string; quantity?: number; foodName?: string; donorName?: string; donorId?: string; recipientName?: string; }) => {
    const t = ts();
    await addDoc(collection(db, 'claims'), {
      ...data,
      status: 'requested',
      requestedAt: t,
      createdAt: t,
      // claimedAt intentionally omitted until donor approves (was previously set here causing confusion)
    });
  }, []);

  const updateClaimStatus = useCallback(async (claimId: string, next: 'approved' | 'rejected' | 'fulfilled' | 'cancelled') => {
    const ref = doc(db, 'claims', claimId);
    const patch: any = { status: next };
  if (next === 'approved') { patch.approvedAt = ts(); patch.claimedAt = ts(); }
    if (next === 'rejected') patch.rejectedAt = ts();
    if (next === 'fulfilled') patch.fulfilledAt = ts();
    if (next === 'cancelled') patch.cancelledAt = ts();
    await updateDoc(ref, patch);
    // Side-effect: update related food_items status
    try {
      // Find claim we just updated
      const updated = claims.find(c => c.id === claimId);
      if (updated?.foodItemId) {
        const foodRef = doc(db, 'food_items', updated.foodItemId);
        if (next === 'approved') {
          await updateDoc(foodRef, { status: 'claimed', claimed: true, claimedAt: ts(), claimedBy: updated.recipientId });
        } else if (next === 'rejected') {
          // Make it available again
            await updateDoc(foodRef, { status: 'available', claimed: false });
        } else if (next === 'cancelled') {
			await updateDoc(foodRef, { status: 'available', claimed: false });
        } else if (next === 'fulfilled') {
          await updateDoc(foodRef, { status: 'picked_up' });
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[claims] listing side-effect update failed', e);
    }
  }, [claims]);

  const cancelClaim = useCallback(async (claimId: string) => {
    await updateClaimStatus(claimId, 'cancelled');
  }, [updateClaimStatus]);

  return { claims, loading, addClaim, updateClaimStatus, cancelClaim };
}