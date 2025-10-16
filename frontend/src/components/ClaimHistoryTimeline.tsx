import React from 'react';
import { Calendar, Package } from 'lucide-react';
import { format } from 'date-fns';

interface ClaimEvent {
  id: string;
  date: string;
  foodName: string;
  quantity: number;
  donor: string;
  status?: string;
}

interface ClaimHistoryTimelineProps {
  claims: ClaimEvent[];
}

const ClaimHistoryTimeline: React.FC<ClaimHistoryTimelineProps> = ({ claims }) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-zinc-900">Claim History</h3>
        <Calendar size={20} className="text-blue-700" />
      </div>

      <div className="space-y-4">
        {claims.map((claim, index) => (
          <div key={claim.id} className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-700 to-cyan-500 rounded-full flex items-center justify-center">
                <Package size={16} className="text-white" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-zinc-900">{claim.foodName}</p>
                  <p className="text-sm text-slate-600">
                    {claim.quantity} servings from {claim.donor}
                  </p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                    {format(new Date(claim.date), 'MMM dd')}
                  </span>
                  {claim.status && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                      claim.status === 'requested' ? 'bg-amber-100 text-amber-800' :
                      claim.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                      claim.status === 'fulfilled' ? 'bg-green-100 text-green-800' :
                      claim.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {claim.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {index < claims.length - 1 && (
              <div className="absolute left-5 mt-10 w-px h-4 bg-slate-200"></div>
            )}
          </div>
        ))}
      </div>

      {claims.length === 0 && (
        <div className="text-center py-8">
          <Package size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">No claims yet</p>
          <p className="text-sm text-slate-400">Start claiming food donations to see your history</p>
        </div>
      )}
    </div>
  );
};

export default ClaimHistoryTimeline;