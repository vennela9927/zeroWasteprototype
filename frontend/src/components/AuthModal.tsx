import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Building } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';

// Note: name is optional at schema level so login flow validates without it.
// We enforce name on signup path inside submit handler.
const authSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  userType: z.enum(['donor', 'ngo']),
});

type AuthFormData = z.infer<typeof authSchema>;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [selectedUserType, setSelectedUserType] = useState<'donor' | 'ngo'>('donor');
  const { signup, login, resetPassword, authError } = useAuth();
  const [forgotMode, setForgotMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      userType: selectedUserType,
    },
  });

  const friendlyError = (code: string, message: string) => {
    if (!code) return message || 'Authentication failed.';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return 'Incorrect email or password.';
      case 'auth/user-not-found':
        return 'No account found with that email.';
      case 'auth/email-already-in-use':
        return 'That email is already registered.';
      case 'auth/weak-password':
        return 'Password is too weak (minimum 6 characters).';
      case 'auth/network-request-failed':
        return 'Network error – check your connection.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait and try again.';
      case 'auth/invalid-api-key':
        return 'Invalid Firebase API key – check your configuration.';
      case 'auth/config/invalid-domain':
        return 'Unauthorized domain. Add this domain in Firebase console > Auth > Settings.';
      default:
        return message || 'Authentication failed.';
    }
  };

  const handleFormSubmit = async (data: AuthFormData) => {
    setErrorMsg(null);
    try {
      setSubmitting(true);
      if (forgotMode) {
        await resetPassword(data.email);
        setErrorMsg('Password reset link sent (check your email).');
        setSubmitting(false);
        return;
      }
      if (isLogin) {
        await login(data.email, data.password);
      } else {
        if (!data.name || data.name.trim().length === 0) {
          setErrorMsg('Name is required to create an account.');
          setSubmitting(false);
          return;
        }
        await signup(
          data.email,
          data.password,
          data.name,
          selectedUserType === 'ngo' ? 'recipient' : 'donor'
        );
      }
      reset();
      onClose();
    } catch (e: any) {
      const code = e?.code || '';
      const message = e?.message || '';
      setErrorMsg(friendlyError(code, message));
      if (!isLogin && code === 'auth/email-already-in-use') {
        // If trying to sign up with an existing email, guide user to sign in
        setIsLogin(true);
      }
      // eslint-disable-next-line no-console
      console.warn('[auth] error', e);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-zinc-900">
              {isLogin ? 'Welcome Back' : 'Join ZeroWaste'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {!isLogin && (
            <div className="mb-6">
              <p className="text-sm font-bold text-slate-700 mb-3">I am a:</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedUserType('donor')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedUserType === 'donor'
                      ? 'border-blue-700 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <User size={24} className={`mx-auto mb-2 ${
                    selectedUserType === 'donor' ? 'text-blue-700' : 'text-slate-400'
                  }`} />
                  <span className={`text-sm font-medium ${
                    selectedUserType === 'donor' ? 'text-blue-900' : 'text-slate-600'
                  }`}>
                    Donor
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserType('ngo')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedUserType === 'ngo'
                      ? 'border-blue-700 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Building size={24} className={`mx-auto mb-2 ${
                    selectedUserType === 'ngo' ? 'text-blue-700' : 'text-slate-400'
                  }`} />
                  <span className={`text-sm font-medium ${
                    selectedUserType === 'ngo' ? 'text-blue-900' : 'text-slate-600'
                  }`}>
                    NGO
                  </span>
                </button>
              </div>
            </div>
          )}

          {(errorMsg || authError) && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium space-y-1">
              {errorMsg && <div>{errorMsg}</div>}
              {authError && (
                <div className="text-xs font-normal break-all opacity-80">{authError.code}: {authError.message}</div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-bold text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  {...register('name')}
                  type="text"
                  id="name"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                  placeholder="Enter your name"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-2">
                Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                id="email"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                placeholder="Enter your email"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>

            {!forgotMode && (
              <div>
                <label htmlFor="password" className="block text-sm font-bold text-slate-700 mb-2">
                  Password
                </label>
                <input
                  {...register('password')}
                  type="password"
                  id="password"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                  placeholder="Enter your password"
                />
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-blue-700 to-cyan-500 text-white font-bold py-3 px-6 rounded-xl hover:from-blue-800 hover:to-cyan-600 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Please wait...' : forgotMode ? 'Send Reset Link' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 flex flex-col space-y-3 items-center">
            {isLogin && !forgotMode && (
              <button
                type="button"
                onClick={() => setForgotMode(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >Forgot password?</button>
            )}
            {forgotMode && (
              <button
                type="button"
                onClick={() => setForgotMode(false)}
                className="text-sm text-slate-600 hover:text-slate-700 font-medium"
              >Back to sign in</button>
            )}
            <button
              onClick={() => { setIsLogin(!isLogin); setForgotMode(false); setErrorMsg(null); }}
              className="text-blue-700 font-medium hover:text-blue-800 transition-colors"
              type="button"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AuthModal;