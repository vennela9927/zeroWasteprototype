import { useEffect, useState, useCallback } from 'react';
import { db, ts } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import {
  collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, Timestamp, doc, updateDoc, deleteDoc
} from 'firebase/firestore';

export interface FoodListing {
  id: string;
  foodName: string;
  foodType?: string; // analytics grouping (optional)
  name?: string; // backward compatibility (UI still expects name)
  quantity: number;
  expiry?: string; // legacy
  expiryTime?: Timestamp; // new canonical field
  location: string;
  status?: 'available' | 'requested' | 'claimed' | 'picked_up' | 'expired' | 'cancelled' | 'discarded' | 'fulfilled' | 'in_transit';
  claimed?: boolean; // new boolean flag
  donorId?: string;
  donorName?: string;
  claimedBy?: string;
  claimedAt?: Timestamp;
  createdAt?: any;
  cancelledAt?: any;
  discardedAt?: any;
  extendedCount?: number;
}

interface AddListingInput {
  name: string; // food item name / description
  quantity: number;
  expiry: string; // date string from form (will be converted to expiryTime Timestamp)
  location: string;
  foodType?: string; // optional categorical type (rice, bread, curry...)
}

export function useFoodListings(role: 'donor' | 'ngo') {
  const { user } = useAuth();
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let q;
    if (role === 'donor') {
      q = query(
        collection(db, 'food_items'),
        where('donorId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'food_items'),
        // use legacy status for now; could migrate to claimed == false once index ready
        where('status', '==', 'available'),
        orderBy('expiryTime', 'asc')
      );
    }
    const unsub = onSnapshot(q, snap => {
      const raw = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as FoodListing[];
      if (role === 'ngo') {
        const now = Date.now();
        // Filter out expired or terminal (cancelled/discarded) listings for NGO browsing
        const filtered = raw.filter(l => {
          if (['cancelled','discarded','expired','claimed','picked_up','fulfilled'].includes(l.status || '')) return false;
            let exp: Date | null = null;
            try { exp = l.expiryTime?.toDate ? l.expiryTime.toDate() : (l.expiry ? new Date(l.expiry) : null); } catch { exp = null; }
            if (exp && exp.getTime() < now) return false; // expired
            return true;
        });
        setListings(filtered);
      } else {
        setListings(raw);
      }
      setLoading(false);
    }, err => {
      // eslint-disable-next-line no-console
      console.error('[food_items] listener error', err);
      if (err?.code === 'permission-denied') {
        setError('Permission denied: Firestore security rules blocked access to food_items.');
      } else if (err?.code === 'unavailable') {
        setError('Firestore unavailable (network/offline).');
      } else {
        setError(err.message || 'Unknown Firestore error.');
      }
      setLoading(false);
    });
    return () => unsub();
  }, [role, user]);

  const addListing = useCallback(async (data: AddListingInput) => {
    if (!user) throw new Error('Not authenticated');
    const expiryDate = new Date(data.expiry);
    try {
      const docRef = await addDoc(collection(db, 'food_items'), {
        foodName: data.name,
        foodType: (data.foodType || data.name)?.toLowerCase(),
        name: data.name, // legacy display mapping
        quantity: data.quantity,
        expiry: data.expiry, // legacy keep for compatibility
        expiryTime: Timestamp.fromDate(expiryDate),
        location: data.location,
        donorId: user.uid,
        donorName: user.displayName || user.email,
        status: 'available', // legacy string
        claimed: false,
        createdAt: serverTimestamp(),
      });
      // eslint-disable-next-line no-console
      console.debug('[food_items] added listing id=', docRef.id);
      return docRef.id;
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('[food_items] addListing failed', e);
      if (e?.code === 'permission-denied') {
        throw new Error('Permission denied while creating listing. Check Firestore rules.');
      }
      throw e;
    }
  }, [user]);

  const claimListing = useCallback(async (id: string) => {
    // New workflow: NGO submits a REQUEST; donor later approves.
    if (!user) return;
    const listing = listings.find(l => l.id === id);
    try {
      await addDoc(collection(db, 'claims'), {
        foodItemId: id,
        donorId: listing?.donorId,
        donorName: listing?.donorName,
        recipientId: user.uid,
        recipientName: user.displayName || user.email,
        quantity: listing?.quantity || 1,
        foodName: listing?.foodName || listing?.name,
        status: 'requested', // initial state awaiting donor decision
        requestedAt: ts(),
        createdAt: ts(),
        // claimedAt added only when donor approves (avoid premature 'claimed' status display)
      });
      // Mark the listing itself as requested so it disappears from other NGOs' available list
      if (listing) {
        await updateDoc(doc(db, 'food_items', id), { status: 'requested' });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[claims] request creation failed', e);
      throw e;
    }
  }, [user, listings]);

  // Donor management actions
  const updateListing = useCallback(async (id: string, patch: Partial<FoodListing>) => {
    await updateDoc(doc(db, 'food_items', id), { ...patch });
  }, []);

  const cancelListing = useCallback(async (id: string) => {
    await updateDoc(doc(db, 'food_items', id), { status: 'cancelled', cancelledAt: ts() });
  }, []);

  const discardListing = useCallback(async (id: string) => {
    await updateDoc(doc(db, 'food_items', id), { status: 'discarded', discardedAt: ts() });
  }, []);

  const extendListingExpiry = useCallback(async (id: string, minutes: number) => {
    const listing = listings.find(l => l.id === id);
    if (!listing) return;
    // compute new expiryTime only if current expiryTime exists & not already expired
    let base: Date | null = null;
    try { base = listing.expiryTime?.toDate ? listing.expiryTime.toDate() : (listing.expiry ? new Date(listing.expiry) : null); } catch { /* ignore */ }
    if (!base) return;
    const newDate = new Date(Math.max(Date.now(), base.getTime()) + minutes * 60000);
    await updateDoc(doc(db, 'food_items', id), { expiryTime: Timestamp.fromDate(newDate), extendedCount: (listing.extendedCount || 0) + 1 });
  }, [listings]);

  const deleteListing = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'food_items', id));
  }, []);

  return { listings, addListing, claimListing, updateListing, cancelListing, discardListing, extendListingExpiry, deleteListing, loading, error };
}
