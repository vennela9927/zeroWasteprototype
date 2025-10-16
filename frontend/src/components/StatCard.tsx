import React from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  isLarge?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  trend, 
  className = '', 
  isLarge = false 
}) => {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-500',
    neutral: 'text-slate-500'
  };

  const trendIcons = {
    up: '↗',
    down: '↘',
    neutral: '→'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card-fintech ${isLarge ? 'lg:col-span-2' : ''} ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          {title}
        </h3>
        {trend && (
          <span className={`text-lg ${trendColors[trend]}`}>
            {trendIcons[trend]}
          </span>
        )}
      </div>
      
      <div className={`${isLarge ? 'text-fintech-huge' : 'text-fintech-large'} text-fintech-black mb-3`}>
        {value}
      </div>
      {subtitle && (
        <p className={`text-sm font-medium ${trend ? trendColors[trend] : 'text-slate-500'}`}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
};

export default StatCard;
