import React from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface PublicProfileData {
  uid: string;
  name: string;
  role: 'donor' | 'recipient';
  verified?: boolean;
  mission?: string;
  acceptedFoodTypes?: string[];
  operatingHours?: string;
  pickupRadiusKm?: number;
  volunteersCount?: number;
  partnerships?: string[];
  socialLinks?: { website?: string; facebook?: string; instagram?: string; twitter?: string; };
  allowContact?: boolean;
  locationShare?: boolean;
  privacy?: { visibility?: 'public' | 'anonymous' };
  address?: { city?: string; region?: string; country?: string };
  profileImage?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  profile: PublicProfileData | null;
  stats?: {
    totalDonations?: number;
    mealsShared?: number;
    ngosHelped?: number;
    avgDonationSize?: number;
    lastFulfilled?: { id: string; foodName: string; quantity: number; fulfilledAt?: any }[];
  };
}

const Pill: React.FC<{ children: React.ReactNode; variant?: 'default'|'warn'|'info' }>=({ children, variant='default' }) => {
  const map:any={ default:'bg-slate-100 text-slate-700', warn:'bg-amber-100 text-amber-700', info:'bg-blue-100 text-blue-700' };
  return <span className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${map[variant]}`}>{children}</span>;
};

const PublicProfileModal: React.FC<Props> = ({ open, onClose, profile, stats }) => {
  const { profile: viewer } = useAuth();
  if (!open || !profile) return null;
  const isNGO = profile.role === 'recipient';
  const isDonor = profile.role === 'donor';
  const viewerIsDonor = viewer?.role === 'donor';
  const viewerIsNGO = viewer?.role === 'recipient';

  // Privacy filter for donor when NGO views
  const donorHidden = isDonor && viewerIsNGO && profile.privacy?.visibility === 'anonymous';
  const displayName = donorHidden ? 'Anonymous Donor' : profile.name;
  const locationLine = profile.address?.city || profile.address?.region || profile.address?.country;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-slate-200 mt-10 animate-in fade-in slide-in-from-top duration-300">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-2">
              {displayName}
              {profile.verified && <span className="text-blue-600 text-sm font-semibold">✅ Verified</span>}
            </h2>
            {locationLine && (profile.role==='recipient' || (profile.role==='donor' && profile.locationShare)) && (
              <p className="text-xs text-slate-500 mt-1">{locationLine}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-8">
          {isNGO && (
            <div className="space-y-4">
              {profile.mission && <p className="text-sm text-slate-700 leading-relaxed">{profile.mission}</p>}
              <div className="flex flex-wrap gap-2">
                {profile.acceptedFoodTypes?.map(t => <Pill key={t}>{t}</Pill>)}
                {profile.operatingHours && <Pill variant="info">Hours: {profile.operatingHours}</Pill>}
                {profile.pickupRadiusKm && <Pill variant="info">Pickup ≤ {profile.pickupRadiusKm} km</Pill>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="text-[10px] uppercase font-semibold text-slate-500">Meals Received</p>
                  <p className="text-lg font-black text-zinc-900">{stats?.mealsShared ?? '—'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="text-[10px] uppercase font-semibold text-slate-500">Food Donations</p>
                  <p className="text-lg font-black text-zinc-900">{stats?.totalDonations ?? '—'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="text-[10px] uppercase font-semibold text-slate-500">Volunteers</p>
                  <p className="text-lg font-black text-zinc-900">{profile.volunteersCount ?? '—'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="text-[10px] uppercase font-semibold text-slate-500">Partners</p>
                  <p className="text-lg font-black text-zinc-900">{profile.partnerships?.length ?? 0}</p>
                </div>
              </div>
              {stats?.lastFulfilled && stats.lastFulfilled.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-600 mb-2">Recent Fulfilled</h4>
                  <ul className="text-xs divide-y divide-slate-200">
                    {stats.lastFulfilled.slice(0,3).map(r => (
                      <li key={r.id} className="py-2 flex items-center justify-between">
                        <span className="font-medium text-zinc-900 truncate mr-2">{r.foodName}</span>
                        <span className="text-slate-500">x{r.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {isDonor && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {donorHidden && <Pill variant="warn">Anonymous</Pill>}
                {!donorHidden && profile.verified && <Pill variant="info">Verified Donor</Pill>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="text-[10px] uppercase font-semibold text-slate-500">Donations</p>
                  <p className="text-lg font-black text-zinc-900">{stats?.totalDonations ?? '—'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="text-[10px] uppercase font-semibold text-slate-500">Meals Shared</p>
                  <p className="text-lg font-black text-zinc-900">{stats?.mealsShared ?? '—'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="text-[10px] uppercase font-semibold text-slate-500">NGOs Helped</p>
                  <p className="text-lg font-black text-zinc-900">{stats?.ngosHelped ?? '—'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="text-[10px] uppercase font-semibold text-slate-500">Avg Size</p>
                  <p className="text-lg font-black text-zinc-900">{stats?.avgDonationSize ?? '—'}</p>
                </div>
              </div>
              {stats?.lastFulfilled && stats.lastFulfilled.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-600 mb-2">Recent Donations</h4>
                  <ul className="text-xs divide-y divide-slate-200">
                    {stats.lastFulfilled.slice(0,3).map(r => (
                      <li key={r.id} className="py-2 flex items-center justify-between">
                        <span className="font-medium text-zinc-900 truncate mr-2">{r.foodName}</span>
                        <span className="text-slate-500">x{r.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-slate-200 pt-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-600">Contact / Connect</h4>
            <div className="text-xs text-slate-600 space-y-1">
              {isNGO && (
                <>
                  {profile.allowContact !== false && profile.socialLinks?.website && <p>Website: <a href={profile.socialLinks.website} target="_blank" rel="noreferrer" className="text-blue-600 underline">{profile.socialLinks.website}</a></p>}
                  {profile.socialLinks?.facebook && <p>Facebook: <a href={profile.socialLinks.facebook} target="_blank" rel="noreferrer" className="text-blue-600 underline">/facebook</a></p>}
                  {profile.socialLinks?.instagram && <p>Instagram: <a href={profile.socialLinks.instagram} target="_blank" rel="noreferrer" className="text-blue-600 underline">/instagram</a></p>}
                </>
              )}
              {isDonor && donorHidden && <p>This donor prefers to remain anonymous.</p>}
              {isDonor && !donorHidden && profile.allowContact && <p>Contact allowed via in-app messaging (future).</p>}
            </div>
            <div className="flex gap-2 pt-2">
              {isNGO && viewerIsDonor && <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold">Send Message</button>}
              {isDonor && viewerIsNGO && !donorHidden && <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold">Send Message</button>}
              {isNGO && viewerIsDonor && <button className="px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-bold">Request Pickup</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProfileModal;
