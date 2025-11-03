import { useEffect, useState, useCallback } from 'react';
import { db, ts } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import {
  collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, Timestamp, doc, updateDoc, deleteDoc
} from 'firebase/firestore';
import { logFoodCreated, logFoodClaimed } from '../utils/auditLog';

export interface FoodListing {
  id: string;
  foodName: string;
  foodType?: string; // analytics grouping (optional)
  preparationType?: 'raw' | 'cooked' | 'packaged'; // food preparation status
  preparedTime?: Timestamp; // when food was prepared/cooked
  verified?: boolean; // donor verification status
  name?: string; // backward compatibility (UI still expects name)
  quantity: number;
  expiry?: string; // legacy
  expiryTime?: Timestamp; // new canonical field
  location: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string; // food image
  status?: 'available' | 'requested' | 'claimed' | 'picked_up' | 'expired' | 'cancelled' | 'discarded' | 'fulfilled' | 'in_transit';
  claimed?: boolean; // new boolean flag
  donorId?: string;
  donorName?: string;
  claimedBy?: string;
  requestedBy?: string; // NGO who requested this item
  claimedAt?: Timestamp;
  createdAt?: any;
  cancelledAt?: any;
  discardedAt?: any;
  extendedCount?: number;
}

interface AddListingInput {
  name: string; // food item name / description
  quantity: number;
  quantityUnit?: string; // kg | meals
  expiry: string; // date string from form (will be converted to expiryTime Timestamp)
  preparedTime?: string; // when food was prepared (will be converted to Timestamp)
  location: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string; // food image
  foodType?: string; // optional categorical type (rice, bread, curry...)
  preparationType?: 'raw' | 'cooked' | 'packaged'; // food preparation status
  description?: string; // optional notes
}

export function useFoodListings(role: 'donor' | 'ngo') {
  const { user, profile } = useAuth();
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    if (role === 'donor') {
      const q = query(
        collection(db, 'food_items'),
        where('donorId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const unsub = onSnapshot(q, snap => {
        const raw = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as FoodListing[];
        setListings(raw);
        setLoading(false);
      }, err => {
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
    } else {
      // For NGO: broad query (no orderBy to avoid index/field issues), then sort/filter client-side
      const broadQuery = collection(db, 'food_items');
      const unsub = onSnapshot(broadQuery, snap => {
        const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as FoodListing[];
        setListings(items);
        setLoading(false);
      }, err => {
        console.error('[food_items] NGO broad listener error', err);
        setError(err.message || 'Unknown error');
        setLoading(false);
      });
      // One-time fallback fetch in case realtime listener returns empty initially
      import('firebase/firestore').then(async m => {
        try {
          const snap = await m.getDocs(collection(db, 'food_items'));
          const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as FoodListing[];
          if (items.length && loading) setListings(items);
        } catch (e) {
          console.warn('[food_items] NGO fallback getDocs failed', e);
        }
      });
      return () => unsub();
    }
  }, [role, user]);

  const addListing = useCallback(async (data: AddListingInput) => {
    if (!user) throw new Error('Not authenticated');
    const expiryDate = new Date(data.expiry);
    try {
      const payload: any = {
        foodName: data.name,
        foodType: (data.foodType || data.name)?.toLowerCase(),
        name: data.name, // legacy display mapping
        quantity: data.quantity,
        quantityUnit: data.quantityUnit || 'meals', // default to meals if not specified
        expiry: data.expiry, // legacy keep for compatibility
        expiryTime: Timestamp.fromDate(expiryDate),
        location: data.location,
        donorId: user.uid,
        donorName: user.displayName || user.email,
        status: 'available', // legacy string
        claimed: false,
        verified: false, // Default to unverified; can be updated via admin panel
        createdAt: serverTimestamp(),
      };
      if (data.description) payload.description = data.description;
      if (data.preparationType) payload.preparationType = data.preparationType;
      if (data.preparedTime) {
        const preparedDate = new Date(data.preparedTime);
        payload.preparedTime = Timestamp.fromDate(preparedDate);
      }
      if (data.imageUrl) payload.imageUrl = data.imageUrl;
      if (typeof data.latitude === 'number' && Number.isFinite(data.latitude)) payload.latitude = data.latitude;
      if (typeof data.longitude === 'number' && Number.isFinite(data.longitude)) payload.longitude = data.longitude;
      const docRef = await addDoc(collection(db, 'food_items'), payload);
      // eslint-disable-next-line no-console
      console.debug('[food_items] added listing id=', docRef.id);
      
      // Create immutable audit log
      try {
        await logFoodCreated(
          docRef.id,
          user.uid,
          user.displayName || user.email || 'Donor',
          {
            foodName: data.name,
            quantity: data.quantity,
            location: data.location,
          }
        );
      } catch (auditError) {
        console.error('[audit] Failed to log food creation:', auditError);
        // Don't fail the main operation if audit logging fails
      }
      
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

  const claimListing = useCallback(async (id: string, matchScore?: number) => {
    // New workflow: NGO submits a REQUEST; donor later approves.
    if (!user) return;
    let listing = listings.find(l => l.id === id);
    // Fallback: fetch listing from Firestore if not present or missing donorId
    if (!listing || !(listing as any).donorId) {
      try {
        const snap = await import('firebase/firestore').then(m => m.getDoc(m.doc(db, 'food_items', id)));
        if (snap.exists()) {
          listing = { id: snap.id, ...(snap.data() as any) } as any;
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[claims] failed to hydrate listing from Firestore', e);
      }
    }
    
    // Validation: Check if this food item is already requested or claimed
    if (listing?.status === 'requested' && listing?.requestedBy === user.uid) {
      throw new Error('You have already requested this item');
    }
    if (listing?.status === 'requested' && listing?.requestedBy !== user.uid) {
      throw new Error('This item has already been requested by another NGO');
    }
    if (listing?.status === 'claimed' || listing?.claimed) {
      throw new Error('This item has already been claimed');
    }
    if (!listing || listing?.status !== 'available') {
      throw new Error('This item is no longer available');
    }
    
    try {
      // Check if there's already an active claim by this user for this item
      const existingClaimsQuery = query(
        collection(db, 'claims'),
        where('foodItemId', '==', id),
        where('recipientId', '==', user.uid),
        where('status', 'in', ['requested', 'approved'])
      );
      const existingClaims = await import('firebase/firestore').then(m => m.getDocs(existingClaimsQuery));
      if (!existingClaims.empty) {
        throw new Error('You have already requested this item');
      }
      
      const claimPayload: any = {
        foodItemId: id,
        donorId: (listing as any)?.donorId || null,
        donorName: listing?.donorName,
        recipientId: user.uid,
        recipientName: user.displayName || user.email,
        quantity: listing?.quantity || 1,
        foodName: listing?.foodName || listing?.name,
        // Store destination location for directions after approval
        location: listing?.location,
        status: 'requested', // initial state awaiting donor decision
        requestedAt: ts(),
        createdAt: ts(),
      };
      const lat = (listing as any)?.latitude;
      const lng = (listing as any)?.longitude;
      if (typeof lat === 'number' && Number.isFinite(lat)) claimPayload.latitude = lat;
      if (typeof lng === 'number' && Number.isFinite(lng)) claimPayload.longitude = lng;
      
      // Ensure donorId is present; if not, do not block the request, but donor filtering may miss it
      await addDoc(collection(db, 'claims'), claimPayload);
      
      // Mark the listing itself as requested and track who requested it
      if (listing) {
        const listingPatch: any = { status: 'requested', requestedBy: user.uid };
        if (!(listing as any).requestedAt) listingPatch.requestedAt = ts();
        await updateDoc(doc(db, 'food_items', id), listingPatch);
      }
      
      // Blockchain Audit Log: Record claim event
      try {
        await logFoodClaimed(
          id,
          user.uid,
          user.displayName || user.email || 'NGO',
          {
            foodName: listing?.foodName || listing?.name,
            quantity: listing?.quantity,
            matchScore,
          }
        );
      } catch (auditError) {
        console.error('[audit] Failed to log food claim:', auditError);
      }
      
      // AI Learning: Log accept feedback (async, don't wait)
      if (listing && matchScore !== undefined) {
        // Dynamically import to avoid circular dependencies
        import('../utils/aiLearning').then(({ logAccept }) => {
          logAccept(
            user.uid,
            id,
            listing.donorId || '',
            matchScore,
            {
              foodType: listing.foodType || 'unknown',
              quantity: listing.quantity,
              distanceKm: (listing as any)._distanceKm,
              expiryHours: (listing as any)._expiryHours || 24,
              verified: listing.verified || false,
              freshnessPercent: (listing as any)._freshnessPercent,
            }
          ).catch(err => {
            // eslint-disable-next-line no-console
            console.error('[AI Learning] Failed to log accept:', err);
          });
        });
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
