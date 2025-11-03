import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ProfileSettings: React.FC = () => {
  const { profile, updateProfileFields } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  if (!profile) return <div className="text-sm text-slate-600">Loading profile...</div>;

  const handleInfoSave: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await updateProfileFields({
        name: String(fd.get('name') || '').trim() || profile.name,
        phone: String(fd.get('phone') || '').trim() || undefined,
        defaultPickupLocation: String(fd.get('defaultPickupLocation') || '').trim() || undefined,
        address: {
          line1: String(fd.get('line1') || '').trim() || undefined,
          line2: String(fd.get('line2') || '').trim() || undefined,
          city: String(fd.get('city') || '').trim() || undefined,
          region: String(fd.get('region') || '').trim() || undefined,
          postalCode: String(fd.get('postalCode') || '').trim() || undefined,
          country: String(fd.get('country') || '').trim() || undefined,
        }
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-black text-zinc-900 mb-1">Profile Settings</h2>
        <p className="text-slate-600 text-sm">Manage your account information and verification</p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Personal Information */}
        <div className="card-fintech p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Personal Information</h3>
          <form onSubmit={handleInfoSave} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Name</label>
              <input name="name" defaultValue={profile.name} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" required />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Email</label>
              <input value={profile.email} disabled className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Phone</label>
              <input name="phone" defaultValue={profile.phone || ''} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Default Pickup Location</label>
              <input name="defaultPickupLocation" defaultValue={profile.defaultPickupLocation || ''} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Address Line 1</label>
              <input name="line1" defaultValue={profile.address?.line1 || ''} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Address Line 2</label>
              <input name="line2" defaultValue={profile.address?.line2 || ''} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">City</label>
                <input name="city" defaultValue={profile.address?.city || ''} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Postal Code</label>
                <input name="postalCode" defaultValue={profile.address?.postalCode || ''} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Region/State</label>
                <input name="region" defaultValue={profile.address?.region || ''} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Country</label>
                <input name="country" defaultValue={profile.address?.country || ''} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
              </div>
            </div>
            <button disabled={saving} type="submit" className="w-full px-5 py-3 rounded-lg bg-gradient-to-r from-blue-700 to-cyan-500 text-white text-sm font-bold disabled:opacity-50 hover:from-blue-800 hover:to-cyan-600 transition-all">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Right Column - Aadhaar Verification */}
        <div className="card-fintech p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Aadhaar eKYC Verification</h3>
          <div className="space-y-4">
            {(profile as any)?.aadhaarVerified ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Shield className="text-green-600" size={24} />
                    </div>
                    <div>
                      <p className="font-semibold text-green-900">Aadhaar Verified ✓</p>
                      <p className="text-sm text-green-700">
                        Aadhaar: ****-****-{(profile as any)?.aadhaarLastFour || '****'}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                    VERIFIED
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Your identity has been verified successfully.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>🔒 Verify your identity with Aadhaar eKYC</strong>
                  </p>
                  <p className="text-xs text-blue-700">
                    Complete verification to increase trust and unlock premium features
                  </p>
                </div>
                <button
                  onClick={() => navigate('/verify-aadhaar')}
                  className="w-full bg-gradient-to-r from-blue-700 to-cyan-500 text-white font-bold py-3 px-6 rounded-lg hover:from-blue-800 hover:to-cyan-600 transition-all flex items-center justify-center gap-2"
                >
                  <Shield size={20} />
                  Verify with Aadhaar eKYC
                </button>
                <p className="text-xs text-slate-500 text-center">
                  🧪 Testing mode - Uses mock verification
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
