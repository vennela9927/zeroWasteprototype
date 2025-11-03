import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, ts } from '../lib/firebase';

interface AadhaarVerificationProps {
  onVerified?: () => void;
  onClose?: () => void;
}

// Mock Aadhaar verification for testing
const mockAadhaarVerify = (aadhaarNumber: string): { valid: boolean; message: string } => {
  // In testing mode, accept any 12-digit number
  if (!/^\d{12}$/.test(aadhaarNumber)) {
    return { valid: false, message: 'Aadhaar must be exactly 12 digits' };
  }
  return { valid: true, message: 'Valid Aadhaar format' };
};

// Generate random 6-digit OTP for testing
const generateMockOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const AadhaarVerification: React.FC<AadhaarVerificationProps> = ({ onVerified, onClose }) => {
  const { user, updateProfileFields } = useAuth();
  const [step, setStep] = useState<'input' | 'otp' | 'success'>('input');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mockName, setMockName] = useState('');

  // Use actual user's name for mock Aadhaar data
  const generateMockAadhaarData = () => {
    return {
      name: user?.displayName || profile?.name || 'User',
      verified: true
    };
  };

  const handleAadhaarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = mockAadhaarVerify(aadhaarNumber);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    setLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate mock OTP
    const mockOtp = generateMockOTP();
    setGeneratedOTP(mockOtp);
    
    // Generate mock Aadhaar holder name
    const mockData = generateMockAadhaarData();
    setMockName(mockData.name);

    setLoading(false);
    setStep('otp');

    // In testing mode, show the OTP in console for easy testing
    console.log('🔐 TESTING MODE - Generated OTP:', mockOtp);
    console.log('📝 Mock Aadhaar Name:', mockData.name);
  };

  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp !== generatedOTP) {
      setError('Invalid OTP. Please try again.');
      return;
    }

    setLoading(true);
    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      // Update user profile with Aadhaar verification
      await updateProfileFields({
        verified: true,
        aadhaarVerified: true,
        aadhaarLastFour: aadhaarNumber.slice(-4),
        verifiedAt: ts(),
      } as any);

      setLoading(false);
      setStep('success');

      // Call success callback after a brief delay
      setTimeout(() => {
        if (onVerified) onVerified();
      }, 2000);
    } catch (err) {
      setError('Failed to update verification status');
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    const newOtp = generateMockOTP();
    setGeneratedOTP(newOtp);
    setOtp('');
    console.log('🔐 TESTING MODE - Resent OTP:', newOtp);
  };

  // Quick test buttons for demo purposes
  const fillRandomAadhaar = () => {
    const randomAadhaar = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    setAadhaarNumber(randomAadhaar);
  };

  const fillCorrectOTP = () => {
    setOtp(generatedOTP);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-blue-700 to-cyan-500 rounded-xl">
              <Shield className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-zinc-900">Aadhaar Verification</h2>
              <p className="text-xs text-slate-500">Testing Mode - Mock eKYC</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              ×
            </button>
          )}
        </div>

        {/* Step 1: Aadhaar Input */}
        {step === 'input' && (
          <form onSubmit={handleAadhaarSubmit} className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>🧪 Testing Mode Active</strong>
                <br />
                Enter any 12-digit number as Aadhaar. OTP will be shown in console.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Aadhaar Number
              </label>
              <input
                type="text"
                value={aadhaarNumber}
                onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                placeholder="Enter 12-digit Aadhaar"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg tracking-wider"
                maxLength={12}
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                {aadhaarNumber.length}/12 digits
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle size={16} className="text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Quick Test Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={fillRandomAadhaar}
                className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors"
              >
                🎲 Random Aadhaar
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || aadhaarNumber.length !== 12}
              className="w-full bg-gradient-to-r from-blue-700 to-cyan-500 text-white font-bold py-3 rounded-lg hover:from-blue-800 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'otp' && (
          <form onSubmit={handleOTPVerify} className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <strong>✅ OTP Sent Successfully</strong>
                <br />
                Mock name: <strong>{mockName}</strong>
                <br />
                Aadhaar: ****-****-{aadhaarNumber.slice(-4)}
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs text-amber-800">
                <strong>🧪 Testing Mode:</strong> Check browser console for OTP or click "Auto-fill OTP" button
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Enter OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit OTP"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg tracking-widest text-center"
                maxLength={6}
                required
              />
              <p className="text-xs text-slate-500 mt-1 text-center">
                {otp.length}/6 digits
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle size={16} className="text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Quick Test Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={fillCorrectOTP}
                className="flex-1 px-3 py-2 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-200 transition-colors"
              >
                ✅ Auto-fill OTP
              </button>
              <button
                type="button"
                onClick={handleResendOTP}
                className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors"
              >
                🔄 Resend OTP
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-gradient-to-r from-blue-700 to-cyan-500 text-white font-bold py-3 rounded-lg hover:from-blue-800 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('input');
                setOtp('');
                setError('');
              }}
              className="w-full text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              ← Back to Aadhaar input
            </button>
          </form>
        )}

        {/* Step 3: Success */}
        {step === 'success' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-8"
          >
            <div className="mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="inline-block p-4 bg-green-100 rounded-full"
              >
                <CheckCircle size={64} className="text-green-600" />
              </motion.div>
            </div>

            <h3 className="text-2xl font-black text-zinc-900 mb-2">
              Verification Successful! 🎉
            </h3>
            <p className="text-slate-600 mb-1">
              Your Aadhaar has been verified
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Mock Name: <strong>{mockName}</strong>
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800">
                ✅ Your account is now verified
                <br />
                Aadhaar: ****-****-{aadhaarNumber.slice(-4)}
              </p>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-blue-700 to-cyan-500 text-white font-bold py-3 rounded-lg hover:from-blue-800 hover:to-cyan-600 transition-all"
              >
                Continue
              </button>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Testing Instructions */}
      <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <p className="text-xs text-slate-600 font-semibold mb-2">
          🧪 Testing Mode Instructions:
        </p>
        <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
          <li>Use any 12-digit number as Aadhaar</li>
          <li>OTP will be logged to browser console</li>
          <li>Use "Auto-fill OTP" button for quick testing</li>
          <li>Verification is stored in user profile</li>
        </ul>
      </div>
    </div>
  );
};

export default AadhaarVerification;

