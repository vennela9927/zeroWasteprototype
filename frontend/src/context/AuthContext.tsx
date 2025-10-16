import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, ts, app } from '../lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, setDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import type { User } from 'firebase/auth';

type UserRole = 'donor' | 'recipient';

interface ZeroUserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  location?: any; // GeoPoint placeholder
  profileImage?: string;
  createdAt?: any;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
  notificationPrefs?: {
    emailClaim?: boolean;
    smsClaim?: boolean;
    inAppClaim?: boolean;
    emailExpiry?: boolean;
    smsExpiry?: boolean;
    inAppExpiry?: boolean;
    emailCampaigns?: boolean;
  };
  language?: string;
  region?: string;
  privacy?: {
    visibility?: 'public' | 'anonymous';
  };
  defaultPickupLocation?: string;
  badges?: string[];
  linkedAccounts?: {
    google?: boolean;
    facebook?: boolean;
  };
  // Extended NGO profile fields / donor privacy
  verified?: boolean; // NGO or donor verification status
  mission?: string; // NGO mission statement
  acceptedFoodTypes?: string[]; // NGO accepted items
  operatingHours?: string; // textual description, e.g., Mon-Fri 9-5
  pickupRadiusKm?: number; // NGO pickup radius
  volunteersCount?: number; // NGO volunteers metric
  partnerships?: string[]; // NGO partners names
  socialLinks?: { website?: string; facebook?: string; instagram?: string; twitter?: string; }; // social media
  allowContact?: boolean; // donor allows NGOs to contact
  locationShare?: boolean; // donor shares location
}

interface AuthContextValue {
  user: User | null;
  profile: ZeroUserProfile | null;
  loading: boolean;
  initDelayed: boolean; // true if auth init exceeded expected time
  authError: { code?: string; message?: string } | null;
  signup: (email: string, password: string, displayName: string, role: UserRole) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfileFields: (patch: Partial<ZeroUserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ZeroUserProfile | null>(null);
  const [initDelayed, setInitDelayed] = useState(false);
  const [authError, setAuthError] = useState<{ code?: string; message?: string } | null>(null);

  useEffect(() => {
    let didSettle = false;
    const timeout = setTimeout(() => {
      if (!didSettle) {
        // eslint-disable-next-line no-console
        console.warn('[auth] onAuthStateChanged taking unusually long (>5s). Check Firebase config / network.');
        setInitDelayed(true);
      }
    }, 5000);
    const unsub = onAuthStateChanged(auth, async u => {
      didSettle = true;
      clearTimeout(timeout);
      setUser(u);
      try {
        if (u) {
          const ref = doc(db, 'users', u.uid);
            const snap = await getDoc(ref);
            if (snap.exists()) {
              setProfile(snap.data() as ZeroUserProfile);
            } else {
              setProfile({
                uid: u.uid,
                name: u.displayName || u.email || 'User',
                email: u.email || '',
                role: 'donor'
              });
            }
        } else {
          setProfile(null);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[auth] profile fetch error', e);
      } finally {
        setLoading(false);
      }
    });
    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, []);

  const signup = async (email: string, password: string, displayName: string, role: UserRole) => {
    try {
      setAuthError(null);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
      // Call backend function to create profile + sample food listing
      try {
        const functions = getFunctions(app);
        const createUserProfile = httpsCallable(functions, 'createUserProfile');
        await createUserProfile({ uid: cred.user.uid, name: displayName || email, email, role });
      } catch (fnErr) {
        // Fallback: direct write if callable function fails (e.g., not deployed yet)
        console.warn('[auth] createUserProfile function failed, falling back to direct write', fnErr);
        const ref = doc(db, 'users', cred.user.uid);
        const profile: ZeroUserProfile = {
          uid: cred.user.uid,
            name: displayName || email,
            email,
            role,
            createdAt: ts()
        };
        await setDoc(ref, profile, { merge: true });
        setProfile(profile);
      }
    } catch (e) {
      // rethrow so UI can display specific error
      const anyE: any = e;
      setAuthError({ code: anyE?.code, message: anyE?.message });
      throw e;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setAuthError(null);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      const anyE: any = e;
      setAuthError({ code: anyE?.code, message: anyE?.message });
      throw e;
    }
  };
  const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);
  const logout = () => signOut(auth);

  const updateProfileFields = async (patch: Partial<ZeroUserProfile>) => {
    if (!user) throw new Error('Not authenticated');
    const ref = doc(db, 'users', user.uid);
    const before = profile || {} as ZeroUserProfile;
    const merged = { ...(profile || {}), ...patch } as ZeroUserProfile;
    await setDoc(ref, patch, { merge: true });
    setProfile(merged);
    try {
      // derive changed top-level keys (shallow diff for logging)
      const changed: string[] = [];
      Object.keys(patch).forEach(k => {
        // @ts-ignore
        if (JSON.stringify((before as any)[k]) !== JSON.stringify((patch as any)[k])) changed.push(k);
      });
      if (changed.length) {
        await addDoc(collection(db, 'user_activity'), {
          uid: user.uid,
          type: 'profile_update',
          changedKeys: changed,
          at: ts()
        });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[activity] log failed', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, initDelayed, authError, signup, login, logout, resetPassword, updateProfileFields }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
