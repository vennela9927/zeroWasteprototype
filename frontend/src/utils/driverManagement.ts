import { db, ts } from '../lib/firebase';
import { collection, doc, setDoc, updateDoc, getDoc, getDocs, query, where, orderBy } from 'firebase/firestore';

/**
 * Driver Management System
 * 
 * Features:
 * - Driver registration & profiles
 * - Availability tracking
 * - Assignment algorithm (nearest driver)
 * - Route optimization
 * - Performance metrics
 */

export interface Driver {
  driverId: string;
  name: string;
  email: string;
  phone: string;
  vehicleType: 'bike' | 'car' | 'van';
  vehicleNumber?: string;
  currentLocation?: {
    lat: number;
    lng: number;
    lastUpdated: any;
  };
  availability: 'available' | 'on_delivery' | 'offline';
  assignedNGO?: string; // If driver is NGO staff
  rating: number; // 0-5
  completedDeliveries: number;
  cancelledDeliveries: number;
  totalDistanceTraveled: number; // km
  joinedAt: any;
  lastActive: any;
  isVerified: boolean;
}

export interface DeliveryTask {
  taskId: string;
  foodItemId: string;
  donorId: string;
  donorName?: string;
  ngoId: string;
  ngoName?: string;
  driverId: string;
  driverName?: string;
  pickupLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  dropoffLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  status: 'assigned' | 'en_route_pickup' | 'picked_up' | 'en_route_delivery' | 'delivered' | 'cancelled';
  assignedAt: any;
  pickedUpAt?: any;
  deliveredAt?: any;
  cancelledAt?: any;
  distanceKm: number;
  estimatedTimeMinutes: number;
  actualTimeMinutes?: number;
  route?: any; // Google Maps route data
}

const DRIVERS_COLLECTION = 'drivers';
const DELIVERY_TASKS_COLLECTION = 'delivery_tasks';

/**
 * Register a new driver
 */
export async function registerDriver(data: {
  userId: string;
  name: string;
  email: string;
  phone: string;
  vehicleType: Driver['vehicleType'];
  vehicleNumber?: string;
  assignedNGO?: string;
}): Promise<Driver> {
  const driver: Driver = {
    driverId: data.userId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    vehicleType: data.vehicleType,
    vehicleNumber: data.vehicleNumber,
    availability: 'offline',
    assignedNGO: data.assignedNGO,
    rating: 5.0,
    completedDeliveries: 0,
    cancelledDeliveries: 0,
    totalDistanceTraveled: 0,
    joinedAt: ts(),
    lastActive: ts(),
    isVerified: false,
  };

  await setDoc(doc(db, DRIVERS_COLLECTION, driver.driverId), driver);
  return driver;
}

/**
 * Update driver availability
 */
export async function updateDriverAvailability(
  driverId: string,
  availability: Driver['availability']
): Promise<void> {
  await updateDoc(doc(db, DRIVERS_COLLECTION, driverId), {
    availability,
    lastActive: ts(),
  });
}

/**
 * Update driver location (for GPS tracking)
 */
export async function updateDriverLocation(
  driverId: string,
  lat: number,
  lng: number
): Promise<void> {
  await updateDoc(doc(db, DRIVERS_COLLECTION, driverId), {
    currentLocation: {
      lat,
      lng,
      lastUpdated: ts(),
    },
    lastActive: ts(),
  });
}

/**
 * Calculate distance using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find nearest available driver
 */
export async function findNearestDriver(
  pickupLat: number,
  pickupLng: number,
  preferredNGO?: string
): Promise<Driver | null> {
  try {
    // Query available drivers
    const q = query(
      collection(db, DRIVERS_COLLECTION),
      where('availability', '==', 'available'),
      where('isVerified', '==', true)
    );

    const snapshot = await getDocs(q);
    const availableDrivers = snapshot.docs.map(doc => doc.data() as Driver);

    if (availableDrivers.length === 0) {
      return null;
    }

    // Filter by NGO if specified
    let candidateDrivers = availableDrivers;
    if (preferredNGO) {
      const ngoDrivers = availableDrivers.filter(d => d.assignedNGO === preferredNGO);
      if (ngoDrivers.length > 0) {
        candidateDrivers = ngoDrivers;
      }
    }

    // Find nearest driver
    let nearestDriver: Driver | null = null;
    let minDistance = Infinity;

    for (const driver of candidateDrivers) {
      if (!driver.currentLocation) continue;

      const distance = calculateDistance(
        pickupLat,
        pickupLng,
        driver.currentLocation.lat,
        driver.currentLocation.lng
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestDriver = driver;
      }
    }

    return nearestDriver;
  } catch (error) {
    console.error('Failed to find nearest driver:', error);
    return null;
  }
}

/**
 * Assign delivery task to driver
 */
export async function assignDeliveryTask(data: {
  foodItemId: string;
  donorId: string;
  donorName?: string;
  ngoId: string;
  ngoName?: string;
  pickupLocation: { lat: number; lng: number; address: string };
  dropoffLocation: { lat: number; lng: number; address: string };
}): Promise<DeliveryTask | null> {
  try {
    // Find nearest driver
    const driver = await findNearestDriver(
      data.pickupLocation.lat,
      data.pickupLocation.lng,
      data.ngoId
    );

    if (!driver) {
      console.error('No available drivers found');
      return null;
    }

    // Calculate route distance
    const distanceKm = calculateDistance(
      data.pickupLocation.lat,
      data.pickupLocation.lng,
      data.dropoffLocation.lat,
      data.dropoffLocation.lng
    );

    // Estimate delivery time (average 30 km/h)
    const estimatedTimeMinutes = Math.ceil((distanceKm / 30) * 60);

    // Create delivery task
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const task: DeliveryTask = {
      taskId,
      foodItemId: data.foodItemId,
      donorId: data.donorId,
      donorName: data.donorName,
      ngoId: data.ngoId,
      ngoName: data.ngoName,
      driverId: driver.driverId,
      driverName: driver.name,
      pickupLocation: data.pickupLocation,
      dropoffLocation: data.dropoffLocation,
      status: 'assigned',
      assignedAt: ts(),
      distanceKm,
      estimatedTimeMinutes,
    };

    // Save task
    await setDoc(doc(db, DELIVERY_TASKS_COLLECTION, taskId), task);

    // Update driver status
    await updateDriverAvailability(driver.driverId, 'on_delivery');

    return task;
  } catch (error) {
    console.error('Failed to assign delivery task:', error);
    return null;
  }
}

/**
 * Update delivery task status
 */
export async function updateDeliveryStatus(
  taskId: string,
  status: DeliveryTask['status']
): Promise<void> {
  const updates: any = { status };

  if (status === 'picked_up') {
    updates.pickedUpAt = ts();
  } else if (status === 'delivered') {
    updates.deliveredAt = ts();

    // Calculate actual time
    const taskDoc = await getDoc(doc(db, DELIVERY_TASKS_COLLECTION, taskId));
    if (taskDoc.exists()) {
      const taskData = taskDoc.data() as DeliveryTask;
      const assignedTime = taskData.assignedAt?.toDate?.();
      const deliveredTime = new Date();
      if (assignedTime) {
        const actualTimeMinutes = Math.ceil(
          (deliveredTime.getTime() - assignedTime.getTime()) / (1000 * 60)
        );
        updates.actualTimeMinutes = actualTimeMinutes;
      }

      // Update driver stats
      await updateDoc(doc(db, DRIVERS_COLLECTION, taskData.driverId), {
        completedDeliveries: (await getDoc(doc(db, DRIVERS_COLLECTION, taskData.driverId))).data()?.completedDeliveries + 1 || 1,
        totalDistanceTraveled: (await getDoc(doc(db, DRIVERS_COLLECTION, taskData.driverId))).data()?.totalDistanceTraveled + taskData.distanceKm || taskData.distanceKm,
        availability: 'available',
      });
    }
  } else if (status === 'cancelled') {
    updates.cancelledAt = ts();

    // Update driver stats and availability
    const taskDoc = await getDoc(doc(db, DELIVERY_TASKS_COLLECTION, taskId));
    if (taskDoc.exists()) {
      const taskData = taskDoc.data() as DeliveryTask;
      await updateDoc(doc(db, DRIVERS_COLLECTION, taskData.driverId), {
        cancelledDeliveries: (await getDoc(doc(db, DRIVERS_COLLECTION, taskData.driverId))).data()?.cancelledDeliveries + 1 || 1,
        availability: 'available',
      });
    }
  }

  await updateDoc(doc(db, DELIVERY_TASKS_COLLECTION, taskId), updates);
}

/**
 * Get driver's active tasks
 */
export async function getDriverTasks(driverId: string): Promise<DeliveryTask[]> {
  try {
    const q = query(
      collection(db, DELIVERY_TASKS_COLLECTION),
      where('driverId', '==', driverId),
      where('status', 'in', ['assigned', 'en_route_pickup', 'picked_up', 'en_route_delivery']),
      orderBy('assignedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as DeliveryTask);
  } catch (error) {
    console.error('Failed to get driver tasks:', error);
    return [];
  }
}

/**
 * Get all available drivers
 */
export async function getAvailableDrivers(): Promise<Driver[]> {
  try {
    const q = query(
      collection(db, DRIVERS_COLLECTION),
      where('availability', '==', 'available'),
      where('isVerified', '==', true)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Driver);
  } catch (error) {
    console.error('Failed to get available drivers:', error);
    return [];
  }
}

/**
 * Get driver performance metrics
 */
export async function getDriverMetrics(driverId: string): Promise<{
  totalDeliveries: number;
  successRate: number;
  avgRating: number;
  totalDistance: number;
  avgDeliveryTime: number;
} | null> {
  try {
    const driverDoc = await getDoc(doc(db, DRIVERS_COLLECTION, driverId));
    if (!driverDoc.exists()) return null;

    const driver = driverDoc.data() as Driver;

    // Get completed tasks for avg delivery time
    const q = query(
      collection(db, DELIVERY_TASKS_COLLECTION),
      where('driverId', '==', driverId),
      where('status', '==', 'delivered')
    );

    const snapshot = await getDocs(q);
    const completedTasks = snapshot.docs.map(doc => doc.data() as DeliveryTask);

    const avgDeliveryTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, task) => sum + (task.actualTimeMinutes || 0), 0) / completedTasks.length
      : 0;

    const totalDeliveries = driver.completedDeliveries + driver.cancelledDeliveries;
    const successRate = totalDeliveries > 0
      ? (driver.completedDeliveries / totalDeliveries) * 100
      : 100;

    return {
      totalDeliveries: driver.completedDeliveries,
      successRate,
      avgRating: driver.rating,
      totalDistance: driver.totalDistanceTraveled,
      avgDeliveryTime,
    };
  } catch (error) {
    console.error('Failed to get driver metrics:', error);
    return null;
  }
}

