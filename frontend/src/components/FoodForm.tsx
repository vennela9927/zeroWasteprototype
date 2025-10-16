import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';
import { differenceInHours } from 'date-fns';

const foodSchema = z.object({
  name: z.string().min(1, 'Food name is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  expiry: z.string().min(1, 'Expiry date is required'),
  location: z.string().min(1, 'Location is required'),
});

type FoodFormData = z.infer<typeof foodSchema>;

interface FoodFormProps {
  onSubmit: (data: FoodFormData) => Promise<void> | void;
}

const FoodForm: React.FC<FoodFormProps> = ({ onSubmit }) => {
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<FoodFormData>({
    resolver: zodResolver(foodSchema),
  });

  const quantity = watch('quantity');
  const expiry = watch('expiry');
  const hoursToExpiry = expiry ? differenceInHours(new Date(expiry), new Date()) : null;
  
  // AI Surplus Warning Logic (enhanced with expiry)
  const getSurplusWarning = (qty: number, hours: number | null) => {
    if (!hours || hours > 48) return { level: 'low', color: 'bg-green-100 text-green-800', text: 'Optimal Amount' };
    if ((qty > 50 && hours < 12) || qty > 100) return { level: 'high', color: 'bg-red-100 text-red-800', text: 'High Risk – Surplus Likely' };
    if (qty > 25 && hours < 24) return { level: 'medium', color: 'bg-yellow-100 text-yellow-800', text: 'Medium Surplus' };
    return { level: 'low', color: 'bg-green-100 text-green-800', text: 'Optimal Amount' };
  };

  const handleFormSubmit = async (data: FoodFormData) => {
    try {
      await onSubmit(data);
      toast.success('Food listing added successfully!');
      reset();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('[FoodForm] submit failed', e);
      toast.error(e?.message || 'Failed to add listing');
    }
  };

  const warning = getSurplusWarning(quantity || 0, hoursToExpiry);

  return (
    <div className="card-fintech">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-black text-fintech-black mb-1">Add Food Donation</h3>
          <p className="text-sm text-slate-600">List your surplus food with AI-powered surplus detection</p>
        </div>
        <Plus size={20} className="text-blue-700" />
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-3">
              Food Name
            </label>
            <input
              {...register('name')}
              type="text"
              id="name"
              className="w-full px-4 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-slate-50/50"
              placeholder="e.g., Fresh vegetables, Bread"
            />
            {errors.name && <p className="text-red-500 text-sm mt-2 font-medium">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-semibold text-slate-700 mb-3">
              Quantity (servings)
            </label>
            <input
              {...register('quantity', { valueAsNumber: true })}
              type="number"
              id="quantity"
              className="w-full px-4 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-slate-50/50"
              placeholder="Number of servings"
            />
            {errors.quantity && <p className="text-red-500 text-sm mt-2 font-medium">{errors.quantity.message}</p>}
            
            {quantity > 0 && (
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold mt-3 ${
                warning.level === 'high' ? 'badge-pink' : 
                warning.level === 'medium' ? 'badge-yellow' : 'badge-green'
              }`}>
                <AlertTriangle size={14} className="mr-2" />
                AI: {warning.text}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="expiry" className="block text-sm font-semibold text-slate-700 mb-3">
              Expiry Date
            </label>
            <input
              {...register('expiry')}
              type="date"
              id="expiry"
              className="w-full px-4 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-slate-50/50"
            />
            {errors.expiry && <p className="text-red-500 text-sm mt-2 font-medium">{errors.expiry.message}</p>}
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-semibold text-slate-700 mb-3">
              Pickup Location
            </label>
            <input
              {...register('location')}
              type="text"
              id="location"
              className="w-full px-4 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-slate-50/50"
              placeholder="Address or area"
            />
            {errors.location && <p className="text-red-500 text-sm mt-2 font-medium">{errors.location.message}</p>}
          </div>
        </div>

        <button
          type="submit"
          className="w-full btn-fintech py-4 text-lg"
        >
          Add Food Donation
        </button>
      </form>

      {/* AI Optimal Donation Time Suggestion */}
      <div className="bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-100 rounded-2xl p-6 mt-6">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-gradient-blue-teal rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">AI</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 mb-1">Smart Timing Suggestion</p>
            <p className="text-sm text-slate-600">
              Most NGOs are active between 7–9 PM. Posting now increases pickup speed by 40%.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoodForm;