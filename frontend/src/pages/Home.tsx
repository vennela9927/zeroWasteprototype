import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Heart } from 'lucide-react';
import HeroCard from '../components/HeroCard';
import AuthModal from '../components/AuthModal';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signOut } from 'firebase/auth';

const Home: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug('[home] auth user change', { hasUser: !!user });
    if (user && profile) {
      // Redirect based on user role
      if (profile.role === 'recipient') {
        navigate('/dashboard'); // NGO goes to old dashboard
      } else {
        navigate('/donor'); // Donor goes to new donor page
      }
    }
  }, [user, profile, navigate]);


  // Authentication now managed by AuthContext; modal just triggers login/signup.

  // Dashboard handled by /dashboard route when user is authenticated.

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-100/50 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-blue-teal rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-black text-2xl">Z</span>
              </div>
              <span className="text-2xl font-black text-fintech-black">ZeroWaste</span>
            </div>
            
            <div className="flex items-center space-x-6">
              <button
                onClick={() => setShowAuthModal(true)}
                className="btn-fintech-outline"
              >
                Sign In
              </button>
              <button
                onClick={() => setShowAuthModal(true)}
                className="btn-fintech"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <HeroCard onGetStarted={() => setShowAuthModal(true)} />
        
        {/* Features Section */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="mt-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-black text-zinc-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Simple, intelligent, and impactful food redistribution
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-black text-blue-700">1</span>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">Donate Food</h3>
              <p className="text-slate-600">
                Donors list surplus food with AI-powered surplus warnings and optimal timing suggestions
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-black text-cyan-600">2</span>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">Smart Matching</h3>
              <p className="text-slate-600">
                AI algorithms match donations with NGOs based on location, capacity, and need patterns
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-black text-green-600">3</span>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">Feed Communities</h3>
              <p className="text-slate-600">
                NGOs claim food donations and redistribute to families in need, creating measurable impact
              </p>
            </div>
          </div>
        </motion.section>

        {/* AI Suggestions Section */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.8 }}
          className="mt-20"
        >
          <div className="card-fintech max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center space-x-2 badge-blue mb-4">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                <span className="font-semibold">AI-Powered</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-fintech-black mb-4">
                Smart Suggestions
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Our AI analyzes patterns to provide personalized recommendations for optimal food sharing
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* For Donors */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2.0, duration: 0.6 }}
                className="bg-gradient-to-br from-blue-gray/5 to-pastel-green/5 rounded-2xl p-6 border border-slate-100"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-blue-teal rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-fintech-black">For Donors</h3>
                </div>
                <div className="space-y-3">
                  <div className="bg-white rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-600">Peak Donation Time</span>
                      <span className="badge-green">Optimal</span>
                    </div>
                    <p className="text-fintech-black font-bold text-lg">6:00 PM - 8:00 PM</p>
                    <p className="text-sm text-slate-500">85% faster pickup rate</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-600">High Demand Items</span>
                      <span className="badge-yellow">Trending</span>
                    </div>
                    <p className="text-fintech-black font-bold">Fresh Vegetables, Bread</p>
                    <p className="text-sm text-slate-500">92% claim rate in your area</p>
                  </div>
                </div>
              </motion.div>

              {/* For NGOs */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2.2, duration: 0.6 }}
                className="bg-gradient-to-br from-pale-pink/5 to-soft-yellow/5 rounded-2xl p-6 border border-slate-100"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-orange-400 rounded-xl flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-fintech-black">For NGOs</h3>
                </div>
                <div className="space-y-3">
                  <div className="bg-white rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-600">Nearby Donations</span>
                      <span className="badge-blue">AI Match</span>
                    </div>
                    <p className="text-fintech-black font-bold text-lg">3 within 2km</p>
                    <p className="text-sm text-slate-500">Best match: Fresh produce, expires in 6h</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-600">Predicted Surplus</span>
                      <span className="badge-pink">Next 2hrs</span>
                    </div>
                    <p className="text-fintech-black font-bold">Downtown Bakery</p>
                    <p className="text-sm text-slate-500">45% probability of bread donation</p>
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.4, duration: 0.6 }}
              className="text-center mt-8"
            >
              <button
                onClick={() => setShowAuthModal(true)}
                className="btn-fintech"
              >
                Get AI Recommendations
              </button>
            </motion.div>
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="bg-sidebar-dark text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-gradient-blue-teal rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-black text-2xl">Z</span>
                </div>
                <span className="text-2xl font-black">ZeroWaste</span>
              </div>
              <p className="text-slate-300 max-w-md text-lg leading-relaxed mb-6">
                AI-powered food redistribution platform eliminating waste and feeding communities.
              </p>
              <div className="flex space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-black text-white">5K+</div>
                  <div className="text-sm text-slate-400">Meals Saved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-white">150+</div>
                  <div className="text-sm text-slate-400">NGOs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-white">2.5T</div>
                  <div className="text-sm text-slate-400">CO₂ Saved</div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Platform</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">For Donors</a></li>
                <li><a href="#" className="hover:text-white transition-colors">For NGOs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Impact Stories</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-zinc-800 mt-8 pt-8 text-center text-slate-400">
            <p>&copy; 2025 ZeroWaste. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
};

export default Home;
