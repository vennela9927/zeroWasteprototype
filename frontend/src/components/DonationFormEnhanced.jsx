import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Calendar, Package, AlertCircle, Loader2, CheckCircle, Clock, Upload, Image as ImageIcon, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFoodListings } from '../hooks/useFoodListings';
import { toast } from 'react-toastify';
import { loadGoogleMapsAPI } from '../lib/loadGoogleMaps';
import { differenceInHours } from 'date-fns';

// Form validation schema
const donationSchema = z.object({
  foodName: z.string().min(2, 'Food name must be at least 2 characters'),
  foodType: z.enum(['veg', 'non_veg', 'cooked', 'raw', 'packaged'], {
    errorMap: () => ({ message: 'Please select a food type' })
  }),
  quantity: z.number().min(0.1, 'Quantity must be at least 0.1'),
  quantityUnit: z.enum(['kg', 'meals', 'portions', 'pieces', 'boxes', 'liters'], {
    errorMap: () => ({ message: 'Please select quantity unit' })
  }),
  preparedDate: z.string().min(1, 'Preparation date is required'),
  preparedTime: z.string().min(1, 'Preparation time is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  expiryTime: z.string().min(1, 'Expiry time is required'),
  location: z.string().min(3, 'Location is required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  imageUrl: z.string().optional(),
  notes: z.string().optional(),
});

const DonationFormEnhanced = ({ onSuccess }) => {
  const { profile, user } = useAuth();
  const { addListing } = useFoodListings('donor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showAadhaarVerification, setShowAadhaarVerification] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const locationInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const fileInputRef = useRef(null);

  // Debug logging
  useEffect(() => {
    console.log('[DonationForm] Auth state:', { user: !!user, profile: !!profile, userId: user?.uid });
  }, [user, profile]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      foodType: 'veg',
      quantityUnit: 'kg',
      quantity: 1,
      preparedDate: new Date().toISOString().split('T')[0],
      preparedTime: new Date().toTimeString().slice(0, 5),
    }
  });

  // Watch current values
  const currentLocation = watch('location');
  const currentLat = watch('latitude');
  const currentLng = watch('longitude');
  const preparedDate = watch('preparedDate');
  const preparedTime = watch('preparedTime');
  const expiryDate = watch('expiryDate');
  const expiryTime = watch('expiryTime');

  // Initialize Google Places Autocomplete
  useEffect(() => {
    const initAutocomplete = async () => {
      try {
        // Load Google Maps API
        await loadGoogleMapsAPI();

        if (locationInputRef.current && !autocompleteRef.current) {
          const autocomplete = new window.google.maps.places.Autocomplete(
            locationInputRef.current,
            {
              types: ['geocode', 'establishment'],
              componentRestrictions: { country: 'in' }, // Restrict to India
            }
          );

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            
            if (!place.geometry || !place.geometry.location) {
              toast.error('No location details available for this place');
              return;
            }

            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const address = place.formatted_address || place.name || '';

            setValue('location', address);
            setValue('latitude', lat);
            setValue('longitude', lng);

            toast.success('Location selected successfully');
          });

          autocompleteRef.current = autocomplete;
        }
      } catch (error) {
        console.warn('Google Maps autocomplete not available:', error.message);
        // Autocomplete will be disabled, but manual input still works
      }
    };

    initAutocomplete();
  }, [setValue]);

  // Auto-detect current location
  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setValue('latitude', lat);
        setValue('longitude', lng);

        // Try to reverse geocode to get address (if Google Maps API is available)
        try {
          await loadGoogleMapsAPI();
          
          if (window.google?.maps?.Geocoder) {
            const geocoder = new window.google.maps.Geocoder();
            const latlng = { lat, lng };

            geocoder.geocode({ location: latlng }, (results, status) => {
              if (status === 'OK' && results[0]) {
                setValue('location', results[0].formatted_address);
                toast.success('Current location detected');
              } else {
                setValue('location', `${lat}, ${lng}`);
                toast.info('Location coordinates captured');
              }
              setIsGettingLocation(false);
            });
          } else {
            setValue('location', `${lat}, ${lng}`);
            toast.info('Location coordinates captured');
            setIsGettingLocation(false);
          }
        } catch (error) {
          // Fallback to coordinates if geocoding fails
          setValue('location', `${lat}, ${lng}`);
          toast.info('Location coordinates captured');
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Unable to retrieve your location. Please enter manually.');
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Calculate freshness and urgency metrics
  const calculateFreshnessMetrics = () => {
    if (!preparedDate || !preparedTime || !expiryDate || !expiryTime) {
      return null;
    }

    const preparedDateTime = new Date(`${preparedDate}T${preparedTime}`);
    const expiryDateTime = new Date(`${expiryDate}T${expiryTime}`);
    const now = new Date();

    const totalShelfLife = expiryDateTime - preparedDateTime;
    const timeRemaining = expiryDateTime - now;
    const hoursToExpiry = differenceInHours(expiryDateTime, now);
    
    const freshnessPercent = Math.max(0, Math.min(100, (timeRemaining / totalShelfLife) * 100));

    let urgencyLevel = 'normal';
    let urgencyColor = 'green';
    let urgencyText = '✓ Normal';
    
    if (hoursToExpiry <= 2) {
      urgencyLevel = 'critical';
      urgencyColor = 'red';
      urgencyText = '🔥 Critical (<2h)';
    } else if (hoursToExpiry <= 6) {
      urgencyLevel = 'urgent';
      urgencyColor = 'orange';
      urgencyText = '⚡ Urgent (<6h)';
    } else if (hoursToExpiry <= 24) {
      urgencyLevel = 'medium';
      urgencyColor = 'yellow';
      urgencyText = '⏰ Medium (<24h)';
    }

    return {
      hoursToExpiry,
      freshnessPercent: Math.round(freshnessPercent),
      urgencyLevel,
      urgencyColor,
      urgencyText,
    };
  };

  const metrics = calculateFreshnessMetrics();

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setValue('imageUrl', reader.result);
      };
      reader.readAsDataURL(file);
      
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Check if first-time donor (placeholder logic)
  const isFirstTimeDonor = () => {
    // TODO: Check from backend if user has made donations before
    // For now, check if profile has aadhaarVerified field
    return !profile?.aadhaarVerified;
  };

  // Handle form submission
  const onSubmit = async (data) => {
    console.log('[DonationForm] Submitting:', data);

    // Check if first-time donor needs Aadhaar verification
    if (isFirstTimeDonor()) {
      console.log('[DonationForm] Aadhaar not verified - blocking submission');
      setShowAadhaarVerification(true);
      toast.error('Aadhaar verification required before submitting a donation.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine date and time into ISO format
      const preparedDateTime = new Date(`${data.preparedDate}T${data.preparedTime}`);
      const expiryDateTime = new Date(`${data.expiryDate}T${data.expiryTime}`);
      
      // Validate times
      if (preparedDateTime >= expiryDateTime) {
        toast.error('Expiry time must be after preparation time');
        setIsSubmitting(false);
        return;
      }

      if (expiryDateTime <= new Date()) {
        toast.error('Expiry date/time must be in the future');
        setIsSubmitting(false);
        return;
      }

      // Prepare payload for backend (matching AddListingInput interface)
      const payload = {
        name: data.foodName,
        foodType: data.foodType,
        quantity: data.quantity,
        quantityUnit: data.quantityUnit,
        preparedTime: preparedDateTime.toISOString(),
        expiry: expiryDateTime.toISOString(),
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        imageUrl: data.imageUrl || '',
        description: data.notes || '',
      };

      console.log('[DonationForm] Submitting payload:', payload);

      // Submit to Firebase (via useFoodListings hook)
      await addListing(payload);
      
      console.log('[DonationForm] Submission successful!');

      toast.success('Donation submitted successfully! 🎉');
      
      // Reset form
      reset();
      
      // Trigger AI matching (optional callback)
      if (onSuccess) {
        onSuccess(payload);
      }

      // TODO: Call backend API for AI matching
      // triggerAIMatching(payload);

    } catch (error) {
      console.error('[DonationForm] Submission error:', error);
      toast.error(error.message || 'Failed to submit donation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-2">
          <Package className="text-blue-700" size={28} />
          Register New Donation
        </h2>
        <p className="text-sm text-slate-600 mt-2">
          Fill in the details below to donate surplus food to NGOs in need.
        </p>
      </div>

      {/* Aadhaar Verification Notice (First-time donors) */}
      {showAadhaarVerification && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
            <div>
              <h4 className="font-semibold text-yellow-900">Aadhaar Verification Required</h4>
              <p className="text-sm text-yellow-800 mt-1">
                As a first-time donor, please complete Aadhaar verification to ensure authenticity.
              </p>
              <button
                onClick={() => { try { window.location.href = '/verify-aadhaar'; } catch { setShowAadhaarVerification(false); } }}
                className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-semibold hover:bg-yellow-700 transition"
              >
                Go to Aadhaar Verification
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Food Name */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Food Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register('foodName')}
            type="text"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="e.g., Vegetable Biryani, Fresh Bread, etc."
          />
          {errors.foodName && (
            <p className="text-red-500 text-xs mt-1 font-medium">{errors.foodName.message}</p>
          )}
        </div>

        {/* Food Type */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Food Type <span className="text-red-500">*</span>
          </label>
          <select
            {...register('foodType')}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
          >
            <option value="veg">🥗 Vegetarian</option>
            <option value="non_veg">🍗 Non-Vegetarian</option>
            <option value="cooked">🍳 Cooked</option>
            <option value="raw">🥕 Raw</option>
            <option value="packaged">📦 Packaged</option>
          </select>
          {errors.foodType && (
            <p className="text-red-500 text-xs mt-1 font-medium">{errors.foodType.message}</p>
          )}
        </div>

        {/* Quantity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              {...register('quantity', { valueAsNumber: true })}
              type="number"
              step="0.1"
              min="0.1"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="0.0"
            />
            {errors.quantity && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.quantity.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Unit <span className="text-red-500">*</span>
            </label>
            <select
              {...register('quantityUnit')}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
            >
              <option value="kg">Kilograms (kg)</option>
              <option value="meals">Meals</option>
              <option value="portions">Portions</option>
              <option value="pieces">Pieces</option>
              <option value="boxes">Boxes</option>
              <option value="liters">Liters</option>
            </select>
          </div>
        </div>

        {/* Prepared Date & Time */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
            <Clock size={16} />
            When was this food prepared?
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Prepared Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  {...register('preparedDate')}
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <Calendar className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={20} />
              </div>
              {errors.preparedDate && (
                <p className="text-red-500 text-xs mt-1 font-medium">{errors.preparedDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Prepared Time <span className="text-red-500">*</span>
              </label>
              <input
                {...register('preparedTime')}
                type="time"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              {errors.preparedTime && (
                <p className="text-red-500 text-xs mt-1 font-medium">{errors.preparedTime.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Expiry Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Expiry Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                {...register('expiryDate')}
                type="date"
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <Calendar className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={20} />
            </div>
            {errors.expiryDate && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.expiryDate.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Expiry Time <span className="text-red-500">*</span>
            </label>
            <input
              {...register('expiryTime')}
              type="time"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            {errors.expiryTime && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.expiryTime.message}</p>
            )}
          </div>
        </div>

        {/* Freshness & Urgency Indicator */}
        {metrics && (
          <div className={`rounded-lg p-4 border-2 ${
            metrics.urgencyColor === 'red' ? 'bg-red-50 border-red-300' :
            metrics.urgencyColor === 'orange' ? 'bg-orange-50 border-orange-300' :
            metrics.urgencyColor === 'yellow' ? 'bg-yellow-50 border-yellow-300' :
            'bg-green-50 border-green-300'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock size={18} className={`${
                  metrics.urgencyColor === 'red' ? 'text-red-700' :
                  metrics.urgencyColor === 'orange' ? 'text-orange-700' :
                  metrics.urgencyColor === 'yellow' ? 'text-yellow-700' :
                  'text-green-700'
                }`} />
                <span className="font-bold text-sm">Freshness & Urgency</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                metrics.urgencyColor === 'red' ? 'bg-red-100 text-red-800' :
                metrics.urgencyColor === 'orange' ? 'bg-orange-100 text-orange-800' :
                metrics.urgencyColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {metrics.urgencyText}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-600 mb-1">Time to Expiry</p>
                <p className="font-bold">{metrics.hoursToExpiry} hours</p>
              </div>
              <div>
                <p className="text-slate-600 mb-1">Freshness</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        metrics.freshnessPercent > 70 ? 'bg-green-500' :
                        metrics.freshnessPercent > 40 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${metrics.freshnessPercent}%` }}
                    />
                  </div>
                  <span className="font-bold text-xs">{metrics.freshnessPercent}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Food Image Upload */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Food Image (Optional)
          </label>
          <div className="mt-2">
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Food preview"
                  className="w-full h-48 object-cover rounded-lg border-2 border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setValue('imageUrl', '');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {uploadingImage ? (
                    <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                  ) : (
                    <ImageIcon className="text-slate-400 mb-2" size={32} />
                  )}
                  <p className="mb-2 text-sm text-slate-600 font-semibold">
                    {uploadingImage ? 'Uploading...' : 'Click to upload food image'}
                  </p>
                  <p className="text-xs text-slate-500">PNG, JPG, JPEG (max 5MB)</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
              </label>
            )}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Pickup Location <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              {...register('location')}
              ref={locationInputRef}
              type="text"
              className="w-full px-4 py-3 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Start typing your address..."
            />
            <MapPin className="absolute left-3 top-3 text-slate-400" size={20} />
          </div>
          {errors.location && (
            <p className="text-red-500 text-xs mt-1 font-medium">{errors.location.message}</p>
          )}

          {/* Location Actions */}
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={isGettingLocation}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGettingLocation ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Detecting...
                </>
              ) : (
                <>
                  <MapPin size={16} />
                  Use My Location
                </>
              )}
            </button>

            {/* Coordinates Display */}
            {(currentLat && currentLng) && (
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                <CheckCircle className="text-green-600" size={14} />
                <span>Lat: {currentLat.toFixed(6)}, Lng: {currentLng.toFixed(6)}</span>
              </div>
            )}
          </div>

          {/* Manual Coordinate Input (Hidden by default) */}
          <details className="mt-3">
            <summary className="text-xs text-blue-600 cursor-pointer font-semibold">
              Advanced: Enter coordinates manually
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <input
                {...register('latitude', { valueAsNumber: true })}
                type="number"
                step="any"
                placeholder="Latitude"
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <input
                {...register('longitude', { valueAsNumber: true })}
                type="number"
                step="any"
                placeholder="Longitude"
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </details>
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Special Notes (Optional)
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
            placeholder="e.g., Requires cold storage, allergen information, etc."
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-blue-700 to-cyan-500 text-white rounded-xl font-bold text-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Submitting...
              </>
            ) : (
              <>
                <Package size={20} />
                Submit Donation
              </>
            )}
          </button>
        </div>
      </form>

      {/* Info Section */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2 text-sm">What happens next?</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✅ AI matches your donation to nearby NGOs</li>
          <li>✅ NGOs are notified and can request pickup</li>
          <li>✅ You approve the request and coordinate delivery</li>
          <li>✅ Earn reward points or generate CSR certificate</li>
        </ul>
      </div>
    </div>
  );
};

export default DonationFormEnhanced;

