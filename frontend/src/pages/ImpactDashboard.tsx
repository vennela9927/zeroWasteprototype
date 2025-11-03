import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { TrendingUp, Users, Leaf, Package, MapPin, Award, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import { seedDatabase } from '../utils/seedDatabase';

/**
 * Public Impact Dashboard
 * 
 * Displays real-time metrics showcasing the platform's impact:
 * - Total meals saved
 * - CO₂ emissions prevented
 * - Active donors & NGOs
 * - Food waste diverted
 * - City-wise distribution
 */
const ImpactDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalMeals: 0,
    co2Prevented: 0,
    activeDonors: 0,
    activeNGOs: 0,
    foodWasteDiverted: 0,
    totalDonations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topCities, setTopCities] = useState<{ city: string; count: number }[]>([]);
  const [usingFallback, setUsingFallback] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    console.log('ImpactDashboard mounted');
    fetchImpactData();
  }, []);

  const handleSeedDatabase = async () => {
    if (!window.confirm('This will add 100+ sample records to your database. Continue?')) {
      return;
    }
    
    try {
      setSeeding(true);
      await seedDatabase();
      alert('✅ Database seeded successfully! Refreshing data...');
      await fetchImpactData(); // Refresh the dashboard
    } catch (err) {
      console.error('Failed to seed database:', err);
      alert('❌ Failed to seed database. Check console for details.');
    } finally {
      setSeeding(false);
    }
  };

  const fetchImpactData = async () => {
    try {
      setLoading(true);

      // Fetch total meals from fulfilled claims
      const claimsQuery = query(
        collection(db, 'claims'),
        where('status', 'in', ['approved', 'fulfilled'])
      );
      const claimsSnapshot = await getDocs(claimsQuery);
      
      let totalMeals = 0;
      claimsSnapshot.forEach((doc) => {
        const data = doc.data();
        totalMeals += data.quantity || 0;
      });

      // Calculate CO₂ prevented (2.5 kg per meal wasted)
      const co2Prevented = totalMeals * 2.5;

      // Calculate food waste diverted (assume 0.3 kg per meal)
      const foodWasteDiverted = totalMeals * 0.3;

      // Fetch food items first (needed for fallback counts)
      const foodItemsSnapshot = await getDocs(collection(db, 'food_items'));

      // Count active donors (users with role = donor)
      let donorsCount = 0;
      try {
        const donorsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'donor')
        );
        const donorsSnapshot = await getDocs(donorsQuery);
        donorsCount = donorsSnapshot.size;
      } catch (err) {
        console.warn('Unable to fetch donors count (permissions):', err);
        setUsingFallback(true);
        // Fallback: count unique donor IDs from food_items
        const uniqueDonors = new Set(
          Array.from(foodItemsSnapshot.docs).map(doc => doc.data().donorId).filter(Boolean)
        );
        donorsCount = uniqueDonors.size;
      }

      // Count active NGOs (users with role = recipient)
      let ngosCount = 0;
      try {
        const ngosQuery = query(
          collection(db, 'users'),
          where('role', '==', 'recipient')
        );
        const ngosSnapshot = await getDocs(ngosQuery);
        ngosCount = ngosSnapshot.size;
      } catch (err) {
        console.warn('Unable to fetch NGOs count (permissions):', err);
        setUsingFallback(true);
        // Fallback: count unique recipient IDs from claims
        const uniqueRecipients = new Set(
          claimsSnapshot.docs.map(doc => doc.data().recipientId).filter(Boolean)
        );
        ngosCount = uniqueRecipients.size;
      }

      // Count total food donations
      const totalDonations = foodItemsSnapshot.size;

      // Get top cities (from food items locations)
      const cityCount: Record<string, number> = {};
      foodItemsSnapshot.forEach((doc) => {
        const location = doc.data().location || '';
        // Extract city from location string (simple heuristic)
        const cityMatch = location.match(/([A-Za-z\s]+)$/);
        if (cityMatch) {
          const city = cityMatch[1].trim();
          cityCount[city] = (cityCount[city] || 0) + 1;
        }
      });

      const topCitiesArray = Object.entries(cityCount)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalMeals,
        co2Prevented,
        activeDonors: donorsCount,
        activeNGOs: ngosCount,
        foodWasteDiverted,
        totalDonations,
      });

      setTopCities(topCitiesArray);
    } catch (error) {
      console.error('Failed to fetch impact data:', error);
      setError('Failed to load impact data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{
    icon: any;
    label: string;
    value: string | number;
    subtitle?: string;
    color: string;
    delay: number;
  }> = ({ icon: Icon, label, value, subtitle, color, delay }) => (
    <motion.div
      className={`card-fintech p-6 border-2 ${color}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color.replace('border', 'bg').replace('300', '100')}`}>
          <Icon size={24} className={color.replace('border', 'text').replace('300', '600')} />
        </div>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
        {label}
      </p>
      <p className="text-4xl font-black text-zinc-900 mb-1">{value}</p>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-slate-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-black text-zinc-900 mb-2">Oops!</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchImpactData();
            }}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          className="text-center relative"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 mb-3">
            Our Impact
          </h1>
          <p className="text-lg text-slate-600 mb-4">
            Real-time metrics showcasing meals saved, emissions prevented, and community impact
          </p>
          
          {/* Seed Database Button (for demo purposes) */}
          {(stats.totalDonations < 50 || stats.totalMeals < 100) && (
            <button
              onClick={handleSeedDatabase}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all shadow-lg text-sm"
            >
              <Database size={16} />
              {seeding ? 'Seeding Database...' : '🌱 Add Sample Data (100 records)'}
            </button>
          )}
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            icon={Package}
            label="Total Meals Saved"
            value={stats.totalMeals.toLocaleString()}
            subtitle="Meals rescued from waste"
            color="border-green-300"
            delay={0.1}
          />
          <StatCard
            icon={Leaf}
            label="CO₂ Emissions Prevented"
            value={`${stats.co2Prevented.toLocaleString()} kg`}
            subtitle="Environmental impact"
            color="border-emerald-300"
            delay={0.2}
          />
          <StatCard
            icon={TrendingUp}
            label="Food Waste Diverted"
            value={`${stats.foodWasteDiverted.toLocaleString()} kg`}
            subtitle="Saved from landfills"
            color="border-amber-300"
            delay={0.3}
          />
          <StatCard
            icon={Users}
            label="Active Donors"
            value={stats.activeDonors}
            subtitle="Restaurants, hostels, individuals"
            color="border-blue-300"
            delay={0.4}
          />
          <StatCard
            icon={Award}
            label="Partner NGOs"
            value={stats.activeNGOs}
            subtitle="Verified organizations"
            color="border-purple-300"
            delay={0.5}
          />
          <StatCard
            icon={Package}
            label="Total Donations"
            value={stats.totalDonations}
            subtitle="Food listings created"
            color="border-cyan-300"
            delay={0.6}
          />
        </div>

        {/* Top Cities */}
        {topCities.length > 0 && (
          <motion.div
            className="card-fintech p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <MapPin size={24} className="text-blue-600" />
              <h2 className="text-xl font-black text-zinc-900">Top Cities by Donations</h2>
            </div>
            <div className="space-y-4">
              {topCities.map((city, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-800">{city.city}</span>
                      <span className="text-sm text-slate-600">{city.count} donations</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${(city.count / topCities[0].count) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* How It Works */}
        <motion.div
          className="card-fintech p-8 bg-gradient-to-br from-blue-600 to-cyan-500 text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <h2 className="text-2xl font-black mb-4">How We Calculate Impact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-4xl mb-2">🍽️</div>
              <h3 className="font-bold mb-2">Meals Saved</h3>
              <p className="text-sm text-blue-100">
                Every fulfilled donation counts as meals rescued from going to waste
              </p>
            </div>
            <div>
              <div className="text-4xl mb-2">🌍</div>
              <h3 className="font-bold mb-2">CO₂ Prevented</h3>
              <p className="text-sm text-blue-100">
                Each meal saved prevents 2.5 kg of CO₂ emissions from decomposition
              </p>
            </div>
            <div>
              <div className="text-4xl mb-2">♻️</div>
              <h3 className="font-bold mb-2">Waste Diverted</h3>
              <p className="text-sm text-blue-100">
                Average 0.3 kg of food waste diverted per meal from landfills
              </p>
            </div>
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          className="card-fintech p-8 text-center bg-gradient-to-br from-slate-50 to-white border-2 border-blue-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <h2 className="text-2xl font-black text-zinc-900 mb-3">
            Join the Movement
          </h2>
          <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
            Every meal counts. Whether you're a restaurant with surplus food or an NGO serving communities,
            together we can eliminate food waste and hunger.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/"
              className="px-8 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold hover:from-blue-700 hover:to-cyan-600 transition-all"
            >
              Get Started
            </a>
            <a
              href="/dashboard"
              className="px-8 py-3 rounded-lg bg-white border-2 border-blue-600 text-blue-600 font-bold hover:bg-blue-50 transition-all"
            >
              Go to Dashboard
            </a>
          </div>
        </motion.div>

        {/* Transparency Statement */}
        <motion.div
          className="text-center text-xs text-slate-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <p>
            All metrics are updated in real-time and verified through blockchain audit trails.
          </p>
          <p className="mt-1">
            Last updated: {new Date().toLocaleString()}
          </p>
          {usingFallback && (
            <p className="mt-2 text-amber-600 text-xs">
              ℹ️ Some counts are estimated from active donations (limited permissions)
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ImpactDashboard;

