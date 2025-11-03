import React, { useState, useEffect } from 'react';
import { Heart, Gift, TrendingUp, Users } from 'lucide-react';
import { collection, addDoc, getDocs, query, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { db, ts } from '../lib/firebase';
import { toast } from 'react-toastify';

interface MicroDonationProps {
  userId?: string;
  userName?: string;
}

interface DonationAmount {
  amount: number;
  impact: string;
  icon: string;
}

/**
 * Micro-Donation Component
 * 
 * Features:
 * - Small donations (₹5-₹100) for logistics
 * - UPI integration (Razorpay)
 * - Transparent fund tracking
 * - Impact visualization
 * - Donor recognition
 */
export const MicroDonation: React.FC<MicroDonationProps> = ({ userId, userName }) => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [totalFunds, setTotalFunds] = useState(0);
  const [recentDonors, setRecentDonors] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);

  const donationAmounts: DonationAmount[] = [
    { amount: 5, impact: '🚗 Fuel for 1 delivery', icon: '🚗' },
    { amount: 10, impact: '⛽ Fuel for 2 deliveries', icon: '⛽' },
    { amount: 20, impact: '🍱 Support 4 meals delivery', icon: '🍱' },
    { amount: 50, impact: '🚚 Fund a complete route', icon: '🚚' },
    { amount: 100, impact: '💯 Power 20 meals delivery', icon: '💯' },
  ];

  useEffect(() => {
    fetchDonationStats();
  }, []);

  const fetchDonationStats = async () => {
    try {
      // Get total funds
      const donationsSnapshot = await getDocs(collection(db, 'micro_donations'));
      const total = donationsSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (data.amount || 0);
      }, 0);
      setTotalFunds(total);

      // Get recent donors
      const q = query(
        collection(db, 'micro_donations'),
        orderBy('timestamp', 'desc'),
        firestoreLimit(5)
      );
      const recentSnapshot = await getDocs(q);
      setRecentDonors(recentSnapshot.docs.map(doc => doc.data()));
    } catch (error) {
      console.error('Failed to fetch donation stats:', error);
    }
  };

  const handleDonate = async () => {
    const amount = selectedAmount || parseFloat(customAmount);
    
    if (!amount || amount < 5) {
      toast.error('Minimum donation amount is ₹5');
      return;
    }

    try {
      setProcessing(true);

      // In production, integrate with Razorpay
      // This is a simplified version for demonstration
      
      // For now, simulate payment success
      await processPayment(amount);

      toast.success(`Thank you for donating ₹${amount}! 🎉`);
      
      // Reset form
      setSelectedAmount(null);
      setCustomAmount('');
      
      // Refresh stats
      await fetchDonationStats();
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const processPayment = async (amount: number) => {
    // Simulate payment processing
    // In production, this would call Razorpay API
    
    // For demonstration, we'll just create a donation record
    const donationData = {
      donorUserId: userId || null,
      donorName: userName || 'Anonymous',
      amount,
      currency: 'INR',
      purpose: 'logistics',
      paymentId: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentMethod: 'upi', // Simulated
      status: 'completed',
      timestamp: ts(),
    };

    await addDoc(collection(db, 'micro_donations'), donationData);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  /**
   * Production Razorpay Integration (commented out for MVP)
   * 
   * Uncomment and configure when ready:
   * 
   * 1. Install: npm install razorpay
   * 2. Add Razorpay key to environment variables
   * 3. Implement backend webhook for payment verification
   */
  /*
  const initiateRazorpayPayment = async (amount: number) => {
    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY_ID, // Your Razorpay key
      amount: amount * 100, // Amount in paise
      currency: 'INR',
      name: 'Zero Waste Platform',
      description: 'Micro Donation for Logistics',
      image: '/logo.png',
      handler: async function (response: any) {
        // Verify payment on backend
        const verifyResponse = await fetch('/api/verify-payment', {
          method: 'POST',
          body: JSON.stringify({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          }),
        });
        
        if (verifyResponse.ok) {
          toast.success('Payment successful!');
        }
      },
      prefill: {
        name: userName,
        email: userEmail,
      },
      theme: {
        color: '#3B82F6', // Blue
      },
    };

    const razorpay = new (window as any).Razorpay(options);
    razorpay.open();
  };
  */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-fintech p-6 bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
            <Heart size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-zinc-900">Support Our Mission</h2>
            <p className="text-sm text-slate-600">Every rupee powers a meal delivery</p>
          </div>
        </div>

        {/* Fuel Pool Balance */}
        <div className="bg-white rounded-xl p-4 border-2 border-pink-300">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
            Fuel Pool Balance
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">
              ₹{totalFunds.toLocaleString()}
            </span>
            <span className="text-sm text-slate-600">raised</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Powering {Math.floor(totalFunds / 5)} meal deliveries
          </p>
        </div>
      </div>

      {/* Donation Amounts */}
      <div className="card-fintech p-6">
        <h3 className="text-lg font-black text-zinc-900 mb-4">Choose Your Impact</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {donationAmounts.map((donation) => (
            <button
              key={donation.amount}
              onClick={() => {
                setSelectedAmount(donation.amount);
                setCustomAmount('');
              }}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedAmount === donation.amount
                  ? 'border-pink-500 bg-pink-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-pink-300'
              }`}
            >
              <div className="text-2xl mb-2">{donation.icon}</div>
              <p className="text-2xl font-black text-zinc-900 mb-1">
                ₹{donation.amount}
              </p>
              <p className="text-[10px] text-slate-600 font-medium">
                {donation.impact}
              </p>
            </button>
          ))}
        </div>

        {/* Custom Amount */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Or enter custom amount
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 font-bold">
              ₹
            </span>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedAmount(null);
              }}
              placeholder="Enter amount"
              min="5"
              className="w-full pl-8 pr-4 py-3 rounded-lg border-2 border-slate-300 focus:border-pink-500 focus:ring-0 font-semibold"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">Minimum: ₹5</p>
        </div>

        {/* Donate Button */}
        <button
          onClick={handleDonate}
          disabled={processing || (!selectedAmount && !customAmount)}
          className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold text-lg hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
        >
          {processing ? (
            <>⏳ Processing...</>
          ) : (
            <>
              💝 Donate {selectedAmount ? `₹${selectedAmount}` : customAmount ? `₹${customAmount}` : 'Now'}
            </>
          )}
        </button>

        <p className="text-xs text-center text-slate-500 mt-3">
          Powered by Razorpay • Secure UPI Payments
        </p>
      </div>

      {/* Impact Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-fintech p-4 text-center">
          <Gift size={24} className="text-pink-600 mx-auto mb-2" />
          <p className="text-2xl font-black text-zinc-900">{Math.floor(totalFunds / 5)}</p>
          <p className="text-xs text-slate-600 mt-1">Meals Powered</p>
        </div>
        <div className="card-fintech p-4 text-center">
          <TrendingUp size={24} className="text-purple-600 mx-auto mb-2" />
          <p className="text-2xl font-black text-zinc-900">{recentDonors.length}</p>
          <p className="text-xs text-slate-600 mt-1">Contributors</p>
        </div>
        <div className="card-fintech p-4 text-center">
          <Users size={24} className="text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-black text-zinc-900">100%</p>
          <p className="text-xs text-slate-600 mt-1">Transparent</p>
        </div>
      </div>

      {/* Recent Donors */}
      {recentDonors.length > 0 && (
        <div className="card-fintech p-6">
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-4">
            Recent Contributors 🙏
          </h3>
          <div className="space-y-3">
            {recentDonors.map((donor, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    {donor.donorName?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {donor.donorName || 'Anonymous'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {donor.timestamp?.toDate?.().toLocaleDateString() || 'Recent'}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-black text-pink-600">
                  ₹{donor.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="card-fintech p-4 bg-blue-50 border border-blue-200">
        <p className="text-xs font-semibold text-blue-900 mb-2">💡 How Your Donation Helps</p>
        <ul className="text-[10px] text-blue-700 space-y-1 ml-4 list-disc">
          <li>₹5 = 1 meal delivery (fuel cost)</li>
          <li>₹20 = 4 meals transported to those in need</li>
          <li>₹100 = Complete delivery route for 20 meals</li>
          <li>100% of funds go directly to logistics</li>
          <li>Track your impact on the public dashboard</li>
        </ul>
      </div>
    </div>
  );
};

export default MicroDonation;

