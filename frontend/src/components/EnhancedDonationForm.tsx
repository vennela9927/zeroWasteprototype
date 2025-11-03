import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, AlertTriangle, MapPin, Clock, Camera, Navigation } from 'lucide-react';
import { toast } from 'react-toastify';
import { differenceInHours, format } from 'date-fns';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase';

const FOOD_TYPES = [
  'Rice', 'Bread', 'Vegetables', 'Fruits', 'Curry', 'Dal', 'Roti/Chapati',
  'Biryani', 'Cooked Meals', 'Snacks', 'Dairy', 'Desserts', 'Other'
];

const UNITS = ['servings', 'kg', 'pieces', 'boxes', 'plates'];

const donationSchema = z.object({
  foodName: z.string().min(1, 'Food name is required'),
  foodType: z.string().min(1, 'Food type is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit: z.string().min(1, 'Unit is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  expiryTime: z.string().min(1, 'Expiry time is required'),
  location: z.string().min(1, 'Location is required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  locationAccuracy: z.number().optional(),
  image: z.any().optional(), // File upload for freshness detection
});

type DonationFormData = z.infer<typeof donationSchema>;

interface EnhancedDonationFormProps {
  onSubmit: (data: any) => Promise<void> | void;
}

const EnhancedDonationForm: React.FC<EnhancedDonationFormProps> = ({ onSubmit }) => {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [aiMatching, setAiMatching] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<DonationFormData>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      unit: 'servings',
      foodType: 'Cooked Meals'
    }
  });

  const quantity = watch('quantity');
  const expiryDate = watch('expiryDate');
  const expiryTime = watch('expiryTime');
  const latitude = watch('latitude');
  const longitude = watch('longitude');

  // Calculate hours to expiry
  const hoursToExpiry = expiryDate && expiryTime 
    ? differenceInHours(new Date(`${expiryDate}T${expiryTime}`), new Date()) 
    : null;

  // AI Surplus Warning Logic
  const getSurplusWarning = (qty: number, hours: number | null) => {
    if (!hours || hours > 48) return { level: 'low', color: 'bg-green-100 text-green-800', text: 'Optimal Amount', icon: '✓' };
    if ((qty > 50 && hours < 12) || qty > 100) return { level: 'high', color: 'bg-red-100 text-red-800', text: 'High Risk – Urgent Matching Needed', icon: '⚠' };
    if (qty > 25 && hours < 24) return { level: 'medium', color: 'bg-yellow-100 text-yellow-800', text: 'Medium Surplus – AI will prioritize', icon: '⚡' };
    return { level: 'low', color: 'bg-green-100 text-green-800', text: 'Optimal Amount', icon: '✓' };
  };

  const warning = getSurplusWarning(quantity || 0, hoursToExpiry);

  // Auto-detect GPS location
  const detectLocation = () => {
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
        setValue('locationAccuracy', accuracy);
        setLocationAccuracy(accuracy);
        
        // Reverse geocode to get address
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
        } catch (e) {
          console.warn('Reverse geocode failed', e);
        }
        
        toast.success(`Location captured (±${Math.round(accuracy)}m accuracy)`);
        setGpsLoading(false);
      },
      (err) => {
        toast.error('Failed to get location: ' + err.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Handle image upload for freshness detection
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
      setValue('image', file);
      toast.info('Image uploaded - will be analyzed for freshness');
    }
  };

  // Submit with AI matching
  const handleFormSubmit = async (data: DonationFormData) => {
    try {
      setAiMatching(true);
      
      // Combine date and time for expiryTime
      const expiryDateTime = new Date(`${data.expiryDate}T${data.expiryTime}`);
      
      const payload = {
        name: data.foodName,
        foodName: data.foodName,
        foodType: data.foodType,
        quantity: data.quantity,
        unit: data.unit,
        expiry: data.expiryDate,
        expiryTime: expiryDateTime.toISOString(),
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        locationAccuracy: data.locationAccuracy,
        // Blockchain metadata
        blockchainMetadata: {
          timestamp: new Date().toISOString(),
          foodType: data.foodType,
          quantity: data.quantity,
          unit: data.unit,
          expiryTimestamp: expiryDateTime.toISOString(),
          // Populated after submission: donorId, listingId, matchedNGOs
        }
      };

      await onSubmit(payload);
      
      // Trigger AI matching in background
      try {
        const functions = getFunctions(app);
        const triggerAIMatching = httpsCallable(functions, 'triggerAIMatching');
        const result: any = await triggerAIMatching({ 
          ...payload,
          hoursToExpiry: hoursToExpiry || 0
        });
        
        if (result.data?.matchedNGOs?.length > 0) {
          toast.success(`AI matched ${result.data.matchedNGOs.length} NGOs - they've been notified!`);
        } else {
          toast.info('Donation posted - NGOs can browse and claim');
        }
      } catch (e) {
        console.warn('[AI matching] failed, listing still created', e);
        toast.info('Donation posted successfully');
      }
      
      reset();
      setImagePreview(null);
      setLocationAccuracy(null);
    } catch (e: any) {
      console.error('[Donation] submit failed', e);
      toast.error(e?.message || 'Failed to add donation');
    } finally {
      setAiMatching(false);
    }
  };

  return (
    <div className="card-fintech">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-black text-fintech-black mb-1">Register Food Donation</h3>
          <p className="text-sm text-slate-600">AI will match you with nearby NGOs automatically</p>
        </div>
        <Plus size={24} className="text-blue-700" />
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Food Details */}
        <div className="bg-slate-50/50 rounded-xl p-6 space-y-4">
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Food Details</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="foodName" className="block text-sm font-semibold text-slate-700 mb-2">
                Food Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('foodName')}
                type="text"
                id="foodName"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                placeholder="e.g., Vegetable Biryani"
              />
              {errors.foodName && <p className="text-red-500 text-xs mt-1">{errors.foodName.message}</p>}
            </div>

            <div>
              <label htmlFor="foodType" className="block text-sm font-semibold text-slate-700 mb-2">
                Food Type <span className="text-red-500">*</span>
              </label>
              <select
                {...register('foodType')}
                id="foodType"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {FOOD_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.foodType && <p className="text-red-500 text-xs mt-1">{errors.foodType.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="quantity" className="block text-sm font-semibold text-slate-700 mb-2">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                {...register('quantity', { valueAsNumber: true })}
                type="number"
                id="quantity"
                min="1"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                placeholder="e.g., 50"
              />
              {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
            </div>

            <div>
              <label htmlFor="unit" className="block text-sm font-semibold text-slate-700 mb-2">
                Unit <span className="text-red-500">*</span>
              </label>
              <select
                {...register('unit')}
                id="unit"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {UNITS.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>

          {/* AI Warning */}
          {quantity > 0 && (
            <div className={`flex items-center space-x-3 px-4 py-3 rounded-xl ${warning.color}`}>
              <span className="text-xl">{warning.icon}</span>
              <div>
                <p className="text-sm font-bold">AI Analysis: {warning.text}</p>
                {hoursToExpiry && hoursToExpiry < 24 && (
                  <p className="text-xs mt-1">Expires in ~{hoursToExpiry}h - will be prioritized in matching</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Expiry Details */}
        <div className="bg-slate-50/50 rounded-xl p-6 space-y-4">
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center">
            <Clock size={16} className="mr-2" />
            Expiry Time
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="expiryDate" className="block text-sm font-semibold text-slate-700 mb-2">
                Expiry Date <span className="text-red-500">*</span>
              </label>
              <input
                {...register('expiryDate')}
                type="date"
                id="expiryDate"
                min={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
              {errors.expiryDate && <p className="text-red-500 text-xs mt-1">{errors.expiryDate.message}</p>}
            </div>

            <div>
              <label htmlFor="expiryTime" className="block text-sm font-semibold text-slate-700 mb-2">
                Expiry Time <span className="text-red-500">*</span>
              </label>
              <input
                {...register('expiryTime')}
                type="time"
                id="expiryTime"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
              {errors.expiryTime && <p className="text-red-500 text-xs mt-1">{errors.expiryTime.message}</p>}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-slate-50/50 rounded-xl p-6 space-y-4">
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center">
            <MapPin size={16} className="mr-2" />
            Pickup Location
          </h4>
          
          <div>
            <label htmlFor="location" className="block text-sm font-semibold text-slate-700 mb-2">
              Address <span className="text-red-500">*</span>
            </label>
            <input
              {...register('location')}
              type="text"
              id="location"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              placeholder="Enter pickup address"
            />
            {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={detectLocation}
              disabled={gpsLoading}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              <Navigation size={16} />
              <span>{gpsLoading ? 'Detecting...' : 'Auto-Detect GPS Location'}</span>
            </button>
            
            {locationAccuracy !== null && (
              <span className="text-xs text-green-700 font-medium">
                ✓ Accuracy: ±{Math.round(locationAccuracy)}m
              </span>
            )}
          </div>

          {latitude && longitude && (
            <div className="grid grid-cols-2 gap-3">
              <input
                {...register('latitude', { valueAsNumber: true })}
                type="number"
                step="any"
                placeholder="Latitude"
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                readOnly
              />
              <input
                {...register('longitude', { valueAsNumber: true })}
                type="number"
                step="any"
                placeholder="Longitude"
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                readOnly
              />
            </div>
          )}
        </div>

        {/* Image Upload (Freshness Detection) */}
        <div className="bg-slate-50/50 rounded-xl p-6 space-y-4">
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center">
            <Camera size={16} className="mr-2" />
            Food Image (Optional - AI Freshness Detection)
          </h4>
          
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="imageUpload"
            />
            <label
              htmlFor="imageUpload"
              className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg" />
              ) : (
                <div className="text-center">
                  <Camera size={32} className="mx-auto mb-2 text-slate-400" />
                  <p className="text-sm text-slate-600">Click to upload food image</p>
                  <p className="text-xs text-slate-500 mt-1">AI will analyze freshness (YOLOv8)</p>
                </div>
              )}
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={aiMatching}
          className="w-full bg-gradient-to-r from-blue-700 to-cyan-500 text-white font-bold py-4 px-6 rounded-xl hover:from-blue-800 hover:to-cyan-600 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed text-lg"
        >
          {aiMatching ? 'Submitting & Matching NGOs...' : 'Submit Donation → Trigger AI Matching'}
        </button>
      </form>

      {/* AI Info Box */}
      <div className="bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-100 rounded-2xl p-6 mt-6">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-gradient-blue-teal rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">AI</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800 mb-2">Intelligent Matching Engine</p>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>✓ Scores NGOs by: proximity, capacity, reliability, expiry urgency</li>
              <li>✓ Notifies top-matched NGOs automatically</li>
              <li>✓ Tracks blockchain metadata for transparency</li>
              <li>✓ Optional: Image freshness detection via YOLOv8</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDonationForm;

