import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Users, Package, Leaf } from 'lucide-react';

interface HeroCardProps {
  onGetStarted: () => void;
}

const HeroCard: React.FC<HeroCardProps> = ({ onGetStarted }) => {
  const impactStats = [
    { icon: Package, label: 'Meals Saved', value: '5,000+', color: 'pastel-green', bgColor: 'bg-pastel-green/10' },
    { icon: Users, label: 'Active Users', value: '1,200+', color: 'blue-gray', bgColor: 'bg-blue-gray/10' },
    { icon: Heart, label: 'NGOs Helped', value: '150+', color: 'pale-pink', bgColor: 'bg-pale-pink/10' },
    { icon: Leaf, label: 'CO₂ Reduced', value: '2.5T', color: 'soft-yellow', bgColor: 'bg-soft-yellow/10' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="card-fintech max-w-5xl mx-auto"
    >
      <div className="text-center mb-12">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-fintech-huge text-fintech-black mb-6"
        >
          Zero<span className="bg-gradient-blue-teal bg-clip-text text-transparent">Waste</span>
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-xl lg:text-2xl text-slate-600 font-medium mb-10 max-w-3xl mx-auto leading-relaxed"
        >
          AI-powered food redistribution platform connecting donors with NGOs to 
          <strong className="text-fintech-black"> eliminate waste</strong> and 
          <strong className="text-fintech-black"> feed communities</strong>
        </motion.p>
      </div>

      {/* Impact Stats with Fintech Style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
      >
        {impactStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
            className={`text-center p-6 rounded-2xl ${stat.bgColor} border border-slate-100/50 hover:scale-105 transition-all duration-300`}
          >
            <div className="flex items-center justify-center mb-4">
              <div className={`p-3 rounded-2xl bg-white shadow-sm`}>
                <stat.icon size={28} className={`text-${stat.color}`} strokeWidth={2.5} />
              </div>
            </div>
            
            <div className="text-fintech-large text-fintech-black mb-2">
              {stat.value}
            </div>
            <div className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="text-center"
      >
        <button
          onClick={onGetStarted}
          className="btn-fintech text-lg py-4 px-10 mb-4"
        >
          Get Started Today
        </button>
        <p className="text-sm text-slate-500 font-medium">
          Join the movement • No setup fees • Free to use
        </p>
      </motion.div>
    </motion.div>
  );
};

export default HeroCard;
