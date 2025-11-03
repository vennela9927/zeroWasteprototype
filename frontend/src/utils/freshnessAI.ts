import { Timestamp } from 'firebase/firestore';

/**
 * AI/IoT Freshness Prediction System
 * 
 * Features:
 * - Time-based freshness decay model
 * - Food type-specific shelf life
 * - Temperature-adjusted predictions (IoT sensor integration ready)
 * - AI image analysis (TensorFlow.js ready)
 * - Automatic expiry adjustment
 */

export interface FreshnessData {
  foodId: string;
  foodType: string;
  preparedTime: Date;
  currentTime: Date;
  expiryTime: Date;
  temperature?: number; // Celsius (from IoT sensors)
  humidity?: number; // Percentage (from IoT sensors)
  imageAnalysis?: {
    score: number; // 0-100
    confidence: number;
    indicators: string[];
  };
  freshnessScore: number; // 0-100 (100 = very fresh)
  freshnessLevel: 'excellent' | 'good' | 'fair' | 'poor' | 'expired';
  estimatedShelfLifeHours: number;
  safetyStatus: 'safe' | 'caution' | 'unsafe';
  recommendations: string[];
}

/**
 * Food type specific shelf life (in hours at room temperature)
 */
const FOOD_SHELF_LIFE: Record<string, number> = {
  // Cooked food
  'cooked_rice': 4,
  'cooked_curry': 6,
  'cooked_bread': 24,
  'cooked_vegetables': 4,
  'cooked_meat': 2,
  'cooked_fish': 2,
  
  // Raw food
  'raw_vegetables': 48,
  'raw_fruits': 72,
  'raw_meat': 4,
  'raw_fish': 2,
  
  // Packaged
  'packaged_snacks': 168, // 1 week
  'packaged_dry': 720, // 1 month
  
  // Default
  'default': 6,
};

/**
 * Calculate freshness score based on time and conditions
 */
export function calculateFreshnessScore(data: {
  foodType: string;
  preparedTime?: Date | Timestamp;
  expiryTime?: Date | Timestamp;
  temperature?: number;
  humidity?: number;
}): FreshnessData {
  const now = new Date();
  
  // Parse timestamps
  const preparedTime = data.preparedTime instanceof Timestamp 
    ? data.preparedTime.toDate() 
    : data.preparedTime || now;
  
  const expiryTime = data.expiryTime instanceof Timestamp
    ? data.expiryTime.toDate()
    : data.expiryTime || new Date(now.getTime() + 6 * 60 * 60 * 1000); // Default 6 hours

  // Get expected shelf life for food type
  const foodKey = data.foodType.toLowerCase().replace(/\s+/g, '_');
  const baseShelfLife = FOOD_SHELF_LIFE[foodKey] || FOOD_SHELF_LIFE['default'];

  // Calculate time-based freshness
  const totalLifespan = expiryTime.getTime() - preparedTime.getTime();
  const timeElapsed = now.getTime() - preparedTime.getTime();
  const timeRemaining = expiryTime.getTime() - now.getTime();
  
  let freshnessScore = 0;
  
  if (timeRemaining <= 0) {
    // Expired
    freshnessScore = 0;
  } else {
    // Calculate percentage of life remaining
    const lifespanPercent = (timeRemaining / totalLifespan) * 100;
    freshnessScore = Math.max(0, Math.min(100, lifespanPercent));
  }

  // Adjust for temperature (if available)
  if (data.temperature !== undefined) {
    freshnessScore = adjustForTemperature(freshnessScore, data.temperature);
  }

  // Adjust for humidity (if available)
  if (data.humidity !== undefined) {
    freshnessScore = adjustForHumidity(freshnessScore, data.humidity);
  }

  // Determine freshness level
  let freshnessLevel: FreshnessData['freshnessLevel'];
  if (freshnessScore >= 80) freshnessLevel = 'excellent';
  else if (freshnessScore >= 60) freshnessLevel = 'good';
  else if (freshnessScore >= 40) freshnessLevel = 'fair';
  else if (freshnessScore > 0) freshnessLevel = 'poor';
  else freshnessLevel = 'expired';

  // Safety status
  let safetyStatus: FreshnessData['safetyStatus'];
  if (freshnessScore >= 50) safetyStatus = 'safe';
  else if (freshnessScore >= 20) safetyStatus = 'caution';
  else safetyStatus = 'unsafe';

  // Generate recommendations
  const recommendations = generateRecommendations({
    freshnessScore,
    timeRemaining: timeRemaining / (1000 * 60 * 60), // hours
    temperature: data.temperature,
    humidity: data.humidity,
    foodType: data.foodType,
  });

  return {
    foodId: 'temp',
    foodType: data.foodType,
    preparedTime,
    currentTime: now,
    expiryTime,
    temperature: data.temperature,
    humidity: data.humidity,
    freshnessScore: Math.round(freshnessScore),
    freshnessLevel,
    estimatedShelfLifeHours: baseShelfLife,
    safetyStatus,
    recommendations,
  };
}

/**
 * Adjust freshness score based on temperature
 * Higher temperatures accelerate spoilage
 */
function adjustForTemperature(score: number, temperature: number): number {
  if (temperature <= 4) {
    // Refrigerated - extends freshness
    return Math.min(100, score * 1.2);
  } else if (temperature <= 25) {
    // Room temperature - normal
    return score;
  } else if (temperature <= 35) {
    // Warm - accelerates spoilage
    return score * 0.8;
  } else {
    // Hot - rapid spoilage
    return score * 0.5;
  }
}

/**
 * Adjust freshness score based on humidity
 * High humidity can promote bacterial growth
 */
function adjustForHumidity(score: number, humidity: number): number {
  if (humidity <= 40) {
    // Low humidity - good for dry foods
    return score;
  } else if (humidity <= 60) {
    // Normal humidity
    return score;
  } else if (humidity <= 80) {
    // High humidity - slight concern
    return score * 0.95;
  } else {
    // Very high humidity - bacterial growth risk
    return score * 0.85;
  }
}

/**
 * Generate recommendations based on freshness data
 */
function generateRecommendations(data: {
  freshnessScore: number;
  timeRemaining: number;
  temperature?: number;
  humidity?: number;
  foodType: string;
}): string[] {
  const recommendations: string[] = [];

  // Time-based recommendations
  if (data.timeRemaining <= 1) {
    recommendations.push('⚠️ Urgent: Deliver within 1 hour');
  } else if (data.timeRemaining <= 2) {
    recommendations.push('🔔 High priority: Deliver within 2 hours');
  } else if (data.timeRemaining <= 4) {
    recommendations.push('⏰ Moderate priority: Deliver today');
  }

  // Temperature recommendations
  if (data.temperature !== undefined) {
    if (data.temperature > 35) {
      recommendations.push('🌡️ Temperature too high! Refrigerate immediately');
    } else if (data.temperature > 25) {
      recommendations.push('💨 Keep in cool, ventilated area');
    } else if (data.temperature <= 4) {
      recommendations.push('✅ Good: Food is refrigerated');
    }
  }

  // Humidity recommendations
  if (data.humidity !== undefined) {
    if (data.humidity > 80) {
      recommendations.push('💧 High humidity detected - seal packaging');
    }
  }

  // Freshness recommendations
  if (data.freshnessScore >= 80) {
    recommendations.push('✨ Excellent condition - ideal for donation');
  } else if (data.freshnessScore < 40) {
    recommendations.push('⚠️ Declining quality - prioritize immediate pickup');
  }

  // Food type specific
  if (data.foodType.includes('meat') || data.foodType.includes('fish')) {
    recommendations.push('🥩 Perishable protein - handle with care');
  }

  return recommendations;
}

/**
 * Analyze food freshness from image (placeholder for TensorFlow.js integration)
 * 
 * In production, this would use a trained ML model to analyze:
 * - Color changes
 * - Texture
 * - Visible spoilage
 * - Moisture content
 */
export async function analyzeFreshnessFromImage(imageDataUrl: string): Promise<{
  score: number;
  confidence: number;
  indicators: string[];
}> {
  // Placeholder implementation
  // In production, integrate TensorFlow.js:
  /*
  const model = await tf.loadLayersModel('/models/freshness_detector/model.json');
  const image = await loadImage(imageDataUrl);
  const tensor = tf.browser.fromPixels(image).expandDims(0);
  const prediction = model.predict(tensor);
  // Process prediction...
  */

  // For MVP, return simulated analysis
  return {
    score: 75,
    confidence: 0.85,
    indicators: ['Good color', 'Normal texture', 'No visible spoilage'],
  };
}

/**
 * IoT Sensor Integration (MQTT/WebSocket ready)
 * 
 * Connect to IoT sensors for real-time temperature/humidity monitoring
 */
export class FreshnessSensorMonitor {
  private sensorId: string;
  private onUpdate: (data: { temperature: number; humidity: number }) => void;
  private ws: WebSocket | null = null;

  constructor(sensorId: string, onUpdate: (data: { temperature: number; humidity: number }) => void) {
    this.sensorId = sensorId;
    this.onUpdate = onUpdate;
  }

  /**
   * Connect to IoT sensor (WebSocket/MQTT)
   * 
   * In production:
   * 1. Deploy MQTT broker (Mosquitto/AWS IoT)
   * 2. Connect IoT sensors (ESP32/Arduino with DHT22 sensor)
   * 3. Stream data via WebSocket/MQTT to frontend
   */
  connect(): void {
    // Placeholder - would connect to real sensor
    // this.ws = new WebSocket('wss://iot.zerowaste.org/sensors/' + this.sensorId);
    
    // Simulate sensor data updates
    this.simulateSensorData();
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
  }

  private simulateSensorData(): void {
    // Simulate sensor readings every 10 seconds
    setInterval(() => {
      const temperature = 22 + Math.random() * 8; // 22-30°C
      const humidity = 40 + Math.random() * 30; // 40-70%
      this.onUpdate({ temperature, humidity });
    }, 10000);
  }
}

/**
 * Auto-adjust expiry time based on conditions
 */
export function adjustExpiryTime(
  currentExpiry: Date,
  freshnessData: FreshnessData
): Date {
  let adjustment = 0; // hours

  // Adjust based on temperature
  if (freshnessData.temperature !== undefined) {
    if (freshnessData.temperature <= 4) {
      // Refrigerated - extend by 50%
      adjustment += 3;
    } else if (freshnessData.temperature > 35) {
      // Hot - reduce by 50%
      adjustment -= 3;
    }
  }

  // Adjust based on freshness score
  if (freshnessData.freshnessScore < 40) {
    // Declining quality - reduce expiry
    adjustment -= 2;
  }

  const newExpiry = new Date(currentExpiry.getTime() + adjustment * 60 * 60 * 1000);
  return newExpiry;
}

/**
 * Get freshness indicator color for UI
 */
export function getFreshnessColor(score: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (score >= 80) {
    return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' };
  } else if (score >= 60) {
    return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' };
  } else if (score >= 40) {
    return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' };
  } else if (score > 0) {
    return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' };
  } else {
    return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' };
  }
}

