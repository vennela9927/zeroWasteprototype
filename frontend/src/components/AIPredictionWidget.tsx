import React from 'react';
import { Brain, Clock, MapPin } from 'lucide-react';

interface AIPredictionWidgetProps {
  prediction: {
    time: string;
    location: string;
    confidence: number;
  };
}

const AIPredictionWidget: React.FC<AIPredictionWidgetProps> = ({ prediction }) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-black text-zinc-900">AI Prediction</h3>
        <Brain size={20} className="text-blue-700" />
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
          <div className="flex items-center space-x-2 mb-2">
            <Clock size={16} className="text-blue-700" />
            <span className="font-bold text-blue-900">Next Likely Donation</span>
          </div>
          <p className="text-blue-800 font-medium">{prediction.time}</p>
        </div>

        <div className="flex items-center space-x-2 text-slate-600">
          <MapPin size={16} />
          <span className="text-sm font-medium">{prediction.location}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">Confidence</span>
          <div className="flex items-center space-x-2">
            <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-700 to-cyan-500 rounded-full"
                style={{ width: `${prediction.confidence}%` }}
              ></div>
            </div>
            <span className="text-sm font-bold text-zinc-900">{prediction.confidence}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPredictionWidget;