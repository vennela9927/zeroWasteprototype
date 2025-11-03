import React, { useState, useEffect } from 'react';
import { Thermometer, Droplet, Activity, AlertCircle } from 'lucide-react';
import { calculateFreshnessScore, getFreshnessColor, FreshnessData } from '../utils/freshnessAI';

interface FreshnessIndicatorProps {
  foodType: string;
  preparedTime?: any;
  expiryTime?: any;
  temperature?: number;
  humidity?: number;
  showDetails?: boolean;
}

/**
 * Freshness Indicator Component
 * 
 * Displays AI-powered freshness score with visual indicators
 */
export const FreshnessIndicator: React.FC<FreshnessIndicatorProps> = ({
  foodType,
  preparedTime,
  expiryTime,
  temperature,
  humidity,
  showDetails = false,
}) => {
  const [freshnessData, setFreshnessData] = useState<FreshnessData | null>(null);

  useEffect(() => {
    const data = calculateFreshnessScore({
      foodType,
      preparedTime,
      expiryTime,
      temperature,
      humidity,
    });
    setFreshnessData(data);

    // Update every minute
    const interval = setInterval(() => {
      const updatedData = calculateFreshnessScore({
        foodType,
        preparedTime,
        expiryTime,
        temperature,
        humidity,
      });
      setFreshnessData(updatedData);
    }, 60000);

    return () => clearInterval(interval);
  }, [foodType, preparedTime, expiryTime, temperature, humidity]);

  if (!freshnessData) {
    return <div className="text-xs text-slate-500">Calculating freshness...</div>;
  }

  const colors = getFreshnessColor(freshnessData.freshnessScore);

  const getLevelEmoji = (level: FreshnessData['freshnessLevel']) => {
    const emojis = {
      excellent: '✨',
      good: '👍',
      fair: '⚠️',
      poor: '⏰',
      expired: '🚫',
    };
    return emojis[level];
  };

  if (!showDetails) {
    // Compact view
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border ${colors.bg} ${colors.text} ${colors.border}`}>
        <Activity size={12} />
        <span className="text-xs font-bold">{freshnessData.freshnessScore}% Fresh</span>
        <span>{getLevelEmoji(freshnessData.freshnessLevel)}</span>
      </div>
    );
  }

  // Detailed view
  return (
    <div className={`p-4 rounded-xl border-2 ${colors.bg} ${colors.border}`}>
      {/* Score Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={20} className={colors.text} />
          <h4 className={`font-bold ${colors.text}`}>Freshness Score</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-black text-zinc-900">
            {freshnessData.freshnessScore}
          </span>
          <span className="text-xl">{getLevelEmoji(freshnessData.freshnessLevel)}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
            freshnessData.freshnessScore >= 80 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
            freshnessData.freshnessScore >= 60 ? 'bg-gradient-to-r from-blue-400 to-cyan-500' :
            freshnessData.freshnessScore >= 40 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
            'bg-gradient-to-r from-orange-400 to-red-500'
          }`}
          style={{ width: `${freshnessData.freshnessScore}%` }}
        />
      </div>

      {/* Safety Status */}
      <div className={`px-3 py-2 rounded-lg mb-3 ${
        freshnessData.safetyStatus === 'safe' ? 'bg-green-100 border border-green-300' :
        freshnessData.safetyStatus === 'caution' ? 'bg-yellow-100 border border-yellow-300' :
        'bg-red-100 border border-red-300'
      }`}>
        <p className={`text-xs font-bold ${
          freshnessData.safetyStatus === 'safe' ? 'text-green-800' :
          freshnessData.safetyStatus === 'caution' ? 'text-yellow-800' :
          'text-red-800'
        }`}>
          {freshnessData.safetyStatus === 'safe' ? '✅ Safe to consume' :
           freshnessData.safetyStatus === 'caution' ? '⚠️ Consume soon' :
           '🚫 Not recommended'}
        </p>
      </div>

      {/* Environmental Conditions */}
      {(temperature !== undefined || humidity !== undefined) && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {temperature !== undefined && (
            <div className="flex items-center gap-2 bg-white bg-opacity-50 rounded-lg p-2">
              <Thermometer size={14} className={colors.text} />
              <div>
                <p className="text-[10px] font-semibold text-slate-600">Temp</p>
                <p className="text-sm font-black text-zinc-900">{temperature.toFixed(1)}°C</p>
              </div>
            </div>
          )}
          {humidity !== undefined && (
            <div className="flex items-center gap-2 bg-white bg-opacity-50 rounded-lg p-2">
              <Droplet size={14} className={colors.text} />
              <div>
                <p className="text-[10px] font-semibold text-slate-600">Humidity</p>
                <p className="text-sm font-black text-zinc-900">{humidity.toFixed(0)}%</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {freshnessData.recommendations.length > 0 && (
        <div className="space-y-1">
          {freshnessData.recommendations.slice(0, 2).map((rec, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <AlertCircle size={12} className={colors.text + ' flex-shrink-0 mt-0.5'} />
              <p className="text-[10px] text-slate-700 font-medium">{rec}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FreshnessIndicator;

