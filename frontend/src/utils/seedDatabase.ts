import { db, ts } from '../lib/firebase';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';

/**
 * Database Seeding Script
 * 
 * Populates Firebase with sample data for demonstration:
 * - 20 donors
 * - 10 NGOs
 * - 100 food donations
 * - 80 claims (60 fulfilled, 20 approved)
 */

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'
];

const FOOD_TYPES = [
  { name: 'Veg Biryani', type: 'cooked_rice', prep: 'cooked' },
  { name: 'Dal Tadka', type: 'cooked_curry', prep: 'cooked' },
  { name: 'Paneer Curry', type: 'cooked_curry', prep: 'cooked' },
  { name: 'Chapati', type: 'cooked_bread', prep: 'cooked' },
  { name: 'Mixed Vegetables', type: 'cooked_vegetables', prep: 'cooked' },
  { name: 'Samosa', type: 'packaged_snacks', prep: 'packaged' },
  { name: 'Fresh Fruits', type: 'raw_fruits', prep: 'raw' },
  { name: 'Bread Loaves', type: 'packaged_snacks', prep: 'packaged' },
  { name: 'Rice Pulao', type: 'cooked_rice', prep: 'cooked' },
  { name: 'Chicken Curry', type: 'cooked_meat', prep: 'cooked' },
];

const DONOR_NAMES = [
  'Taj Hotels', 'ITC Grand', 'Oberoi Restaurant', 'Radisson Blu',
  'Marriott Hotel', 'Hyatt Regency', 'The Leela Palace', 'JW Marriott',
  'Hilton Garden Inn', 'Crowne Plaza', 'Novotel', 'Sheraton',
  'Hotel Sahara Star', 'The Lalit', 'Fortune Hotel', 'Lemon Tree',
  'Ginger Hotel', 'Sarovar Portico', 'Park Plaza', 'Ramada'
];

const NGO_NAMES = [
  'Feeding India', 'Akshaya Patra', 'Food Bank Mumbai', 'Helping Hands Delhi',
  'Annamrita Foundation', 'Robin Hood Army', 'Goonj NGO', 'Smile Foundation',
  'CRY Foundation', 'Save the Children India'
];

/**
 * Generate random date within last 30 days
 */
function randomDate(daysAgo: number = 30): Date {
  const now = new Date();
  const past = new Date(now.getTime() - Math.random() * daysAgo * 24 * 60 * 60 * 1000);
  return past;
}

/**
 * Generate random coordinates for Indian cities
 */
function getCityCoordinates(city: string): { lat: number; lng: number } {
  const coords: Record<string, { lat: number; lng: number }> = {
    'Mumbai': { lat: 19.0760, lng: 72.8777 },
    'Delhi': { lat: 28.7041, lng: 77.1025 },
    'Bangalore': { lat: 12.9716, lng: 77.5946 },
    'Hyderabad': { lat: 17.3850, lng: 78.4867 },
    'Chennai': { lat: 13.0827, lng: 80.2707 },
    'Kolkata': { lat: 22.5726, lng: 88.3639 },
    'Pune': { lat: 18.5204, lng: 73.8567 },
    'Ahmedabad': { lat: 23.0225, lng: 72.5714 },
    'Jaipur': { lat: 26.9124, lng: 75.7873 },
    'Lucknow': { lat: 26.8467, lng: 80.9462 },
  };
  return coords[city] || { lat: 20.5937, lng: 78.9629 };
}

/**
 * Seed database with sample data
 */
export async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // 1. Create sample donors
    console.log('Creating donors...');
    const donorIds: string[] = [];
    for (let i = 0; i < 20; i++) {
      const donorId = `donor_${Date.now()}_${i}`;
      const city = INDIAN_CITIES[i % INDIAN_CITIES.length];
      
      await setDoc(doc(db, 'users', donorId), {
        uid: donorId,
        email: `${DONOR_NAMES[i].toLowerCase().replace(/\s/g, '')}@example.com`,
        name: DONOR_NAMES[i],
        displayName: DONOR_NAMES[i],
        role: 'donor',
        type: 'restaurant',
        city: city,
        createdAt: ts(),
        verified: Math.random() > 0.3, // 70% verified
      });
      
      donorIds.push(donorId);
    }
    console.log(`✅ Created ${donorIds.length} donors`);

    // 2. Create sample NGOs
    console.log('Creating NGOs...');
    const ngoIds: string[] = [];
    for (let i = 0; i < 10; i++) {
      const ngoId = `ngo_${Date.now()}_${i}`;
      const city = INDIAN_CITIES[i % INDIAN_CITIES.length];
      
      await setDoc(doc(db, 'users', ngoId), {
        uid: ngoId,
        email: `${NGO_NAMES[i].toLowerCase().replace(/\s/g, '')}@ngo.org`,
        name: NGO_NAMES[i],
        displayName: NGO_NAMES[i],
        role: 'recipient',
        city: city,
        capacity: Math.floor(Math.random() * 200) + 50, // 50-250 meals
        createdAt: ts(),
        verified: true,
      });
      
      ngoIds.push(ngoId);
    }
    console.log(`✅ Created ${ngoIds.length} NGOs`);

    // 3. Create 100 food donations
    console.log('Creating food donations...');
    const foodIds: string[] = [];
    for (let i = 0; i < 100; i++) {
      const donor = DONOR_NAMES[Math.floor(Math.random() * DONOR_NAMES.length)];
      const donorId = donorIds[Math.floor(Math.random() * donorIds.length)];
      const food = FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)];
      const city = INDIAN_CITIES[Math.floor(Math.random() * INDIAN_CITIES.length)];
      const coords = getCityCoordinates(city);
      
      const createdDate = randomDate(30);
      const expiryDate = new Date(createdDate.getTime() + (Math.random() * 8 + 2) * 60 * 60 * 1000); // 2-10 hours
      const preparedDate = new Date(createdDate.getTime() - Math.random() * 2 * 60 * 60 * 1000); // 0-2 hours before
      
      const quantity = Math.floor(Math.random() * 100) + 10; // 10-110 meals
      
      // 80% of donations will be claimed, 20% still available
      const status = Math.random() > 0.2 ? 'requested' : 'available';
      
      const foodDoc = await addDoc(collection(db, 'food_items'), {
        foodName: food.name,
        name: food.name, // legacy
        foodType: food.type,
        preparationType: food.prep,
        quantity: quantity,
        quantityUnit: 'meals',
        location: `${donor}, ${city}`,
        latitude: coords.lat + (Math.random() - 0.5) * 0.1, // Add slight variation
        longitude: coords.lng + (Math.random() - 0.5) * 0.1,
        donorId: donorId,
        donorName: donor,
        status: status,
        claimed: status !== 'available',
        verified: Math.random() > 0.3, // 70% verified
        createdAt: createdDate,
        preparedTime: preparedDate,
        expiryTime: expiryDate,
        expiry: expiryDate.toISOString(),
      });
      
      foodIds.push(foodDoc.id);
    }
    console.log(`✅ Created ${foodIds.length} food donations`);

    // 4. Create claims (80 claims for 80 requested foods)
    console.log('Creating claims...');
    const claimedFoodIds = foodIds.slice(0, 80); // First 80 are claimed
    let claimCount = 0;
    
    for (const foodId of claimedFoodIds) {
      const ngoId = ngoIds[Math.floor(Math.random() * ngoIds.length)];
      const ngoName = NGO_NAMES[Math.floor(Math.random() * NGO_NAMES.length)];
      const requestedDate = randomDate(25);
      
      // 75% fulfilled, 25% approved
      const isFulfilled = Math.random() > 0.25;
      const status = isFulfilled ? 'fulfilled' : 'approved';
      
      const claimData: any = {
        foodItemId: foodId,
        recipientId: ngoId,
        recipientName: ngoName,
        quantity: Math.floor(Math.random() * 100) + 10,
        foodName: FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)].name,
        status: status,
        requestedAt: requestedDate,
        createdAt: requestedDate,
      };
      
      if (status === 'approved') {
        claimData.approvedAt = new Date(requestedDate.getTime() + 30 * 60 * 1000); // 30 mins later
      }
      
      if (status === 'fulfilled') {
        claimData.approvedAt = new Date(requestedDate.getTime() + 30 * 60 * 1000);
        claimData.deliveredAt = new Date(requestedDate.getTime() + 3 * 60 * 60 * 1000); // 3 hours later
      }
      
      await addDoc(collection(db, 'claims'), claimData);
      claimCount++;
    }
    console.log(`✅ Created ${claimCount} claims`);

    // 5. Create some reward accounts
    console.log('Creating reward accounts...');
    for (let i = 0; i < 10; i++) {
      const donorId = donorIds[i];
      const points = Math.floor(Math.random() * 500) + 50; // 50-550 points
      
      let tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' = 'Bronze';
      if (points >= 2000) tier = 'Platinum';
      else if (points >= 500) tier = 'Gold';
      else if (points >= 100) tier = 'Silver';
      
      await setDoc(doc(db, 'reward_accounts', donorId), {
        userId: donorId,
        points: points,
        tier: tier,
        badges: ['First Steps', ...(points > 100 ? ['Centurion'] : [])],
        lastUpdated: ts(),
        history: [],
      });
    }
    console.log('✅ Created reward accounts');

    // 6. Create some micro-donations
    console.log('Creating micro-donations...');
    for (let i = 0; i < 30; i++) {
      const amount = [5, 10, 20, 50, 100][Math.floor(Math.random() * 5)];
      
      await addDoc(collection(db, 'micro_donations'), {
        donorName: `Donor ${i + 1}`,
        amount: amount,
        currency: 'INR',
        purpose: 'logistics',
        paymentId: `pay_${Date.now()}_${i}`,
        paymentMethod: 'upi',
        status: 'completed',
        timestamp: randomDate(15),
      });
    }
    console.log('✅ Created micro-donations');

    console.log('');
    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('Summary:');
    console.log(`  - 20 Donors created`);
    console.log(`  - 10 NGOs created`);
    console.log(`  - 100 Food donations created`);
    console.log(`  - 80 Claims created (60 fulfilled)`);
    console.log(`  - 10 Reward accounts created`);
    console.log(`  - 30 Micro-donations created`);
    console.log('');
    console.log('📊 Expected Impact Dashboard metrics:');
    console.log(`  - ~4,000+ Meals Saved`);
    console.log(`  - ~10,000+ kg CO₂ Prevented`);
    console.log(`  - ~1,200+ kg Food Waste Diverted`);
    console.log(`  - 20 Active Donors`);
    console.log(`  - 10 Partner NGOs`);
    console.log(`  - 100 Total Donations`);
    console.log('');
    console.log('✅ Refresh your Impact Dashboard to see the data!');

    return {
      success: true,
      donors: donorIds.length,
      ngos: ngoIds.length,
      donations: foodIds.length,
      claims: claimCount,
    };
  } catch (error) {
    console.error('❌ Failed to seed database:', error);
    throw error;
  }
}

// Helper function to clear all seeded data (use with caution!)
export async function clearSeededData() {
  console.log('⚠️ This function is not implemented for safety.');
  console.log('Please manually delete documents from Firebase Console if needed.');
}






