import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface ChartData {
  date: string;
  donations: number;
}

interface AIInsightsChartProps {
  data: ChartData[];
  noAI?: boolean;
}

const AIInsightsChart: React.FC<AIInsightsChartProps> = ({ data, noAI = false }) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-zinc-900">Donation Insights</h3>
        <TrendingUp size={20} className="text-blue-700" />
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              stroke="#64748b"
              fontSize={12}
              fontWeight="600"
            />
            <YAxis 
              stroke="#64748b"
              fontSize={12}
              fontWeight="600"
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Line 
              type="monotone" 
              dataKey="donations" 
              stroke="url(#gradient)"
              strokeWidth={3}
              dot={{ fill: '#1d4ed8', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#1d4ed8' }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1d4ed8" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {!noAI && (
        <div className="mt-4 p-4 bg-blue-50 rounded-xl">
          <p className="text-sm font-medium text-blue-800">
            <span className="font-bold">AI Insight:</span> Your donation frequency peaks on weekends. 
            Consider scheduling regular donations for maximum impact.
          </p>
        </div>
      )}
    </div>
  );
};

export default AIInsightsChart;