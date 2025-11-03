// Helper to dynamically load Google Maps API
// This ensures the API is only loaded when needed and with the correct API key

let isLoading = false;
let isLoaded = false;

export const loadGoogleMapsAPI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (isLoaded || window.google?.maps?.places) {
      resolve();
      return;
    }

    // Check if currently loading
    if (isLoading) {
      // Wait for existing load to complete
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkInterval);
          isLoaded = true;
          resolve();
        }
      }, 100);
      return;
    }

    isLoading = true;

    // Get API key from environment or use placeholder
    // TODO: Add your Google Maps API key to .env.local as VITE_GOOGLE_MAPS_API_KEY
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

    if (!apiKey) {
      console.warn('Google Maps API key not configured. Location autocomplete will be disabled.');
      isLoading = false;
      reject(new Error('Google Maps API key not configured'));
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      isLoaded = true;
      isLoading = false;
      console.log('[Google Maps] API loaded successfully');
      resolve();
    };

    script.onerror = (error) => {
      isLoading = false;
      console.error('[Google Maps] Failed to load API:', error);
      reject(error);
    };

    document.head.appendChild(script);
  });
};

// Type declarations for Google Maps
declare global {
  interface Window {
    google?: {
      maps?: {
        places?: any;
        Geocoder?: any;
        LatLng?: any;
      };
    };
  }
}



