import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigation, MapPin, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { format, differenceInHours } from 'date-fns';

const FOOD_CATEGORIES = ['Veg', 'Non-Veg', 'Cooked', 'Raw', 'Packaged'];
const UNITS = ['kg', 'meals', 'portions', 'pieces', 'boxes'];

const donationSchema = z.object({
  foodName: z.string().min(1, 'Food name required'),
  foodCategory: z.enum(['Veg', 'Non-Veg', 'Cooked', 'Raw', 'Packaged']),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit: z.string().min(1, 'Unit required'),
  expiryDateTime: z.string().min(1, 'Expiry date & time required'),
  location: z.string().min(1, 'Location required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  specialNotes: z.string().optional(),
});

type DonationFormData = z.infer<typeof donationSchema>;

interface RefinedDonationFormProps {
  onSubmit: (data: any) => Promise<void>;
}

const RefinedDonationForm: React.FC<RefinedDonationFormProps> = ({ onSubmit }) => {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<DonationFormData>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      foodCategory: 'Cooked',
      unit: 'meals'
    }
  });

  const expiryDateTime = watch('expiryDateTime');
  const quantity = watch('quantity');
  
  const hoursToExpiry = expiryDateTime 
    ? differenceInHours(new Date(expiryDateTime), new Date())
    : null;

  // Auto-detect GPS
  const detectGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setValue('latitude', latitude);
        setValue('longitude', longitude);
        setLocationAccuracy(accuracy);
        
        // Reverse geocode
        try {
          const apiKey = (import.meta as any)?.env?.VITE_GOOGLE_MAPS_API_KEY;
          if (apiKey) {
            const res = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
            );
            const data = await res.json();
            if (data.results?.[0]?.formatted_address) {
              setValue('location', data.results[0].formatted_address);
            }
          }
        } catch {}
        
        toast.success(`Location captured (±${Math.round(accuracy)}m)`);
        setGpsLoading(false);
      },
      () => {
        toast.error('Failed to get location');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFormSubmit = async (data: DonationFormData) => {
    try {
      const expiryDate = new Date(data.expiryDateTime);
      
      await onSubmit({
        name: data.foodName,
        foodName: data.foodName,
        foodType: data.foodCategory,
        foodCategory: data.foodCategory,
        quantity: data.quantity,
        unit: data.unit,
        expiry: format(expiryDate, 'yyyy-MM-dd'),
        expiryTime: expiryDate.toISOString(),
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        specialNotes: data.specialNotes,
        locationAccuracy
      });
      
      reset();
      setLocationAccuracy(null);
      toast.success('Donation submitted successfully!');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to submit donation');
    }
  };

  const getUrgencyBadge = () => {
    if (!hoursToExpiry) return null;
    if (hoursToExpiry <= 2) return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">🔥 Urgent (&lt;2h)</span>;
    if (hoursToExpiry <= 6) return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">⚡ High Priority (&lt;6h)</span>;
    if (hoursToExpiry <= 24) return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">⏰ Medium (&lt;24h)</span>;
    return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">✓ Normal</span>;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h3 className="text-xl font-bold text-zinc-900 mb-6">Register Food Donation</h3>
      
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Food Name */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Food Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register('foodName')}
            type="text"
            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Vegetable Biryani"
          />
          {errors.foodName && <p className="text-red-500 text-xs mt-1">{errors.foodName.message}</p>}
        </div>

        {/* Food Category */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Food Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {FOOD_CATEGORIES.map(cat => (
              <label key={cat} className="cursor-pointer">
                <input
                  {...register('foodCategory')}
                  type="radio"
                  value={cat}
                  className="peer sr-only"
                />
                <div className="px-3 py-2 border-2 rounded-lg text-center text-sm font-medium transition peer-checked:border-blue-700 peer-checked:bg-blue-50 peer-checked:text-blue-700 border-slate-200 text-slate-600 hover:border-slate-300">
                  {cat}
                </div>
              </label>
            ))}
          </div>
          {errors.foodCategory && <p className="text-red-500 text-xs mt-1">{errors.foodCategory.message}</p>}
        </div>

        {/* Quantity + Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              {...register('quantity', { valueAsNumber: true })}
              type="number"
              min="1"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 50"
            />
            {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Unit <span className="text-red-500">*</span>
            </label>
            <select
              {...register('unit')}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* Expiry DateTime */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Expiry Date & Time <span className="text-red-500">*</span>
          </label>
          <input
            {...register('expiryDateTime')}
            type="datetime-local"
            min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {errors.expiryDateTime && <p className="text-red-500 text-xs mt-1">{errors.expiryDateTime.message}</p>}
          {hoursToExpiry !== null && (
            <div className="mt-2 flex items-center space-x-2">
              <Clock size={16} className="text-slate-500" />
              <span className="text-xs text-slate-600">Expires in ~{hoursToExpiry}h</span>
              {getUrgencyBadge()}
            </div>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Pickup Location <span className="text-red-500">*</span>
          </label>
          <input
            {...register('location')}
            type="text"
            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter address"
          />
          {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
          
          <button
            type="button"
            onClick={detectGPS}
            disabled={gpsLoading}
            className="mt-2 flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            <Navigation size={16} />
            <span>{gpsLoading ? 'Detecting...' : 'Auto-Detect GPS'}</span>
          </button>
          
          {locationAccuracy !== null && (
            <p className="text-xs text-green-700 mt-2">✓ GPS captured (±{Math.round(locationAccuracy)}m accuracy)</p>
          )}
        </div>

        {/* Special Notes */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Special Notes (Optional)
          </label>
          <textarea
            {...register('specialNotes')}
            rows={3}
            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="e.g., Requires cold storage, Halal certified, etc."
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-700 to-cyan-500 text-white font-bold py-4 rounded-lg hover:from-blue-800 hover:to-cyan-600 transition-all"
        >
          Submit Donation → Trigger AI Matching
        </button>
      </form>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle size={20} className="text-blue-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">What happens next?</p>
            <ul className="text-xs space-y-1 text-blue-800">
              <li>✓ AI matches you with nearby NGOs</li>
              <li>✓ Top NGOs are notified automatically</li>
              <li>✓ Track pickup status in real-time</li>
              <li>✓ Earn rewards points after delivery</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefinedDonationForm;



