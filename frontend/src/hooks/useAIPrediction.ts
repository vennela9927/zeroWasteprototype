import { useMemo } from 'react';
import type { FoodListing } from './useFoodListings';

interface PredictionResult {
  time: string;
  location: string;
  confidence: number;
}

export function useAIPrediction(listings: FoodListing[]): PredictionResult | null {
  return useMemo(() => {
    if (!listings || listings.length === 0) return null;

    // Bucket by hour (createdAt not provided in typed interface, so fallback random / expiry hour)
    const hourCounts: Record<string, number> = {};
    listings.forEach(l => {
      const date = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(l.expiry || Date.now());
      const hour = date.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const entries = Object.entries(hourCounts);
    if (entries.length === 0) return null;
    entries.sort((a,b)=>b[1]-a[1]);
    const [topHour, topCount] = entries[0];
    const max = topCount;
    const confidence = Math.min(95, Math.round((topCount / max) * 90 + 5));
    const h = parseInt(topHour, 10);
    const window = `${String(h).padStart(2,'0')}:00-${String((h+1)%24).padStart(2,'0')}:00`;
    return {
      time: window,
      location: 'Local Area',
      confidence
    };
  }, [listings]);
}