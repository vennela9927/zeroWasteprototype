import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useClaims } from '../hooks/useClaims';
import { useFoodListings } from '../hooks/useFoodListings';

const SectionCard: React.FC<{ title: string; children: React.ReactNode; actionSlot?: React.ReactNode }>=({ title, children, actionSlot }) => (
  <div className="card-fintech p-6 space-y-4">
    <div className="flex items-start justify-between">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">{title}</h3>
      {actionSlot}
    </div>
    {children}
  </div>
);

const Toggle: React.FC<{ label:string; checked:boolean; onChange:()=>void }>=({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
    <span className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${checked? 'bg-blue-600':'bg-slate-300'}`}> 
      <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked? 'translate-x-4':''}`}></span>
    </span>
    <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
    <span className="text-slate-700 font-medium">{label}</span>
  </label>
);

const BadgePill: React.FC<{ label:string }>=({ label }) => (
  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold uppercase tracking-wide">{label}</span>
);

const ProfileSettings: React.FC = () => {
  const { profile, updateProfileFields } = useAuth();
  const roleForClaims = profile?.role === 'recipient' ? 'recipient' : 'donor';
  const { claims } = useClaims(roleForClaims);
  const { listings } = useFoodListings(profile?.role === 'recipient' ? 'ngo' : 'donor');

  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'info'|'prefs'|'stats'|'integrations'|'activity'|'support'>('info');

  if (!profile) return <div className="text-sm text-slate-600">Loading profile...</div>;

  // Derived stats
  const donatedListings = listings.length;
  const mealsShared = claims.filter(c => c.status === 'approved' || c.status === 'fulfilled').reduce((s,c)=>s+(c.quantity||0),0);
  const ngosHelped = new Set(claims.filter(c => c.status === 'approved' || c.status === 'fulfilled').map(c => c.recipientId)).size;
  const sustainabilityScore = mealsShared * 5; // placeholder

  // Badges logic (simple thresholds)
  const dynamicBadges: string[] = [];
  if (mealsShared >= 10) dynamicBadges.push('10 Meals');
  if (mealsShared >= 50) dynamicBadges.push('50 Meals');
  if (mealsShared >= 100) dynamicBadges.push('100 Meals');
  if (ngosHelped >= 3) dynamicBadges.push('Community Ally');
  if (sustainabilityScore >= 500) dynamicBadges.push('Sustainability Bronze');

  const notif = profile.notificationPrefs || {};
  const privacy = profile.privacy || { visibility: 'public' };

  const handleInfoSave: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await updateProfileFields({
        name: String(fd.get('name')||'').trim() || profile.name,
        phone: String(fd.get('phone')||'').trim() || undefined,
        address: {
          line1: String(fd.get('line1')||'').trim() || undefined,
          line2: String(fd.get('line2')||'').trim() || undefined,
          city: String(fd.get('city')||'').trim() || undefined,
          region: String(fd.get('region')||'').trim() || undefined,
          postalCode: String(fd.get('postalCode')||'').trim() || undefined,
          country: String(fd.get('country')||'').trim() || undefined,
        },
        defaultPickupLocation: String(fd.get('defaultPickupLocation')||'').trim() || undefined
      });
    } finally { setSaving(false); }
  };

  const togglePref = async (key: keyof NonNullable<typeof profile.notificationPrefs>) => {
    const next = { ...(profile.notificationPrefs || {}), [key]: !notif[key] };
    await updateProfileFields({ notificationPrefs: next });
  };

  const setVisibility = async (v: 'public' | 'anonymous') => {
    await updateProfileFields({ privacy: { visibility: v } });
  };

  const SectionNav = () => (
    <div className="flex flex-wrap gap-2 mb-6">
      {([
        ['info','Personal Info'],
        ['prefs','Preferences'],
        ['stats','Stats & Badges'],
        ['integrations','Integrations'],
        ['activity','Activity Log'],
        ['support','Support']
      ] as const).map(([k,label]) => (
        <button key={k} onClick={()=>setTab(k)} className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide ${tab===k? 'bg-gradient-to-r from-blue-700 to-cyan-500 text-white':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{label}</button>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <SectionNav />

      {tab === 'info' && (
        <SectionCard title="Personal Information">
          <form onSubmit={handleInfoSave} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Name</label>
              <input name="name" defaultValue={profile.name} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Phone</label>
              <input name="phone" defaultValue={profile.phone||''} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Default Pickup Location</label>
              <input name="defaultPickupLocation" defaultValue={profile.defaultPickupLocation||''} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Address Line 1</label>
                <input name="line1" defaultValue={profile.address?.line1||''} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Address Line 2</label>
                <input name="line2" defaultValue={profile.address?.line2||''} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">City</label>
                <input name="city" defaultValue={profile.address?.city||''} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Region</label>
                <input name="region" defaultValue={profile.address?.region||''} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Postal Code</label>
                <input name="postalCode" defaultValue={profile.address?.postalCode||''} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Country</label>
                <input name="country" defaultValue={profile.address?.country||''} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
              </div>
            </div>
            <div className="md:col-span-3 flex items-center gap-3 pt-2">
              <button disabled={saving} type="submit" className="px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-50">{saving? 'Saving...':'Save Changes'}</button>
              <span className="text-[11px] text-slate-500">Email: {profile.email}</span>
            </div>
          </form>
        </SectionCard>
      )}

      {tab === 'prefs' && (
        <div className="space-y-6">
          <SectionCard title="Notification Preferences">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Toggle label="Email Claim Alerts" checked={!!notif.emailClaim} onChange={()=>togglePref('emailClaim')} />
              <Toggle label="In-App Claim Alerts" checked={!!notif.inAppClaim} onChange={()=>togglePref('inAppClaim')} />
              <Toggle label="Email Expiry Alerts" checked={!!notif.emailExpiry} onChange={()=>togglePref('emailExpiry')} />
              <Toggle label="Campaign Emails" checked={!!notif.emailCampaigns} onChange={()=>togglePref('emailCampaigns')} />
            </div>
          </SectionCard>
          <SectionCard title="Privacy">
            <div className="flex items-center gap-4">
              <button onClick={()=>setVisibility('public')} className={`px-4 py-2 rounded-lg text-xs font-semibold ${privacy.visibility==='public'?'bg-blue-600 text-white':'bg-slate-200 text-slate-700'}`}>Public</button>
              <button onClick={()=>setVisibility('anonymous')} className={`px-4 py-2 rounded-lg text-xs font-semibold ${privacy.visibility==='anonymous'?'bg-blue-600 text-white':'bg-slate-200 text-slate-700'}`}>Anonymous</button>
            </div>
          </SectionCard>
        </div>
      )}

      {tab === 'stats' && (
        <SectionCard title="Account Stats & Badges">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="p-4 bg-white rounded-xl border border-slate-200 text-center">
              <p className="text-[10px] uppercase font-semibold text-slate-500">Donations</p>
              <p className="text-xl font-black text-zinc-900 mt-1">{donatedListings}</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 text-center">
              <p className="text-[10px] uppercase font-semibold text-slate-500">Meals Shared</p>
              <p className="text-xl font-black text-zinc-900 mt-1">{mealsShared}</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 text-center">
              <p className="text-[10px] uppercase font-semibold text-slate-500">NGOs Helped</p>
              <p className="text-xl font-black text-zinc-900 mt-1">{ngosHelped}</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 text-center">
              <p className="text-[10px] uppercase font-semibold text-slate-500">Sustainability</p>
              <p className="text-xl font-black text-zinc-900 mt-1">{sustainabilityScore}</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 text-center">
              <p className="text-[10px] uppercase font-semibold text-slate-500">Visibility</p>
              <p className="text-xs font-semibold mt-2 px-2 py-1 rounded-full bg-slate-100 text-slate-700 inline-block">{privacy.visibility}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {dynamicBadges.length === 0 && <span className="text-xs text-slate-500">No badges yet — keep donating!</span>}
            {dynamicBadges.map(b => <BadgePill key={b} label={b} />)}
          </div>
        </SectionCard>
      )}

      {tab === 'integrations' && (
        <SectionCard title="Linked Accounts & Integrations">
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
              <div>
                <p className="font-semibold text-zinc-900">Google</p>
                <p className="text-xs text-slate-500">Social login linking (placeholder)</p>
              </div>
              <button className="px-4 py-2 rounded-lg bg-slate-200 text-xs font-semibold">Link</button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
              <div>
                <p className="font-semibold text-zinc-900">Facebook</p>
                <p className="text-xs text-slate-500">Social login linking (placeholder)</p>
              </div>
              <button className="px-4 py-2 rounded-lg bg-slate-200 text-xs font-semibold">Link</button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
              <div>
                <p className="font-semibold text-zinc-900">Payment Methods</p>
                <p className="text-xs text-slate-500">(Future) Add card for contributions</p>
              </div>
              <button className="px-4 py-2 rounded-lg bg-slate-200 text-xs font-semibold">Add</button>
            </div>
          </div>
        </SectionCard>
      )}

      {tab === 'activity' && (
        <SectionCard title="Activity Log">
          <p className="text-xs text-slate-500 mb-4">Recent profile-related changes (demo only). Donation history lives elsewhere.</p>
          <div className="text-xs text-slate-600">Activity feed integration can query <code>user_activity</code> collection (not implemented fully here).</div>
        </SectionCard>
      )}

      {tab === 'support' && (
        <SectionCard title="Support & Help">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <p className="font-semibold text-zinc-900 mb-1">Contact Support</p>
              <p className="text-xs text-slate-500 mb-3">Need help? Send us a message.</p>
              <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold w-full">Open Form</button>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <p className="font-semibold text-zinc-900 mb-1">FAQs</p>
              <p className="text-xs text-slate-500 mb-3">Common answers about donating & claims.</p>
              <button className="px-4 py-2 rounded-lg bg-slate-200 text-xs font-semibold w-full">Browse</button>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <p className="font-semibold text-zinc-900 mb-1">App Version</p>
              <p className="text-xs text-slate-500">v0.1.0 (frontend)</p>
              <p className="text-[10px] mt-1 text-slate-400">Latest build</p>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
};

export default ProfileSettings;
