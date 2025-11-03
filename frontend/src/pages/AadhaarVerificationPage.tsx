import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AadhaarVerification from '../components/AadhaarVerification';
import { useAuth } from '../context/AuthContext';

const AadhaarVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  React.useEffect(() => {
    // Redirect if not logged in
    if (user === null) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleVerified = () => {
    // Redirect to dashboard after successful verification
    setTimeout(() => {
      if (profile?.role === 'recipient') {
        navigate('/dashboard');
      } else {
        navigate('/donor');
      }
    }, 1500);
  };

  const handleClose = () => {
    navigate(-1); // Go back to previous page
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-black text-zinc-900 mb-2">
            Verify Your Identity
          </h1>
          <p className="text-slate-600">
            Complete Aadhaar eKYC verification to unlock all features
          </p>
        </motion.div>

        {/* Verification Component */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AadhaarVerification
            onVerified={handleVerified}
            onClose={handleClose}
          />
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="text-2xl mb-2">🔒</div>
            <h3 className="font-bold text-sm text-zinc-900 mb-1">Secure</h3>
            <p className="text-xs text-slate-600">
              Your data is encrypted and protected
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="font-bold text-sm text-zinc-900 mb-1">Instant</h3>
            <p className="text-xs text-slate-600">
              Verification completes in seconds
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="text-2xl mb-2">✅</div>
            <h3 className="font-bold text-sm text-zinc-900 mb-1">Trusted</h3>
            <p className="text-xs text-slate-600">
              Government-backed verification
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AadhaarVerificationPage;

